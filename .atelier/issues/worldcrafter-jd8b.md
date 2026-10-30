---
created_at: "2026-10-29T22:22:47.121406726+00:00"
id: "worldcrafter-jd8b"
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
    id: "worldcrafter-4vxp"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-cly1"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Passages: anchor blocks to beats and reorder passages"
updated_at: "2026-10-30T06:25:32.331222115+00:00"
---

## Goal

Prose hangs off the structure: a passage is the run of blocks anchored to a beat, and passages can be reordered within a scene with their prose moving along (`arrangement`).

## Done when

Follows "Passage anchors" in `docs/rebuild/data-model-boundaries.md` (spike worldcrafter-4vxp).

- `app/src/story/` defines the passage anchor map (`{ [blockId]: beatId | null }`, where `null` is the scene) and a parser that checks the stored record back into it, rejecting malformed records with typed errors. It also has pure functions: the target block order for a beat order (blocks without a current beat ride with the block before them), and `passageProblems`, which reports a passage split into more than one run, runs out of beat order, and anchors to beats the scene no longer has. Unit tests cover each.
- A plugin in every document editor keeps the live anchor map and anchors each new top-level block once, when it is created: a split's new half from the block that was split; blocks new after a paste or drop from the block holding the cursor; blocks lifted out of a container (accepting an AI segment) from the container; any other top-level insert from the block before it (after it, if first). Moving a block never changes its anchor.
- The document session loads a scene's anchor record with its document. It drops anchors of blocks not in the document only on open, and writes the record in the same atomic batch as the content whenever the map has changed. A scene without a record writes none until the first anchor command. Commands through the session anchor blocks to a beat or to the scene.
- One command, through the document session, reorders a scene's beats. It moves the passages with `moveNodes` in one undo step, keeping block IDs and anchors, and saves the new `beats` order through the story store. It is the only way beats are reordered. Undo and redo of that step also restore the beat order, from a property tag on the history batch. If beats were added or removed since, they restore only the prose. The reorder never runs outside history.
- Headless editor tests, using the real document plugins, cover each of these. Each test is one `withNewBatch` step.
  - Enter at the start, middle and end of a passage's first and last blocks.
  - Enter at the end of a heading.
  - Pasting at the start of a passage, mid-block, and into an empty block, both a Slate fragment copied from another passage and HTML.
  - Cutting and pasting across passages.
  - Dragging a block into another passage: the anchor is kept and the problem reported.
  - Deleting an anchored block, then undo.
  - Accepting an AI segment that opens a passage.
  - Reorder, then undo, redo and undo.
  - A reorder that gathers a split passage.
  - Save and reload, keeping every anchor.
- `bun run check` passes.

## Scope

`app/src/story/`, one plugin in `app/src/editor/`, and the document session (`app/src/workspace/document-session.ts`). Anchors live in one annotation record per scene document (kind `passage_anchors`), written only by that document's session. They never go on content blocks, and the content schema doesn't change. Each top-level block has exactly one anchor. Nothing re-anchors a block by its position after it is created; after a drag, re-anchoring is the writer's call, through the anchor command. No UI. Staleness and drafting belong to `anchored-prose`, not here.

## Context

Spike worldcrafter-4vxp; the design and its evidence are in `docs/rebuild/data-model-boundaries.md`, "Passage anchors". Stable block IDs (S2): `app/src/editor/block-id-plugin.ts`. Scene structure: worldcrafter-8tbh, whose shape this doesn't change. Removing a beat (worldcrafter-cly1) leaves anchors alone, so they dangle by design and `passageProblems` reports them. Sidecar writes batched with content: `saveWith` in the document session.
