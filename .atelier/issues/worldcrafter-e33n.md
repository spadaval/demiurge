---
created_at: "2026-10-29T22:23:01.928810780+00:00"
id: "worldcrafter-e33n"
issue_type: "task"
labels:
- "story-model"
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-3ugg"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-asip"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
status: "backlog"
title: "Outline, weave grid and manuscript views in the app"
updated_at: "2026-10-30T22:02:17.822026585+00:00"
---

## Goal

The writer can see the story as an outline, as a weave grid and as an assembled manuscript; anchor prose to beats; move scenes between chapters and reorder passages from those views; and see arrangement problems after a move.

## Done when

- The outline view, weave grid and manuscript view render the derived data from the sibling issues; none of them stores anything of its own.
- In a scene's document, the writer can anchor selected blocks to one of the scene's beats, or clear the anchor, through the commands from worldcrafter-jd8b.
- Moving a scene in the outline view and reordering passages in the manuscript view go through the existing commands, and arrangement problems, including seams to reread, are shown after the move.
- Component tests cover each view over a fixture story, anchoring a passage, and a move that produces a problem.
- Checked by hand in the running app, with a screenshot or short note in the handoff. To run it: in `app/`, `bun run build`, then `bunx vite preview` in the background; stop it afterwards.
- `bun run check` passes.

## Scope

`app/src/app/`. Functional styling only.

## Context

Derivations: outline view (worldcrafter-asip), weave grid (worldcrafter-3ugg), passages (worldcrafter-jd8b), manuscript and `arrangementProblems` (worldcrafter-wllv).

## Notes

- 2026-10-30 [note] 2026-10-30 from spike worldcrafter-4vxp: editor undo does not revert an anchor command, so the writer re-anchors instead; make that clear in the UI. A block's beat must be visible, so the writer can see the anchors they're setting. See 'Passage anchors' in docs/rebuild/data-model-boundaries.md.
- 2026-10-30 [note] 2026-10-30 from spike worldcrafter-4vxp: the session now exposes an anchors store, passageProblems() and a passagesChanged counter (see worldcrafter-jd8b). The UI subscribes to passagesChanged, shows the problems, and when a stored anchor record can't be parsed shows that state and offers discardAnchors(), which loses the scene's anchors, so say so before discarding.
- 2026-10-30 [note] 2026-10-30 replan: moved under worldcrafter-3nnq for the outline and weave grid. The manuscript view goes with worldcrafter-l2e5, and anchoring prose in a scene's document goes with worldcrafter-jd8b (worldcrafter-j8pr). Split it when planned.
