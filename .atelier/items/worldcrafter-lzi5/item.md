---
schema: atelier.item
schema_version: 3
id: worldcrafter-lzi5
title: Synthesized tool-call ids repeat across turns
status: open
mission: null
labels:
- llm
priority: medium
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-23T04:13:24.514466267Z
---

## Goal

Taken from deferred finding worldcrafter-erje/1-9v3l.2, in .atelier/items/worldcrafter-erje/reviews/1-9v3l.md:

> Finding 2: Synthesized tool-call ids restart at `call_0` on every response
> Recommendation: defer
> When a provider omits `id`, `ToolCallAssembly.result` (`parse.ts:184`) writes `call_${i}` from the slot index of that response. Two turns that both omit ids both produce `call_0`. `checkRequest` only matches results against the preceding assistant turn, so `send` still accepts the history, but a backend that matches `tool_call_id` globally in the chat template can bind the second result to the first call. OpenAI, OpenRouter and llama.cpp normally send ids; this is the fallback path. A per-client counter or a unique suffix would keep the fallback unique across the conversation.

Also covers finding 1 of the same review (worldcrafter-erje/1-9v3l.1): `checkRequest` accepts `tools: []`, which OpenAI answers with a 400. `buildRequest` never produces it, so only a request edited by hand reaches it.

## Done when

- [ ] A tool-call id that `ToolCallAssembly` makes up because the provider omitted it is unique across every response of one client or conversation, with a test of two turns that both omit ids.
- [ ] `checkRequest` refuses `tools: []`, with a test.
- [ ] `cd app && bun run check` passes.

## Scope

In: `app/src/llm/parse.ts`, `app/src/llm/client.ts` and their tests.
Out: capturing reasoning fields.
