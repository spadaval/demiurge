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

Expose `app/src/story/commands.ts` mutations and queries (`reader-order`, `span`, `show`, `touches`, `trace`, `contradictions`, `gaps`, and all `add-`/`update-`/`set-`/`remove-` commands) as a native typed LLM tool registry so an app-owned agent calls them directly against the store instead of invoking a CLI through Bash.

## Done when

- [ ] Every story command has a typed JSON Schema definition and executor bound to the unified `StorageAdapter` store (no shell, no filesystem dependency).
- [ ] Tool executions return structured results plus any kept contradictions, dropped links, and `trace` suspects so warnings are never truncated or silenced.
- [ ] Batch / transactional execution and unit tests cover valid calls, typed refusals, kept contradictions, and `trace` output.
- [ ] `bun run check` passes in `app/`.

## Scope

In: Typed tool definitions, schema validation, and store-backed command dispatch in `app/src/story/` (or `app/src/agent/`).
Out: LLM transport (`worldcrafter-erje`) and multi-turn runner orchestration (`worldcrafter-667u`).
