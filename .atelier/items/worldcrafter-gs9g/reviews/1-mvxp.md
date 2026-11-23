---
schema: atelier.review
schema_version: 3
round: 1
commit: ff13c89de8cfc5527214270bc54317b7367b3b66
reviewers:
- thread:delegated-task:command%3Amcp%3A8de241c1-0c5c-4286-93b1-6d4282360643%3Adelegate-task%3Ae502296a-dbe4-474d-b338-92de2f7a9a9d
model: gpt-6.1-sol
verdict: changes
created_at: 2026-11-23T05:53:04.237527832Z
---

## Summary

Complexity: high. The change introduces a client/Worker routing contract, credential configuration and a streaming proxy.

Value: high. The proxy is needed to reach hosted providers and a home server from other devices without putting provider credentials in world data.

Risk of merging it: high. An upstream error can expose a Worker secret and put it in synced AI provenance, as described below.

I reviewed the complete diff at ff13c89de8cfc5527214270bc54317b7367b3b66 against master, each Done when line and the Report. I checked Access gating, upstream allowlisting, request and response headers, secret lookup, redirect refusal, cancellation, client routing, profile persistence and the settings switch. The scope is appropriate to the goal and worth building; it does not need a smaller replacement.

`cd app && bun run check` passes: type checking and lint pass, with 1599 tests passing and none failing. `bun run build` also passes. The existing proxy tests substantiate the streaming, tool-call, sampler, auth and cancellation claims within the in-process harness. I separately reproduced the redaction failure below with stub upstreams through `send` and `inProcessWorker`. The key-free request construction and routing switch are correct, but the promise that secrets never reach provenance is not satisfied.

No deployment, Cloudflare resource creation or paid provider calls were made. Live Access/Tunnel operation and client disconnects in deployed Workers were not tested. An additional local Miniflare probe did not reach the Worker because its dispatch attempted to resolve the synthetic app hostname; it provides no runtime evidence. Cloudflare's [compatibility flag documentation](https://developers.cloudflare.com/workers/configuration/compatibility-flags/) supports the configured `enable_request_signal` flag and explicit signal forwarding.

## Finding 1: Redact secrets in HTTP 200 error responses before they reach provenance
Recommendation: fix now

In `app/src/worker/proxy.ts:214-225`, redaction runs only when `response.ok` is false. Every HTTP 200 body is forwarded unchanged, including JSON errors and SSE error events. HTTP status does not identify all inference errors: [OpenRouter's error guide](https://github.com/OpenRouterTeam/docs/blob/main/api_reference/errors-and-debugging.mdx) documents both JSON errors and mid-stream SSE errors inside HTTP 200 responses.

I reproduced this with a configured Worker secret `API_KEY = "sk-review-stub-key"` and a stub upstream returning HTTP 200 with `{ "error": { "message": "upstream failure: sk-review-stub-key" } }`. Calling `send` through `inProcessWorker` returns a `server` error whose message still contains the full key. The same happens with an SSE text delta followed by an SSE event containing that error. These use the same echoed-credential failure the existing HTTP 401 redaction test covers; only the response status/transport changes.

This also defeats the explicit requirement to keep secrets out of AI provenance. The LLM client's `Assembly.add` puts `error.message` into `LlmError.message` (`app/src/llm/client.ts`), and after partial text `Generator` saves that message as `Provenance.error` (`app/src/generate/generator.ts:675-706,762-771`). The existing `a failure part-way keeps the partial text with the error` test in `generate.test.ts` verifies that persistence path. Worker-only secrets can therefore enter world annotations and later sync.

Apply credential redaction before any upstream body leaves the Worker, including HTTP 200 JSON and SSE. Preserve incremental delivery and cancellation, and cover a secret split across stream chunks. Add regression coverage for HTTP 200 JSON errors and partial-output SSE errors; the latter should prove that saved provenance contains no secret. The client cannot fix this because it does not know the Worker's credentials.
