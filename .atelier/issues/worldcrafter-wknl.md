---
created_at: "2026-10-18T05:27:28.178059781+00:00"
id: "worldcrafter-wknl"
issue_type: "task"
labels: []
priority: "P2"
relationships:
  blocks: []
  children: []
  attachments: []
  relates: []
schema: "atelier.issue"
schema_version: 2
status: "backlog"
title: "Writer notes: decide their representation and keep them out of model context"
updated_at: "2026-11-05T05:44:18.599436972+00:00"
---

## Goal

The workspace renders the writer's `[[ notes ]]` as apparatus, but they are literal text in the prose, so the context builder sends them to the model inside the story window. Earlier design discussion proposed Fountain-style layers (inline notes, synopses, cut text, forced speaker) as annotations or fields outside the content schema, not as prose text. Decide the representation (literal `[[ ]]` text with a projection rule, or an annotation anchored to the block), and make sure notes never reach the model as story text.

## Done when

A recorded decision; the prose projection (or the context builder) excludes writer notes, with a test; the workspace still renders them as apparatus.

## Context

Found while wiring generation (worldcrafter-2tz9, 2026-10-18). See .impeccable/surfaces/writing-workspace.md, docs/rebuild/data-model-boundaries.md (Boundary 1: content is only what the author would expect in an export), app/src/content/projections.ts, app/src/context/builder.ts.

## Notes

- 2026-10-29 [note] Moved out of the rebuild mission (worldcrafter-3otd) on 2026-10-29: it was planned for a manuscript-first app. Re-plan it under the story model (decision worldcrafter-ok5a, docs/rebuild/story-model.md) before scheduling it.
- 2026-11-05 [note] 2026-11-05: correction to the 2026-10-29 note: decision worldcrafter-03rp ended the typed story model (decision worldcrafter-ok5a is superseded) and the Structure first mission (worldcrafter-z9qs). Don't re-plan this under docs/rebuild/story-model.md. It stays in the loose backlog, unlinked from that mission, and is re-planned only if the notes-first mission (worldcrafter-p3k7) shows the product needs an app.
