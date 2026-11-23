---
schema: atelier.item
schema_version: 3
id: worldcrafter-7r87
title: Expose story commands as native typed LLM tools with validation and contradiction reporting
status: in_review
mission: worldcrafter-r7vd
labels:
- agent
- story-model
priority: high
blocked_by:
- worldcrafter-lgz8
implementers:
- thread:delegated-task:command%3Amcp%3A51564328-ab55-47e2-a228-a246e1757d43%3Adelegate-task%3Aee5a005f-4923-4425-822b-0df17322b0df
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T22:39:00.293484786Z
---

## Goal

Extract the story read/query functions (`show`, `reader-order --before`, `span`, `touches`, `trace`, `contradictions`, `gaps`) out of the `node:fs`-coupled CLI `app/scripts/story.ts` into pure store-backed functions in `app/src/story/` (with `trace` reading scene prose via `StorageAdapter` + `prose` projection rather than `scenes/*.md` on disk), and expose all story mutations (`app/src/story/commands.ts`) and queries as a native typed LLM tool registry.

## Done when

- [x] Read/query logic (`show`, `reader-order --before`, `span`, `touches`, `trace`, `contradictions`, `gaps`) lives in DOM-free, `node:fs`-free modules under `app/src/story/` backed by the unified store (and `app/scripts/story.ts` delegates to them without regressions in `app/scripts/story.test.ts`).
- [x] Every story mutation and query has a typed JSON Schema definition and executor bound to `StorageAdapter`.
- [x] Tool executions return structured results plus any kept contradictions, dropped links, and `trace` suspects so warnings are never truncated or silenced.
- [x] Unit tests cover valid calls, typed refusals, kept contradictions, and store-backed `trace` across linked scene documents; `cd app && bun run check` passes.

## Scope

In: Extracting pure query logic from `app/scripts/story.ts` into `app/src/story/`, typed tool schemas, validation, and store-backed dispatch.
Out: LLM transport (`worldcrafter-erje`) and multi-turn runner orchestration (`worldcrafter-667u`).

## Report

The story's commands and read queries are now native typed tools bound to a `StorageAdapter`, and the CLI reads through the same pure query functions (commit `2373fdc`).

- **Queries extracted.** `app/src/story/queries.ts` holds `show`, `list`, `touches`, `scenes`, `reader-order` (with `--before`), `span`, `trace`, `mentions`, `gaps`, `contradictions` and `render` as pure functions of a `Story`. Each returns the CLI's lines plus the same answer as data. Where prose comes in (`show` of a scene, `trace`), the caller passes a `ProseSource`. The CLI's source reads `scenes/*.md`; `app/src/story/stored-prose.ts` builds one from the scenes' linked documents through `projectProse`, and names a prose suspect by document and block (`document doc-storm-night block b_storm2`). Refs as text (`formatRef`, `parseRef`, `KIND_NAMES`) moved to `app/src/story/refs.ts`.
- **Edit reports extracted.** What an edit reports after it (new timeline problems, added cause/count/knowledge/membership contradictions, also-removed records, dropped and crossed scene links, stale-text suspects) is `editReport` in `app/src/story/edit-report.ts`, as data, and `editReportLines` writes the CLI's lines from it. `app/scripts/story.ts` lost about 1,500 lines and now holds only the command line, file IO and the batch. `scripts/story.test.ts` and `scripts/round` pass unchanged; `round.ts` imports `KIND_NAMES` and `LIST_KINDS` from `src/` now.
- **Tool registry.** `app/src/story/tools.ts` has one tool per `StoryCommand` type (68) and one per query (11). Each has a JSON Schema built with `app/src/story/tool-schema.ts`, whose combinators produce the schema and a validator together. A compile-time check (`MatchesFields`) makes each mutation's schema parse to exactly its command's fields: I confirmed that a dropped optional field, an extra field, a wrong type, and a wrongly typed `convert` output each fail `tsc`. Refs are text in the schema (`drive:shut`). As in the CLI, `setPosition` takes dates, `constrain` takes spans (`2w`), and `moveScene` and `removeDriveTurn` count from 1.
- **Execution.** `executeStoryTool(storage, name, args, now)` and `executeStoryToolCall(storage, call, now)` resolve to a `StoryToolResult` for anything the model can fix: `unknown_tool`, `invalid_arguments` with every issue and its path (`about[1]`), or `refused` with the command's `StoryError` kind as `code`. Only a storage failure or a stored bible that doesn't load is an `err`. A mutation result carries `warnings` (the whole `EditReport`, with every stale suspect and none cut to the CLI's three) and `proseNotRead`, which lists linked scenes whose document is missing or invalid.
- **Store.** `executeStoryCommand` now also returns `before`, the bible before the command (`StoryExecuted`), so a report can diff it in the same serialised step.
- **Tests.** `app/src/story/tools.test.ts` (29) covers registry completeness and schema shape, valid calls (refs, dates, spans, 1-based positions, queries), typed refusals with paths and no writes, kept cycles and timeline problems, dropped and crossed links, also-removed records, untruncated stale suspects in prose, store-backed `trace` across linked documents (including one linked by a tool call), unreadable prose, and the tool-call round trip. `app/src/story/tool-schema.test.ts` (6) covers the schema helpers. `cd app && bun run check` passes: 1275 tests across 59 files.

Not done, and worth knowing:
- Positions and constraints written by tools carry no `authority`, so they read as asserted, as the CLI's do. Whether AI-made timeline values should be `inferred` is a product call for the agent runner (`worldcrafter-667u`).
- `scripts/story.test.ts` "every example runs" takes about 4s against its 5s default timeout, on master and on this branch alike. It timed out twice under a host load average of 23. That fragility predates this change and should be filed beside `worldcrafter-08kf`.


Round 2: master was merged in (`fc067ab`). `worldcrafter-0pt4` had changed `toldBeforeLines` in `app/scripts/story.ts`, where it no longer lives. I ported its change (viewpoint marks as the scene opens via `sceneSpan`, with `viewpointTurns` for marks that change during the scene) into `app/src/story/queries.ts` as written, and kept master's new help text in the CLI. `cd app && bun run check` passes: 1344 tests across 60 files. Round 1's deferred findings are unchanged; the CLI timeout flake is filed as `worldcrafter-ko6g`.
