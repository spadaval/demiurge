---
schema: atelier.item
schema_version: 3
id: worldcrafter-gs9g
title: Cloudflare Worker optional inference proxy for hosted providers and home llama.cpp
status: approved
mission: worldcrafter-3z9j
labels:
- worker
- llm
priority: medium
blocked_by:
- worldcrafter-erje
- worldcrafter-ji5d
implementers:
- thread:delegated-task:command%3Amcp%3A6d73f777-f6d1-4f6c-b6f0-9f634b2c4463%3Adelegate-task%3A256a170e-d56f-4914-b577-f1ffc0c6ce68
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T23:15:42.826118382Z
---

## Goal

Add an optional inference proxy route to the Cloudflare Worker (`worldcrafter-ji5d`) so the writer can reach hosted OpenAI-compatible providers (OpenRouter, featherless) and a home `llama.cpp` server over a Cloudflare Tunnel from a phone or laptop without CORS failures or exposing provider API keys in synced world data.

## Done when

- [x] Worker proxy route (gated by Cloudflare Access) forwards streaming and non-streaming OpenAI-compatible chat, tool-calling (`worldcrafter-erje`), and completion requests including custom sampler params (XTC, DRY, logprobs) and abort/cancel.
- [x] Provider API keys live exclusively in Cloudflare Worker secrets (or per-request headers from local client profiles when unproxied) and are never written to synced world records, stored requests, or AI provenance.
- [x] Client `app/src/llm/` profile configuration can toggle direct vs. proxied routing per backend profile.
- [x] Stub-upstream integration tests cover streaming, tool calls, custom sampler passthrough, auth rejection, and key redaction; `cd app && bun run check` passes.

## Scope

In: Worker proxy route, secret/header auth contract, client profile routing option, and tests.
Out: Sync endpoints (`worldcrafter-ji5d`), live deployment, and domain cutover (`worldcrafter-v61k`).

## Report

A profile set to "Through this app's server" now reaches OpenRouter,
featherless or a home llama.cpp server via the Worker, and the browser keeps
no key for it. Nothing is deployed; `docs/rebuild/sync.md` ("Inference
proxy") has the steps for Sumeet.

- **Worker** (`app/src/worker/proxy.ts`, routed in `index.ts` behind the
  existing Access check): `POST /api/llm/chat/completions` and
  `/api/llm/completions` forward to the upstream named in
  `X-Demiurge-Upstream`, only if `LLM_UPSTREAMS` (in `wrangler.jsonc`) lists
  that https base URL. Each listed upstream names the Worker secrets for a
  bearer key and/or an Access service token (for a home server on a
  Tunnel). The body and response pass through unchanged, streamed or not;
  `request.signal` goes to the upstream fetch, with `enable_request_signal`
  added to `wrangler.jsonc` so a disconnect cancels generation.
- **Keys**: only `Accept`, `X-Title` and `HTTP-Referer` reach the upstream
  from the browser (no cookie, Access JWT or `Authorization`). Redirects are
  refused (502) so a key can't follow one, secret values are replaced in
  every response body as it streams (`redactStream`, including errors a 200
  carries), and a missing secret is reported by name only.
- **Client** (`app/src/llm/client.ts`, `llm/proxy.ts`): `BackendProfile`
  gains `proxied`. `send` then posts to the same-origin proxy path with no
  `Authorization`, even if an old key is left on the profile. The stored
  `LlmRequest` keeps the real server's URL, so provenance, `retarget` and
  `addressedTo` are unaffected by the route.
- **Settings** (`generate/profile.ts`, `app/model-settings.tsx`): a
  Directly / Through this app's server switch; proxied profiles must be
  https and are saved without a key, and the key field is disabled.

Tests: `app/src/worker/proxy.test.ts` drives `send` through an in-process
Worker to a stub upstream: non-streaming tool calls, streamed text and
tool-call deltas, XTC/DRY/n_probs/logprobs passthrough on a completion,
Access refusal and unconfigured Access (nothing forwarded), unlisted
upstream and bad routes, header stripping and key redaction, missing
secret, redirect refusal, and cancel both mid-stream (upstream stream
cancelled) and before the answer (upstream signal aborted). The in-process
transport in `worker/testing.ts` now behaves like a real `fetch` on abort.
Profile and app tests cover the switch. `cd app && bun run check`: 1601
pass, 0 fail (the act() warnings are the existing ones `worldcrafter-d93c`
tracks).

Choices worth a look: upstreams are matched by exact base URL rather than a
name, so a profile needs no extra field and can't be pointed at a server
the Worker isn't configured for; and when proxied there's no per-request
key passthrough, since the item puts keys only in Worker secrets.

### Responses

1-mvxp.1: fixed in 65a5ccc
