---
schema: atelier.review
schema_version: 3
round: 1
commit: e91506b38d674db536e6d3c29143609d66ebf44d
reviewers:
- 01a2068e-aad0-7062-b47e-953a75f7cd24
model: grok-4.6
verdict: approve
created_at: 2026-11-23T03:59:07.974515559Z
---

## Summary

- Complexity: high. A new subsystem (`app/src/agent/`) with its own session state, plus a storage collection, an IndexedDB version bump, and a world-file version bump that other code has to keep.
- Value: high. The mission's app-owned loop is this item: the UI (`worldcrafter-mtkn`) and Worker (`worldcrafter-ji5d`) have nothing to drive without it.
- Risk of merging it: medium. A wrong turn can edit the bible, and the schema bumps are one-way, but nothing in the UI calls the runner yet and a bad session is in the log. Crash between a story write and the step that records it can run that call again; that is documented.

The value warrants the change. The three commits match the split in the Report (collection, mutation diffs, runner). A smaller runner without persistence or replay would not meet the Done when lines.

Reviewed `git diff master...e91506b38d674db536e6d3c29143609d66ebf44d` against every Done when line and the Report. Read `runner.ts`, `context.ts`, `records.ts`, `replay.ts`, `profiles.ts`, `prompt.ts`, `stub-llm.ts`, the four test files, `docs/rebuild/story-agent.md`, and the storage/story diffs (`types.ts`, `memory.ts`, `indexeddb.ts`, `world-file.ts`, `contract.ts`, `connected-storage.ts`, `store.ts`, `tools.ts`). Walked `createAgentRunner` for start/send/resume, `exclusive`, pause/cancel/step-limit/approval/model_error, tool access, call-id renaming, `{}` substitution, context packets per scope, `replayModel`/`sameRequest`, `saveSession` batching, IndexedDB `step(3)`, and world-file v1 (`parseWorldFile` fills empty `agentRecords`; `importWorld` uses that parser). Checked erje's deferred gaps: duplicate `call_0` is renamed (`call_0~2`), and invalid arguments are echoed as `{}` while the call still runs on the raw text.

`cd app && bun run check` passed here: `tsc --noEmit` clean, biome clean, 1395 pass / 0 fail / 64 files. `bun test src/agent` was 32 pass (15 runner, 8 context, 4 prompt, 5 scenario). The Report's `context.test.ts (9)` is off by one.

Could not check live OpenRouter, featherless, or llama.cpp `--jinja`; IndexedDB in a real browser (tests use `fake-indexeddb`); or a crash injected between `executeStoryCommand` and `saveSession`.

## Finding 1: A story edit and the step that records it are two writes
Recommendation: defer
`executeStoryToolCall` saves the bible inside `executeStoryCommand` (`tools.ts:1171`), then the runner appends the tool result and calls `saveSession` (`runner.ts:630-645`). Those are separate `storage.batch` calls. If the process stops between them, `session.next` is still `tools`, the call is still unanswered, and `resume` runs it again. `story-agent.md:31` and the Report say this; `story-agent.md:23` still says a crash resumes where the session was. Adds of an existing id refuse the retry; `moveScene` to the same index is idempotent. A later item can put the story writes and the agent records in one batch.

## Finding 2: "Busy" is per runner object, not per stored session
Recommendation: defer
`exclusive` (`runner.ts:286-301`) keeps a `Set` on that `createAgentRunner` instance. Two runners on the same adapter can `send` the same session at once, both load, both run tools, and last write wins. The test (`runner.test.ts:285-294`) only covers one instance. Fine for this headless API; the UI and Worker items need one runner per world, or a lock in storage.
