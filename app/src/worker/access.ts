/**
 * Checks that a request came through Cloudflare Access. Access signs a JWT
 * for every request it lets through and sends it in the
 * `Cf-Access-Jwt-Assertion` header; the Worker checks its RS256 signature
 * against the team's published keys, its audience (the Access application's
 * AUD tag), its issuer and its expiry. Without this, anyone who learned the
 * Worker's `*.workers.dev` URL could skip Access.
 *
 * https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
 */

export const ACCESS_JWT_HEADER = "Cf-Access-Jwt-Assertion";

export interface AccessConfig {
  /** The team domain, e.g. `example.cloudflareaccess.com`. */
  readonly teamDomain: string;
  /** The Access application's audience (AUD) tag. */
  readonly audience: string;
}

export type AccessResult =
  | { readonly ok: true; readonly subject: string }
  | { readonly ok: false; readonly reason: string };

/** Verifies a request's Access JWT. */
export type AccessVerifier = (request: Request) => Promise<AccessResult>;

/** A public key as the team's certs endpoint lists it. */
export interface AccessJwk {
  readonly kid: string;
  readonly kty: string;
  readonly n: string;
  readonly e: string;
  readonly alg?: string;
}

export interface AccessVerifierOptions extends AccessConfig {
  /** Fetches `https://<teamDomain>/cdn-cgi/access/certs`. */
  readonly fetch: (url: string) => Promise<Response>;
  readonly now: () => number;
  /** How long fetched keys are trusted before fetching again. */
  readonly keysTtlMs?: number;
}

const DEFAULT_KEYS_TTL_MS = 60 * 60 * 1000;

const deny = (reason: string): AccessResult => ({ ok: false, reason });

function base64UrlBytes(text: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function decodeJson(part: string): Record<string, unknown> | null {
  const bytes = base64UrlBytes(part);
  if (bytes === null) return null;
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function isJwk(value: unknown): value is AccessJwk {
  if (typeof value !== "object" || value === null) return false;
  const { kid, kty, n, e } = value as Record<string, unknown>;
  return (
    typeof kid === "string" &&
    kty === "RSA" &&
    typeof n === "string" &&
    typeof e === "string"
  );
}

export function createAccessVerifier(
  options: AccessVerifierOptions,
): AccessVerifier {
  const issuer = `https://${options.teamDomain}`;
  const ttl = options.keysTtlMs ?? DEFAULT_KEYS_TTL_MS;
  let keys: { fetchedAt: number; byKid: Map<string, CryptoKey> } | null = null;

  const fetchKeys = async (): Promise<Map<string, CryptoKey>> => {
    const response = await options.fetch(`${issuer}/cdn-cgi/access/certs`);
    if (!response.ok) {
      throw new Error(`Access certs answered ${response.status}`);
    }
    const body: unknown = await response.json();
    const listed =
      typeof body === "object" && body !== null && "keys" in body
        ? body.keys
        : null;
    const byKid = new Map<string, CryptoKey>();
    for (const jwk of Array.isArray(listed) ? listed.filter(isJwk) : []) {
      byKid.set(
        jwk.kid,
        await crypto.subtle.importKey(
          "jwk",
          { kty: "RSA", n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
          { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
          false,
          ["verify"],
        ),
      );
    }
    keys = { fetchedAt: options.now(), byKid };
    return byKid;
  };

  /** The key `kid` names, fetching the keys again if they are old or lack it. */
  const keyFor = async (kid: string): Promise<CryptoKey | undefined> => {
    const fresh = keys !== null && options.now() - keys.fetchedAt < ttl;
    const known = fresh ? keys?.byKid.get(kid) : undefined;
    return known ?? (await fetchKeys()).get(kid);
  };

  return async (request) => {
    const token = request.headers.get(ACCESS_JWT_HEADER);
    if (!token) return deny("no Access token");
    const parts = token.split(".");
    const [headerPart, payloadPart, signaturePart] = parts;
    if (
      parts.length !== 3 ||
      headerPart === undefined ||
      payloadPart === undefined ||
      signaturePart === undefined
    ) {
      return deny("malformed Access token");
    }
    const header = decodeJson(headerPart);
    const payload = decodeJson(payloadPart);
    const signature = base64UrlBytes(signaturePart);
    if (header === null || payload === null || signature === null) {
      return deny("malformed Access token");
    }
    if (header.alg !== "RS256" || typeof header.kid !== "string") {
      return deny("unexpected Access token algorithm");
    }
    let key: CryptoKey | undefined;
    try {
      key = await keyFor(header.kid);
    } catch (cause) {
      return deny(
        `could not fetch Access keys: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    }
    if (key === undefined) return deny("unknown Access signing key");
    const signed = new TextEncoder().encode(`${headerPart}.${payloadPart}`);
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      signature,
      signed,
    );
    if (!valid) return deny("bad Access token signature");

    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(options.audience)) {
      return deny("Access token for another application");
    }
    if (payload.iss !== issuer) return deny("Access token from another team");
    const nowSeconds = options.now() / 1000;
    if (typeof payload.exp !== "number" || payload.exp <= nowSeconds) {
      return deny("expired Access token");
    }
    if (typeof payload.nbf === "number" && payload.nbf > nowSeconds + 60) {
      return deny("Access token not valid yet");
    }
    const subject =
      typeof payload.email === "string"
        ? payload.email
        : typeof payload.sub === "string"
          ? payload.sub
          : "";
    return { ok: true, subject };
  };
}
