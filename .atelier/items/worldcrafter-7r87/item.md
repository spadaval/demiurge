---
schema: atelier.item
schema_version: 3
id: worldcrafter-7r87
title: Expose story commands as native typed LLM tools with validation and contradiction reporting
status: open
mission: worldcrafter-r7vd
labels:
- agent
- story-model
priority: high
blocked_by:
- worldcrafter-lgz8
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T22:39:00.293484786Z
---

## Goal

Extract the story read/query functions (`show`, `reader-order --before`, `span`, `touches`, `trace`, `contradictions`, `gaps`) out of the `node:fs`-coupled CLI `app/scripts/story.ts` into pure store-backed functions in `app/src/story/` (with `trace` reading scene prose via `StorageAdapter` + `prose` projection rather than `scenes/*.md` on disk), and expose all story mutations (`app/src/story/commands.ts`) and queries as a native typed LLM tool registry.

## Done when

- [ ] Read/query logic (`show`, `reader-order --before`, `span`, `touches`, `trace`, `contradictions`, `gaps`) lives in DOM-free, `node:fs`-free modules under `app/src/story/` backed by the unified store (and `app/scripts/story.ts` delegates to them without regressions in `app/scripts/story.test.ts`).
- [ ] Every story mutation and query has a typed JSON Schema definition and executor bound to `StorageAdapter`.
- [ ] Tool executions return structured results plus any kept contradictions, dropped links, and `trace` suspects so warnings are never truncated or silenced.
- [ ] Unit tests cover valid calls, typed refusals, kept contradictions, and store-backed `trace` across linked scene documents; `cd app && bun run check` passes.

## Scope

In: Extracting pure query logic from `app/scripts/story.ts` into `app/src/story/`, typed tool schemas, validation, and store-backed dispatch.
Out: LLM transport (`worldcrafter-erje`) and multi-turn runner orchestration (`worldcrafter-667u`).
