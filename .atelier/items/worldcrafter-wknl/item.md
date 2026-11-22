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

The workspace renders the writer's `[[ notes ]]` as apparatus, but they are literal text in the prose, so the context builder sends them to the model inside the story window. Earlier design discussion proposed Fountain-style layers (inline notes, synopses, cut text, forced speaker) as annotations or fields outside the content schema, not as prose text. Decide the representation (literal `[[ ]]` text with a projection rule, or an annotation anchored to the block), and make sure notes never reach the model as story text.

## Done when

- [ ] A recorded decision; the prose projection (or the context builder) excludes writer notes, with a test; the workspace still renders them as apparatus.

## Context

Found while wiring generation (worldcrafter-2tz9, 2026-10-18). See .impeccable/surfaces/writing-workspace.md, docs/rebuild/data-model-boundaries.md (Boundary 1: content is only what the author would expect in an export), app/src/content/projections.ts, app/src/context/builder.ts.

## Notes

- 2026-11-22 [note] Supersedes the 2026-10-29 and 2026-11-05 backlog notes (which predate `worldcrafter-jeue` and Sumeet's 2026-11-22 typed-store + app-owned agent direction); scheduled in `worldcrafter-3z9j` alongside prose finishing.
