---
schema: atelier.item
schema_version: 3
id: worldcrafter-667u
title: Build app-owned story agent runner with editable system prompt, deterministic scene context, and model profiles
status: building
mission: worldcrafter-r7vd
labels:
- agent
- context
priority: high
blocked_by:
- worldcrafter-7r87
- worldcrafter-erje
implementers:
- thread:delegated-task:command%3Amcp%3A51564328-ab55-47e2-a228-a246e1757d43%3Adelegate-task%3A75462b19-5424-4689-8d4b-58711f4caff4
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T22:39:00.451015354Z
---

## Goal

Build the app-owned Story Agent Runner: a DOM-free, headless-testable multi-turn agent loop over `app/src/llm/` and the story tool registry (`worldcrafter-7r87`) that gives full control over system prompt, deterministic scene/record context assembly, tool execution trace, and separate model/sampler profiles for planning/conversation vs. prose finishing.

## Done when

- [x] The runner accepts a scope (world, scene, or bible record), an editable system prompt (defaulting to craft guidance derived from `.agents/skills/story-sketch/craft.md`), a model/sampler profile, and a deterministic context packet assembled from the store (including `reader-order --before`, opening counts, viewpoint marks, and relevant records).
- [x] Every turn's assembled request, model output, tool calls, tool results, and story-record mutations are recorded in storage for inspection and replay.
- [x] Supports human-in-the-loop pause/cancel, max-step guardrails, and separate profile bindings (e.g., reasoning model for structural/talk sessions vs. finetune/local model for prose drafting).
- [x] Scenario tests against a stub OpenAI-compatible server verify a multi-turn outline/rework session and a scene-context turn end-to-end.
- [x] `bun run check` passes in `app/`.

## Scope

In: Headless agent runner, context-packet builder, session/turn persistence types, and scenario tests in `app/src/`.
Out: Browser UI (`worldcrafter-mtkn`) and Cloudflare Worker execution (`worldcrafter-ji5d`).

## Report

The app now has its own story agent runner (`app/src/agent/`): a headless multi-turn loop between a model and the story bible, where the app picks the system prompt, the context, the tools and the model for each kind of work, and logs every step in storage. The design is in `docs/rebuild/story-agent.md`. Three commits, one purpose each.

**Storage** (`d3becfe`). A new `agentRecords` collection (`{ id, sessionId, kind, data, updatedAt }`, with `listForSession` on a `bySession` index), on memory, IndexedDB (`DB_VERSION` 3; a version 2 database upgrades with its story records kept), connected storage (refused in a read-only tab), dump and restore. The world file moves to version 2; a version 1 file still imports, with no agent records. `importWorld` of a v1 file and the v2→v3 upgrade are tested. The runner's commit adds a `saveAgentRecord` batch write, so a session and its current step are saved together.

**Record changes** (`fd97aae`). `executeStoryCommand` and `saveStory` now return each story record they wrote or deleted with its data before and after, and `executeStoryToolCall` passes them on as `changes` beside the result. What the model reads is unchanged. This is how the log records each call's mutations exactly. (I didn't wrap the adapter to capture writes, because the story store's command queue is keyed by adapter identity and a wrapper would get its own queue.)

**Runner** (`36b318f`).
- *Sessions.* `createAgentRunner({ storage, bindings })` gives `start`, `send` and `resume`. A session has a role, a scope and a system prompt. `plan` offers every story tool and `prose` none by default; each role is bound to its own backend profile, sampler, tool access (`all`, `queries`, `none`) and streaming (`ProfileBindings`). Bindings are passed in at run time and a session stores only its role, so no API key reaches storage; a test checks the key appears in no request body or log. The scope is the world, a scene or a bible record, and one the bible doesn't have is refused at start.
- *System prompt.* Editable per session. The `plan` default is craft.md verbatim plus the skill's mechanics rewritten for tool names. A test fails if craft.md changes without the copy, or if the mechanics name a tool that doesn't exist. The `prose` default is drafting guidance drawn from the skill's "Writing a scene".
- *Context packet* (`context.ts`). Built afresh for each writer message from story queries, the CLI's own lines. A scene gets the scene record, `reader-order --before` it (told, held back, viewpoint marks, counts as the scene opens and as they change), each event it depicts, each person in it, and its prose so far. A world gets the premise, the scenes, the open questions and the contradictions. A record gets the record, `touches` and `scenes`. It is tested to be identical across builds and across a world-file round trip. It opens the user message rather than the system prompt, so the conversation's prefix stays cacheable.
- *Control.* `shouldPause` (checked before each model call and each tool call), `maxSteps` per run, `approveMutations` (stops before any edit; `resume` runs it, and `resume({ decline })` refuses it and tells the model why), and model errors all stop the run resumably. Aborting the signal cancels: the call in flight is dropped, calls not yet run are answered as cancelled, and the session waits for the writer. A second run of a busy session is refused. A call to a tool the session doesn't offer is refused as `unknown_tool` and never runs.
- *Log* (`records.ts`). `<id>/session` holds the conversation, each writer message with its packet, and `next`/`stopped`. `<id>/step/NNNNNN` holds the exact request, the completion or error, and each call with its result and record changes. Both are saved after every model call and every tool call, so a session resumes from storage in a fresh runner (tested). `replayModel(steps)` serves a log's responses and refuses a request that differs from the recorded one. A test replays a two-run session on a copy of the starting world and gets the same requests, calls, edits and bible; another shows a replay on a changed world stopping at step 1.
- *erje's known gaps.* Duplicate tool-call ids across steps (the made-up `call_0`) are renamed in the conversation (`call_0~2`). Arguments that aren't a JSON object are sent back as `{}` for llama.cpp's sake, while the call still runs with the model's raw text, so the model gets the `invalid_arguments` message. The step keeps the raw completion.

Scenario tests run against a Bun stub OpenAI-compatible server (`stub-llm.ts`). `scenarios.test.ts` covers a two-run outline-and-rework session, with an edit, a query and a refused call that the model then fixes, and a rework whose context sees the outline, plus its log, its replay, and a streamed prose turn on scene `arrival` whose request carries the prose profile and sampler, no tools, and the exact `reader-order --before` lines. `runner.test.ts` (15) covers the guardrails and tool access, `context.test.ts` (9) the packets and `prompt.test.ts` (4) the prompts. Writing these found one real bug: the step's logged request shared the session's message array and grew with it. Requests now take a copy.

`cd app && bun run check`: tsc and Biome clean, 1395 pass, 0 fail, across 64 files.

Not done, and worth knowing:
- The prose role's draft stays in the log and the conversation. Writing it into the scene's document is for the editor or UI (`worldcrafter-mtkn`).
- Every role uses the chat endpoint. A finetune served only as raw completions would need a prompt layout for the conversation.
- Timeline values the model writes are asserted, as the CLI's are. Whether AI-made positions should be `inferred` (raised in 7r87) remains a product call; I didn't decide it here.
- A story edit and the log entry recording it are separate writes. If the app stops between them, `resume` runs that call again. This is documented in `story-agent.md`.
- `stub-llm.ts` is a test helper that lives in `src/agent/` so both test files can share it. Nothing in the app imports it.

