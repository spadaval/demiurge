---
created_at: "2026-10-29T22:22:47.106117320+00:00"
id: "worldcrafter-3ugg"
issue_type: "task"
labels:
- "story-model"
priority: "P2"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-cly1"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-y2y2"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T05:35:46.994670436+00:00"
status: "superseded"
title: "Weave grid: scenes against questions and drives"
updated_at: "2026-11-05T05:35:46.994670436+00:00"
---

## Goal

Show how the story's questions and drives move through its scenes, as a grid derived from the structure (`coarse-to-fine`). Threads become rows later, with `lenses`.

## Done when

- A pure function in `app/src/story/` derives the grid: columns are scenes in reading order; rows are questions, then drives grouped by actor, ordered by first appearance; a question cell holds that scene's marks (opens, progresses, answers, with notes); a drive cell shows whether the scene pressures it. Dangling references are skipped.
- Tests over a fixture story check the grid, including rows that never appear in any scene and scenes with no marks.
- `bun run check` passes.

## Scope

Derivation only, in `app/src/story/`. No UI.

## Context

Records and commands from worldcrafter-8tbh, worldcrafter-cly1 and worldcrafter-y2y2. `readingOrder` in `app/src/outline/outline.ts`.

## Close Reason

Obsolete: decision worldcrafter-03rp ended the typed-model bet after two blind comparisons favoured plain notes (worldcrafter-i2uz change, worldcrafter-iu6l drop). This was written for the typed model; what follows is mission worldcrafter-p3k7 (docs/strategies/notes-first.md). Evidence and history kept.
