/**
 * The inference proxy end to end: the LLM client's `send` reaches an
 * in-process Worker, which forwards to a stub upstream.
 */

import { describe, expect, test } from "bun:test";
import { buildRequest, send } from "../llm/client";
import { UPSTREAM_HEADER } from "../llm/proxy";
import type { BackendProfile, StreamDelta } from "../llm/types";
import type { AccessVerifier } from "./access";
import { parseUpstreams } from "./proxy";
import { inProcessWorker } from "./testing";

const OPENROUTER_KEY = "sk-or-v1-secret-value";
const HOME_ID = "home-client-id.access";
const HOME_SECRET = "home-client-secret-value";

const vars = {
  LLM_UPSTREAMS: JSON.stringify([
    {
      baseUrl: "https://openrouter.test/api/v1/",
      apiKeySecret: "OPENROUTER_API_KEY",
    },
    {
      baseUrl: "https://llama.home.test/v1",
      accessClientIdSecret: "HOME_ACCESS_ID",
      accessClientSecretSecret: "HOME_ACCESS_SECRET",
    },
  ]),
  OPENROUTER_API_KEY: OPENROUTER_KEY,
  HOME_ACCESS_ID: HOME_ID,
  HOME_ACCESS_SECRET: HOME_SECRET,
};

const router: BackendProfile = {
  name: "router",
  kind: "openrouter",
  baseUrl: "https://openrouter.test/api/v1",
  model: "some/model",
  sampler: { temperature: 0.7 },
  proxied: true,
};

const home: BackendProfile = {
  name: "home",
  kind: "llamacpp",
  baseUrl: "https://llama.home.test/v1",
  sampler: {},
  proxied: true,
};

interface Sent {
  readonly url: string;
  readonly headers: Headers;
  readonly body: unknown;
  readonly signal: AbortSignal;
}

/** A stub upstream that records what reached it and answers with `answer`. */
function stub(answer: (sent: Sent) => Response | Promise<Response>) {
  const sent: Sent[] = [];
  return {
    sent,
    fetchUpstream: async (request: Request) => {
      const record: Sent = {
        url: request.url,
        headers: request.headers,
        body: await request.json(),
        signal: request.signal,
      };
      sent.push(record);
      return answer(record);
    },
  };
}

const sse = (events: readonly unknown[]) =>
  new Response(
    events
      .map((e) => `data: ${typeof e === "string" ? e : JSON.stringify(e)}\n\n`)
      .join(""),
    { headers: { "content-type": "text/event-stream" } },
  );

const chunk = (delta: object, finish: string | null = null) => ({
  model: "some/model",
  choices: [{ index: 0, delta, finish_reason: finish }],
});

const tools = [
  {
    type: "function" as const,
    function: {
      name: "show",
      parameters: { type: "object", properties: { id: { type: "string" } } },
    },
  },
];

describe("inference proxy", () => {
  test("forwards a chat request with tools and returns the tool calls", async () => {
    const upstream = stub(() =>
      Response.json({
        model: "some/model",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "call-1",
                  type: "function",
                  function: { name: "show", arguments: '{"id":"mara"}' },
                },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
      }),
    );
    const worker = inProcessWorker(undefined, { vars, ...upstream });
    const request = buildRequest(
      router,
      {
        kind: "chat",
        messages: [{ role: "user", content: "Who is Mara?" }],
        tools,
        toolChoice: "auto",
      },
      { stream: false },
    );
    // The stored request names the real server, not the proxy.
    expect(request.url).toBe("https://openrouter.test/api/v1/chat/completions");

    const completion = (
      await send(router, request, { fetch: worker.fetch })
    )._unsafeUnwrap();
    expect(completion.toolCalls).toEqual([
      {
        id: "call-1",
        type: "function",
        function: { name: "show", arguments: '{"id":"mara"}' },
      },
    ]);
    const [sent] = upstream.sent;
    expect(sent?.url).toBe("https://openrouter.test/api/v1/chat/completions");
    expect(sent?.body).toEqual(request.body);
    expect(sent?.headers.get("authorization")).toBe(`Bearer ${OPENROUTER_KEY}`);
    expect(sent?.headers.get("x-title")).toBe("Demiurge");
  });

  test("streams chat deltas and tool-call pieces as they arrive", async () => {
    const upstream = stub(() =>
      sse([
        chunk({ content: "Let me " }),
        chunk({ content: "look." }),
        chunk({
          tool_calls: [
            {
              index: 0,
              id: "call-1",
              type: "function",
              function: { name: "show", arguments: '{"id"' },
            },
          ],
        }),
        chunk({ tool_calls: [{ index: 0, function: { arguments: ':"x"}' } }] }),
        chunk({}, "tool_calls"),
        "[DONE]",
      ]),
    );
    const worker = inProcessWorker(undefined, { vars, ...upstream });
    const deltas: StreamDelta[] = [];
    const completion = (
      await send(
        router,
        buildRequest(
          router,
          {
            kind: "chat",
            messages: [{ role: "user", content: "Look" }],
            tools,
          },
          { stream: true },
        ),
        { fetch: worker.fetch, onDelta: (d) => deltas.push(d) },
      )
    )._unsafeUnwrap();
    expect(deltas.map((d) => d.text).join("")).toBe("Let me look.");
    expect(completion.text).toBe("Let me look.");
    expect(completion.toolCalls[0]?.function.arguments).toBe('{"id":"x"}');
    expect(upstream.sent[0]?.body).toMatchObject({ stream: true });
  });

  test("passes custom sampler parameters and logprobs through to a completion", async () => {
    const upstream = stub(() =>
      Response.json({
        choices: [
          {
            index: 0,
            text: "Rain",
            finish_reason: "length",
            logprobs: {
              content: [
                {
                  token: "Rain",
                  logprob: -0.5,
                  top_logprobs: [{ token: "Rain", logprob: -0.5 }],
                },
              ],
            },
          },
        ],
      }),
    );
    const worker = inProcessWorker(undefined, { vars, ...upstream });
    const sampler = {
      xtc_probability: 0.5,
      xtc_threshold: 0.1,
      dry_multiplier: 0.8,
      dry_base: 1.75,
      dry_allowed_length: 2,
      dry_sequence_breakers: ["\n", ":"],
      n_probs: 5,
      logprobs: true,
      samplers: ["dry", "xtc", "min_p"],
    };
    const request = buildRequest(
      home,
      { kind: "completion", prompt: "The night was" },
      { stream: false, sampler },
    );
    const completion = (
      await send(home, request, { fetch: worker.fetch })
    )._unsafeUnwrap();
    expect(completion.text).toBe("Rain");
    expect(completion.logprobs?.[0]?.token).toBe("Rain");
    const [sent] = upstream.sent;
    expect(sent?.url).toBe("https://llama.home.test/v1/completions");
    expect(sent?.body).toEqual({
      ...sampler,
      prompt: "The night was",
      stream: false,
    });
    // A home server behind Access gets the Worker's service token.
    expect(sent?.headers.get("cf-access-client-id")).toBe(HOME_ID);
    expect(sent?.headers.get("cf-access-client-secret")).toBe(HOME_SECRET);
    expect(sent?.headers.get("authorization")).toBeNull();
  });

  test("refuses callers Access did not let through, and forwards nothing", async () => {
    const upstream = stub(() => Response.json({}));
    const deny: AccessVerifier = async () => ({
      ok: false,
      reason: "no Access token",
    });
    const request = buildRequest(
      router,
      { kind: "chat", messages: [{ role: "user", content: "Hi" }] },
      { stream: false },
    );
    const denied = await send(router, request, {
      fetch: inProcessWorker(deny, { vars, ...upstream }).fetch,
    });
    expect(denied._unsafeUnwrapErr()).toMatchObject({
      kind: "http",
      status: 403,
    });
    expect(denied._unsafeUnwrapErr().message).toContain("no Access token");
    const unconfigured = await send(router, request, {
      fetch: inProcessWorker(null, { vars, ...upstream }).fetch,
    });
    expect(unconfigured._unsafeUnwrapErr()).toMatchObject({ status: 503 });
    expect(upstream.sent).toHaveLength(0);
  });

  test("forwards only to listed upstreams", async () => {
    const upstream = stub(() => Response.json({}));
    const worker = inProcessWorker(undefined, { vars, ...upstream });
    const elsewhere: BackendProfile = {
      ...router,
      baseUrl: "https://attacker.test/v1",
    };
    const result = await send(
      elsewhere,
      buildRequest(
        elsewhere,
        { kind: "chat", messages: [{ role: "user", content: "Hi" }] },
        { stream: false },
      ),
      { fetch: worker.fetch },
    );
    expect(result._unsafeUnwrapErr()).toMatchObject({ status: 403 });
    expect(result._unsafeUnwrapErr().message).toContain(
      "does not forward to https://attacker.test/v1",
    );
    const raw = (path: string, init: RequestInit) =>
      worker.fetch(`/api/llm/${path}`, init);
    expect((await raw("models", { method: "POST" })).status).toBe(404);
    expect((await raw("completions", { method: "GET" })).status).toBe(405);
    expect(
      (await raw("completions", { method: "POST", body: "{}" })).status,
    ).toBe(400);
    expect(upstream.sent).toHaveLength(0);
  });

  test("keeps the browser's credentials from the upstream and the key out of responses", async () => {
    const upstream = stub(
      () =>
        new Response(
          JSON.stringify({ error: { message: `bad key ${OPENROUTER_KEY}` } }),
          {
            status: 401,
            headers: {
              "content-type": "application/json",
              "set-cookie": "upstream=1",
            },
          },
        ),
    );
    const worker = inProcessWorker(undefined, { vars, ...upstream });
    const response = await worker.fetch("/api/llm/chat/completions", {
      method: "POST",
      headers: {
        [UPSTREAM_HEADER]: "https://openrouter.test/api/v1",
        authorization: "Bearer sk-from-the-browser",
        cookie: "CF_Authorization=access-cookie",
        "cf-access-jwt-assertion": "access-jwt",
      },
      body: JSON.stringify({ messages: [] }),
    });
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
    const text = await response.text();
    expect(text).not.toContain(OPENROUTER_KEY);
    expect(text).toContain("[redacted]");
    const headers = upstream.sent[0]?.headers;
    expect(headers?.get("authorization")).toBe(`Bearer ${OPENROUTER_KEY}`);
    expect(headers?.get("cookie")).toBeNull();
    expect(headers?.get("cf-access-jwt-assertion")).toBeNull();
    expect(headers?.get(UPSTREAM_HEADER)).toBeNull();

    // A proxied profile never sends its own key, even one left over.
    const leftover = { ...router, apiKey: "sk-left-over" };
    const sent: Headers[] = [];
    await send(
      leftover,
      buildRequest(
        leftover,
        { kind: "chat", messages: [{ role: "user", content: "Hi" }] },
        { stream: false },
      ),
      {
        fetch: async (url, init) => {
          sent.push(new Headers(init.headers));
          return worker.fetch(url, init);
        },
      },
    );
    expect(sent[0]?.get("authorization")).toBeNull();
    expect(sent[0]?.get(UPSTREAM_HEADER)).toBe(
      "https://openrouter.test/api/v1",
    );
  });

  test("names a missing secret without showing any value", async () => {
    const worker = inProcessWorker(undefined, {
      vars: { ...vars, OPENROUTER_API_KEY: undefined },
    });
    const response = await worker.fetch("/api/llm/chat/completions", {
      method: "POST",
      headers: { [UPSTREAM_HEADER]: "https://openrouter.test/api/v1" },
      body: "{}",
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "the Worker secret OPENROUTER_API_KEY is not set",
    });
  });

  test("refuses to follow an upstream redirect", async () => {
    const upstream = stub(
      () =>
        new Response(null, {
          status: 307,
          headers: { location: "https://elsewhere.test/v1/chat/completions" },
        }),
    );
    const worker = inProcessWorker(undefined, { vars, ...upstream });
    const response = await worker.fetch("/api/llm/chat/completions", {
      method: "POST",
      headers: { [UPSTREAM_HEADER]: "https://openrouter.test/api/v1" },
      body: "{}",
    });
    expect(response.status).toBe(502);
  });

  test("a cancelled stream cancels the upstream generation", async () => {
    let cancelled = false;
    const encoder = new TextEncoder();
    const upstream = stub(
      () =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify(chunk({ content: "Once" }))}\n\n`,
                ),
              );
              // Then nothing more: the model is still generating.
            },
            cancel() {
              cancelled = true;
            },
          }),
          { headers: { "content-type": "text/event-stream" } },
        ),
    );
    const worker = inProcessWorker(undefined, { vars, ...upstream });
    const abort = new AbortController();
    const result = await send(
      router,
      buildRequest(
        router,
        { kind: "chat", messages: [{ role: "user", content: "Go" }] },
        { stream: true },
      ),
      {
        fetch: worker.fetch,
        signal: abort.signal,
        onDelta: () => abort.abort(),
      },
    );
    expect(result._unsafeUnwrapErr().kind).toBe("aborted");
    expect(cancelled).toBe(true);
  });

  test("a client that aborts before the answer aborts the upstream request", async () => {
    let upstreamSignal: AbortSignal | null = null;
    const abort = new AbortController();
    const worker = inProcessWorker(undefined, {
      vars,
      fetchUpstream: (request) => {
        upstreamSignal = request.signal;
        abort.abort();
        // The upstream fetch rejects once its signal aborts.
        return new Promise((_, reject) => {
          const fail = () => reject(new DOMException("aborted", "AbortError"));
          if (request.signal.aborted) fail();
          request.signal.addEventListener("abort", fail);
        });
      },
    });
    const result = await send(
      router,
      buildRequest(
        router,
        { kind: "chat", messages: [{ role: "user", content: "Go" }] },
        { stream: false },
      ),
      { fetch: worker.fetch, signal: abort.signal },
    );
    expect(result._unsafeUnwrapErr().kind).toBe("aborted");
    expect((upstreamSignal as AbortSignal | null)?.aborted).toBe(true);
  });
});

describe("LLM_UPSTREAMS", () => {
  test("is read from JSON text or a list, and checked", () => {
    expect(parseUpstreams(undefined)).toEqual({ ok: true, upstreams: [] });
    expect(parseUpstreams([])).toEqual({ ok: true, upstreams: [] });
    expect(
      parseUpstreams([{ baseUrl: "https://a.test/v1/", apiKeySecret: "K" }]),
    ).toEqual({
      ok: true,
      upstreams: [{ baseUrl: "https://a.test/v1", apiKeySecret: "K" }],
    });
    const reason = (value: unknown) => {
      const parsed = parseUpstreams(value);
      return parsed.ok ? null : parsed.reason;
    };
    expect(reason("{")).toBe("LLM_UPSTREAMS: not JSON");
    expect(reason({})).toContain("a list");
    expect(reason([{ baseUrl: "http://a.test/v1" }])).toContain("https");
    expect(reason([{ baseUrl: "https://a.test", apiKeySecret: 1 }])).toContain(
      "name a secret",
    );
    expect(
      reason([{ baseUrl: "https://a.test", accessClientIdSecret: "I" }]),
    ).toContain("or neither");
  });
});
