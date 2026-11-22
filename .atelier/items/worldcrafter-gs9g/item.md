---
schema: atelier.item
schema_version: 3
id: worldcrafter-gs9g
title: Cloudflare Worker optional inference proxy for hosted providers and home llama.cpp
status: open
mission: worldcrafter-3z9j
labels:
- worker
- llm
priority: medium
blocked_by:
- worldcrafter-erje
- worldcrafter-ji5d
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T23:15:42.826118382Z
---

## Goal

Add an optional inference proxy route to the Cloudflare Worker (`worldcrafter-ji5d`) so the writer can reach hosted OpenAI-compatible providers (OpenRouter, featherless) and a home `llama.cpp` server over a Cloudflare Tunnel from a phone or laptop without CORS failures or exposing provider API keys in synced world data.

## Done when

- [ ] Worker proxy route (gated by Cloudflare Access) forwards streaming and non-streaming OpenAI-compatible chat, tool-calling (`worldcrafter-erje`), and completion requests including custom sampler params (XTC, DRY, logprobs) and abort/cancel.
- [ ] Provider API keys live exclusively in Cloudflare Worker secrets (or per-request headers from local client profiles when unproxied) and are never written to synced world records, stored requests, or AI provenance.
- [ ] Client `app/src/llm/` profile configuration can toggle direct vs. proxied routing per backend profile.
- [ ] Stub-upstream integration tests cover streaming, tool calls, custom sampler passthrough, auth rejection, and key redaction; `cd app && bun run check` passes.

## Scope

In: Worker proxy route, secret/header auth contract, client profile routing option, and tests.
Out: Sync endpoints (`worldcrafter-ji5d`), live deployment, and domain cutover (`worldcrafter-v61k`).
