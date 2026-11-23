import { beforeAll, describe, expect, test } from "bun:test";
import { ACCESS_JWT_HEADER, createAccessVerifier } from "./access";

const TEAM = "team.cloudflareaccess.com";
const AUD = "aud-tag";
const NOW = 1_800_000_000_000;

let keys: CryptoKeyPair;
let other: CryptoKeyPair;
let jwks: unknown;

const algorithm = {
  name: "RSASSA-PKCS1-v1_5",
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256",
};

beforeAll(async () => {
  keys = await crypto.subtle.generateKey(algorithm, true, ["sign", "verify"]);
  other = await crypto.subtle.generateKey(algorithm, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", keys.publicKey);
  jwks = {
    keys: [{ kid: "k1", kty: "RSA", alg: "RS256", n: jwk.n, e: jwk.e }],
  };
});

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const encode = (value: unknown) =>
  b64url(new TextEncoder().encode(JSON.stringify(value)));

async function sign(
  payload: Record<string, unknown>,
  { key = keys.privateKey, kid = "k1" } = {},
): Promise<string> {
  const head = `${encode({ alg: "RS256", kid })}.${encode(payload)}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(head),
  );
  return `${head}.${b64url(new Uint8Array(signature))}`;
}

const claims = (extra: Record<string, unknown> = {}) => ({
  aud: [AUD],
  iss: `https://${TEAM}`,
  exp: NOW / 1000 + 60,
  email: "writer@example.com",
  ...extra,
});

function verifier() {
  const fetched: string[] = [];
  const verify = createAccessVerifier({
    teamDomain: TEAM,
    audience: AUD,
    now: () => NOW,
    fetch: async (url) => {
      fetched.push(url);
      return Response.json(jwks);
    },
  });
  return { verify, fetched };
}

const request = (token?: string) =>
  new Request("https://app.test/api/sync/default/pull", {
    headers: token ? { [ACCESS_JWT_HEADER]: token } : {},
  });

describe("Access verifier", () => {
  test("accepts a token Access signed for this application", async () => {
    const { verify, fetched } = verifier();
    expect(await verify(request(await sign(claims())))).toEqual({
      ok: true,
      subject: "writer@example.com",
    });
    expect(await verify(request(await sign(claims())))).toMatchObject({
      ok: true,
    });
    expect(fetched).toEqual([`https://${TEAM}/cdn-cgi/access/certs`]);
  });

  test("refuses a request without a token", async () => {
    expect(await verifier().verify(request())).toEqual({
      ok: false,
      reason: "no Access token",
    });
  });

  test.each([
    ["another application", claims({ aud: ["other"] }), "another application"],
    [
      "another team",
      claims({ iss: "https://evil.cloudflareaccess.com" }),
      "another team",
    ],
    ["an expired token", claims({ exp: NOW / 1000 - 1 }), "expired"],
  ])("refuses %s", async (_, payload, reason) => {
    const result = await verifier().verify(request(await sign(payload)));
    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.reason).toContain(reason);
  });

  test("refuses a token signed with another key", async () => {
    const forged = await sign(claims(), { key: other.privateKey });
    expect(await verifier().verify(request(forged))).toMatchObject({
      ok: false,
      reason: "bad Access token signature",
    });
  });

  test("refuses an unknown key ID and a malformed token", async () => {
    const { verify } = verifier();
    expect(
      await verify(request(await sign(claims(), { kid: "k9" }))),
    ).toMatchObject({
      ok: false,
      reason: "unknown Access signing key",
    });
    expect(await verify(request("not.a.jwt"))).toMatchObject({ ok: false });
    expect(await verify(request("onlyonepart"))).toMatchObject({ ok: false });
  });

  test("refuses a token whose payload was changed after signing", async () => {
    const [head, , sig] = (await sign(claims())).split(".");
    const tampered = `${head}.${encode(claims({ email: "intruder@example.com" }))}.${sig}`;
    expect(await verifier().verify(request(tampered))).toMatchObject({
      ok: false,
    });
  });
});
