/**
 * The Worker's inference proxy: forwards OpenAI-compatible chat and
 * completion requests from the app to a hosted provider (OpenRouter,
 * featherless) or a home llama.cpp server behind a Cloudflare Tunnel, so a
 * phone can reach them without CORS failures and without the provider's key
 * in the browser (`llm/proxy.ts` is the client's side of the contract).
 *
 * It forwards only to the upstreams `LLM_UPSTREAMS` lists, each with the
 * names of the Worker secrets that hold its credentials, so it is not an
 * open proxy and no key travels from the browser. The request body passes
 * through unchanged, sampler parameters and tools included; the response,
 * streamed or not, passes back unchanged, and a client that disconnects
 * cancels the upstream request. Only a few headers are forwarded: never the
 * browser's own `Authorization`, cookies or Access token.
 *
 * Imports here are relative: Wrangler bundles this file on its own.
 */

import {
  LLM_PROXY_PREFIX,
  normalizeBaseUrl,
  PROXY_PATHS,
  UPSTREAM_HEADER,
} from "../llm/proxy";

/**
 * One server the proxy forwards to. The `*Secret` fields name Worker
 * secrets (`wrangler secret put <NAME>`), never the values themselves.
 */
export interface Upstream {
  /** Including the version segment, e.g. `https://openrouter.ai/api/v1`. */
  readonly baseUrl: string;
  /** Sent as `Authorization: Bearer <value>`. */
  readonly apiKeySecret?: string;
  /**
   * A Cloudflare Access service token for an upstream that is itself behind
   * Access, such as a home server on a Tunnel: sent as
   * `CF-Access-Client-Id` and `CF-Access-Client-Secret`.
   */
  readonly accessClientIdSecret?: string;
  readonly accessClientSecretSecret?: string;
}

/** Sends one request upstream; the global `fetch` in the Worker. */
export type UpstreamFetch = (request: Request) => Promise<Response>;

/** Headers from the browser that reach the upstream, as sent. */
const FORWARDED_HEADERS = ["accept", "x-title", "http-referer"];

const refuse = (status: number, error: string) =>
  Response.json({ error }, { status });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const SECRET_FIELDS = [
  "apiKeySecret",
  "accessClientIdSecret",
  "accessClientSecretSecret",
] as const;

/**
 * The upstreams `LLM_UPSTREAMS` lists (a JSON array, or its text), or why
 * it can't be read. Unset means none.
 */
export function parseUpstreams(
  value: unknown,
): { ok: true; upstreams: Upstream[] } | { ok: false; reason: string } {
  const fail = (reason: string) => ({
    ok: false as const,
    reason: `LLM_UPSTREAMS: ${reason}`,
  });
  let listed = value;
  if (value === undefined || value === null || value === "") {
    return { ok: true, upstreams: [] };
  }
  if (typeof value === "string") {
    try {
      listed = JSON.parse(value);
    } catch {
      return fail("not JSON");
    }
  }
  if (!Array.isArray(listed)) return fail("expected a list of upstreams");
  const upstreams: Upstream[] = [];
  for (const [i, entry] of listed.entries()) {
    if (!isRecord(entry) || typeof entry.baseUrl !== "string") {
      return fail(`[${i}] needs a baseUrl`);
    }
    let url: URL;
    try {
      url = new URL(entry.baseUrl);
    } catch {
      return fail(`[${i}].baseUrl is not a URL`);
    }
    // A key sent over plain HTTP could be read on the way.
    if (url.protocol !== "https:") return fail(`[${i}].baseUrl must be https`);
    const upstream: { -readonly [K in keyof Upstream]: Upstream[K] } = {
      baseUrl: normalizeBaseUrl(entry.baseUrl),
    };
    for (const field of SECRET_FIELDS) {
      const name = entry[field];
      if (name === undefined) continue;
      if (typeof name !== "string" || name === "") {
        return fail(`[${i}].${field} must name a secret`);
      }
      upstream[field] = name;
    }
    if (
      (upstream.accessClientIdSecret === undefined) !==
      (upstream.accessClientSecretSecret === undefined)
    ) {
      return fail(
        `[${i}] needs both accessClientIdSecret and accessClientSecretSecret, or neither`,
      );
    }
    upstreams.push(upstream);
  }
  return { ok: true, upstreams };
}

/**
 * The forms a secret can take in a response: as is, and as JSON writes it
 * inside a string, should it hold a character JSON escapes.
 */
const secretForms = (secrets: readonly string[]): string[] => [
  ...new Set(
    secrets.flatMap((secret) => [secret, JSON.stringify(secret).slice(1, -1)]),
  ),
];

/** Replaces every secret value in `text`, so no response can echo one. */
const redact = (text: string, secrets: readonly string[]) =>
  secrets.reduce((out, secret) => out.split(secret).join("[redacted]"), text);

/**
 * How much of the end of `text` could be the start of a secret, and so must
 * wait for the next chunk before it can be told apart.
 */
function unsettledTail(text: string, secrets: readonly string[]): number {
  let longest = 0;
  for (const secret of secrets) {
    for (let n = Math.min(secret.length - 1, text.length); n > longest; n--) {
      if (text.endsWith(secret.slice(0, n))) {
        longest = n;
        break;
      }
    }
  }
  return longest;
}

/**
 * `body` with every secret replaced, as it streams. A provider can report an
 * error inside a 200 response, as JSON or as an SSE event part-way through,
 * and the client keeps that message in the AI text's provenance, so every
 * response is redacted, not only failed ones. Text is passed on as soon as
 * it can't be the start of a secret, so streaming isn't held back; a secret
 * split across chunks is still caught. Cancelling the result cancels `body`.
 */
export function redactStream(
  body: ReadableStream<Uint8Array>,
  secrets: readonly string[],
): ReadableStream<Uint8Array> {
  const forms = secretForms(secrets);
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let held = "";
  const pass = (
    text: string,
    controller: TransformStreamDefaultController<Uint8Array>,
  ) => {
    const redacted = redact(held + text, forms);
    const keep = unsettledTail(redacted, forms);
    held = redacted.slice(redacted.length - keep);
    const ready = redacted.slice(0, redacted.length - keep);
    if (ready !== "") controller.enqueue(encoder.encode(ready));
  };
  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        pass(decoder.decode(chunk, { stream: true }), controller);
      },
      flush(controller) {
        pass(decoder.decode(), controller);
        if (held !== "") controller.enqueue(encoder.encode(held));
      },
    }),
  );
}

/**
 * Answers one `/api/llm/...` request, already let through by Access:
 * forwards it to the upstream `UPSTREAM_HEADER` names, if `LLM_UPSTREAMS`
 * lists it.
 */
export async function handleLlmProxy(
  request: Request,
  upstreamsValue: unknown,
  secret: (name: string) => unknown,
  fetchUpstream: UpstreamFetch,
): Promise<Response> {
  const path = new URL(request.url).pathname.slice(LLM_PROXY_PREFIX.length);
  if (!Object.values(PROXY_PATHS).includes(path)) {
    return refuse(404, "no such inference route");
  }
  if (request.method !== "POST") return refuse(405, "use POST");
  const parsed = parseUpstreams(upstreamsValue);
  if (!parsed.ok) return refuse(503, parsed.reason);
  const asked = request.headers.get(UPSTREAM_HEADER);
  if (asked === null || asked.trim() === "") {
    return refuse(400, `name the upstream in ${UPSTREAM_HEADER}`);
  }
  const base = normalizeBaseUrl(asked);
  const upstream = parsed.upstreams.find((u) => u.baseUrl === base);
  if (upstream === undefined) {
    return refuse(
      403,
      `the proxy does not forward to ${base}; add it to LLM_UPSTREAMS`,
    );
  }

  const values: Partial<Record<(typeof SECRET_FIELDS)[number], string>> = {};
  for (const field of SECRET_FIELDS) {
    const name = upstream[field];
    if (name === undefined) continue;
    const value = secret(name);
    if (typeof value !== "string" || value === "") {
      return refuse(503, `the Worker secret ${name} is not set`);
    }
    values[field] = value;
  }
  const secrets = Object.values(values);

  const headers = new Headers({ "content-type": "application/json" });
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  if (values.apiKeySecret !== undefined) {
    headers.set("authorization", `Bearer ${values.apiKeySecret}`);
  }
  if (
    values.accessClientIdSecret !== undefined &&
    values.accessClientSecretSecret !== undefined
  ) {
    headers.set("cf-access-client-id", values.accessClientIdSecret);
    headers.set("cf-access-client-secret", values.accessClientSecretSecret);
  }

  const target = `${upstream.baseUrl}/${path}`;
  let response: Response;
  try {
    response = await fetchUpstream(
      new Request(target, {
        method: "POST",
        headers,
        body: await request.arrayBuffer(),
        // A redirect could carry the key to another host.
        redirect: "manual",
        // The client's disconnect cancels generation upstream.
        signal: request.signal,
      }),
    );
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    return refuse(
      502,
      redact(`could not reach ${target}: ${reason}`, secretForms(secrets)),
    );
  }

  if (response.status >= 300 && response.status < 400) {
    await response.body?.cancel();
    return refuse(
      502,
      `${target} redirected (${response.status}); set the upstream's baseUrl to where it redirects`,
    );
  }
  const contentType = response.headers.get("content-type");
  const responseHeaders = new Headers({ "cache-control": "no-store" });
  if (contentType !== null) responseHeaders.set("content-type", contentType);
  // Streamed through as it arrives, redacted; cancelling it cancels the
  // upstream body.
  return new Response(
    response.body === null ? null : redactStream(response.body, secrets),
    { status: response.status, headers: responseHeaders },
  );
}
