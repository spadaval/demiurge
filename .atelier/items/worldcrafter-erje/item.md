---
schema: atelier.item
schema_version: 3
id: worldcrafter-erje
title: Extend app/src/llm with multi-turn tool-calling and provider adapters
status: approved
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

- [x] `app/src/llm/types.ts`, `client.ts`, `sse.ts`, and `parse.ts` support sending tool schemas, receiving streamed and non-streamed tool calls, and sending tool-result turns.
- [x] Existing sampler/logprob passthrough and streaming cancellation/abort behavior remain intact.
- [x] Unit and stub-server tests cover multi-turn tool calls, parallel tool calls, malformed tool arguments, and mid-stream abort.
- [x] `bun run check` passes in `app/`.

## Scope

In: `app/src/llm/` and its tests.
Out: Server-side inference proxy (`worldcrafter-ji5d`) and agent loop orchestration (`worldcrafter-667u`).

## Report

Chat requests in `app/src/llm/` can now carry tools, return the model's tool calls (streamed or whole), and send tool results back, so the agent runner (`worldcrafter-667u`) can hold a multi-turn tool conversation on any of the three backends.

**Premise.** The title asks for "provider adapters". OpenRouter, featherless and llama.cpp all speak the OpenAI tool-call wire format, so there are no separate adapter modules. The differences that do exist are all on the response side, and `ToolCallAssembly` in `parse.ts` absorbs them in one place: Gemini behind OpenRouter giving every parallel call index 0 (a new id at a known index starts a new call), calls without `index` or `id` (position stands in; the id becomes `call_<n>`), `arguments` sent as an object, and empty arguments (they become `{}`). Per-provider headers stay in `headers()` as before. A `BackendKind` per provider can be added when a real quirk needs one.

What changed:
- `types.ts`: `ToolDefinition`, `ToolChoice`, `ToolCall`, `ToolCallDelta`, `ToolArgumentsError`. `ChatMessage` is now `TextMessage | ToolCallMessage | ToolResultMessage`. The chat `LlmInput` takes `tools` and `toolChoice`. `Completion.toolCalls` and `StreamDelta.toolCalls` are new (empty when there are none).
- `client.ts`: `buildRequest` writes `tools` (omitted when empty, which OpenAI refuses) and `tool_choice`, which win over same-named sampler keys like the rest of the input. `checkRequest` now refuses what OpenAI would answer with a 400: a tool result for a call the previous assistant turn didn't make, a call answered twice, a call left unanswered before the next turn or at the end, malformed `tool_calls`, unnamed or duplicate tools, and a `tool_choice` naming a tool not offered. It also refuses tools on a completion request. `toolCallMessage(completion)` and `toolResult(id, content)` build the turns to send back. `onDelta` now also fires for deltas that carry only tool-call pieces.
- `parse.ts`: `ToolCallAssembly`, and `parseToolArguments(call)`, which returns the arguments as an object or an `invalid_arguments` error. The error's message is written to go back to the model as that call's result. Malformed arguments are the model's mistake, not the protocol's, so `send` still succeeds and the raw text is kept for the assistant turn. A protocol violation (non-list `tool_calls`, a call never named, numeric arguments) is a `malformed` error.
- `sse.ts` needed no change: tool-call deltas are ordinary `data:` events.
- Outside `llm/`, required by the type change: `generate/draft.ts` and `context/builder.ts` use `TextMessage`, since generation only writes text turns. A stored request holding tool turns opens in the context viewer as raw JSON parameters, the existing fallback for bodies it can't edit as text.

Tests: `app/src/llm/tools.test.ts` runs against a Bun stub server. It covers tools and sampler passthrough together; parallel calls, non-streamed and streamed, with pieces interleaved by index and split mid-event; the shared-index-0 case; the normalisations; tool-only deltas reaching `onDelta`; malformed protocol shapes; abort while a call is streaming (the server sees the cancel); a two-turn conversation where one call's arguments are truncated JSON and its error goes back as the tool result; `parseToolArguments`; and 16 `checkRequest` refusals. The existing sampler, logprob and abort tests in `client.test.ts` are unchanged apart from the new `toolCalls: []` field and one role case (`tool` is now valid, so the unknown-role case uses `narrator`). As a mutation check, disabling the new-id rule or the tool-result matching makes those tests fail.

`cd app && bun run check`: tsc and biome clean, 1189 pass, 0 fail. One earlier run, at load average 28, timed out four `scripts/story.test.ts` CLI tests and failed one `scripts/judging/panel.test.ts` test. Both files pass alone and in the rerun, so these are load flakes of the kind `worldcrafter-08kf` tracks, not this change.

For the agent runner:
- llama.cpp needs `--jinja` to accept `tools`. Without it the server's own error comes back as an `http` error.
- llama.cpp may refuse an assistant turn whose `arguments` aren't valid JSON when it renders its chat template. If a local model emits malformed arguments, the runner may need to substitute `{}` when echoing that call back. This module deliberately keeps them verbatim.
- Reasoning fields (`reasoning`, `reasoning_content`) are not captured.

