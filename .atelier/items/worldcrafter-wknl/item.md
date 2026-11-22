---
schema: atelier.item
schema_version: 3
id: worldcrafter-wknl
title: 'Writer notes: decide their representation and keep them out of model context'
status: open
mission: worldcrafter-3z9j
labels: []
priority: medium
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-10-18T05:27:28.178059781Z
---

## Goal

The Night Edition workspace renders inline `[[ ... ]]` writer notes in scene Plate documents as apparatus, but today they are literal prose text and leak into LLM requests through `projectProse` (`app/src/content/projections.ts`). Decide their representation (literal `[[ ... ]]` stripped by `projectProse`, or a dedicated annotation/node) and strip them inside `projectProse` so **every** downstream context builder—both `worldcrafter-667u`'s scene context packet and `worldcrafter-aq1r`'s prose Context Viewer—excludes writer notes automatically while the workspace still renders them as apparatus.

## Done when

- [ ] Representation choice is recorded (in this item's Report and `docs/rebuild/data-model-boundaries.md` if the schema changes).
- [ ] `projectProse` (`app/src/content/projections.ts`) excludes `[[ ... ]]` writer notes from scene Plate documents, verified by unit tests (including multi-word notes, multiple notes per paragraph, and unclosed brackets).
- [ ] The Night Edition workspace still renders `[[ ... ]]` notes as apparatus without breaking `DESIGN.md`'s Two Voices / Paint-Only rules.
- [ ] `cd app && bun run check` passes.

## Scope

In: Writer-note representation decision, `projectProse` exclusion in `app/src/content/projections.ts`, and workspace rendering test.
Out: Wiring story-bible context into prose generation (`worldcrafter-aq1r`, blocked on this item).

## Context

Found while wiring generation (worldcrafter-2tz9, 2026-10-18). See .impeccable/surfaces/writing-workspace.md, docs/rebuild/data-model-boundaries.md (Boundary 1: content is only what the author would expect in an export), app/src/content/projections.ts, app/src/context/builder.ts.

## Notes

- 2026-11-22 [note] Supersedes the 2026-10-29 and 2026-11-05 backlog notes (which predate `worldcrafter-jeue` and Sumeet's 2026-11-22 typed-store + app-owned agent direction); scheduled in `worldcrafter-3z9j` alongside prose finishing.
