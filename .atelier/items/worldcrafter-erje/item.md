---
schema: atelier.item
schema_version: 3
id: worldcrafter-erje
title: Extend app/src/llm with multi-turn tool-calling and provider adapters
status: building
mission: worldcrafter-r7vd
labels:
- llm
- agent
priority: high
blocked_by: []
implementers:
- thread:delegated-task:command%3Amcp%3A51564328-ab55-47e2-a228-a246e1757d43%3Adelegate-task%3Aeb1b221b-f407-4648-b09f-965a10e0dd63
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T22:39:00.370802938Z
---

## Goal

Extend `app/src/llm/` to support multi-turn tool calling (tool definitions in requests, streamed/parsed tool-call deltas, tool-result messages) while preserving full sampler, system-prompt, and logprob passthrough across OpenAI-compatible backends (OpenRouter, featherless, local `llama.cpp`).

## Done when

- [ ] `app/src/llm/types.ts`, `client.ts`, `sse.ts`, and `parse.ts` support sending tool schemas, receiving streamed and non-streamed tool calls, and sending tool-result turns.
- [ ] Existing sampler/logprob passthrough and streaming cancellation/abort behavior remain intact.
- [ ] Unit and stub-server tests cover multi-turn tool calls, parallel tool calls, malformed tool arguments, and mid-stream abort.
- [ ] `bun run check` passes in `app/`.

## Scope

In: `app/src/llm/` and its tests.
Out: Server-side inference proxy (`worldcrafter-ji5d`) and agent loop orchestration (`worldcrafter-667u`).
