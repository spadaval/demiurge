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
updated_at: "2026-10-30T16:14:11.857571360+00:00"
---

## Goal

Prose hangs off the structure: a passage is the run of blocks anchored to a beat, and passages can be reordered within a scene with their prose moving along (`arrangement`).

## Done when

Follows "Passage anchors" in `docs/rebuild/data-model-boundaries.md` (spike worldcrafter-4vxp).

- **Record and pure functions.** `app/src/story/` defines the passage anchor map (`{ [blockId]: beatId | null }`, where `null` is the scene) and a parser that checks the stored record back into it, rejecting malformed records with typed errors. It has two pure functions, with unit tests:
  - The target block order for a beat order. Blocks without a current beat ride with the block before them, and leading ones stay at the top of the scene.
  - `passageProblems`, which reports anchored blocks out of beat order (blocks without a current beat are ignored; a split passage is out of order) and anchors to beats the scene no longer has.
- **Editor plugin.** A plugin in every document editor keeps the live anchor map. It assigns an anchor only to a top-level block whose ID is not in the map:
  - A split's new half takes the other half's anchor, by inspecting both halves after `apply`.
  - Blocks new after `insertData` take the anchor of the block at the start of the selection, read before the paste runs. The other rules stand down during `insertData`.
  - An `insert_node` at the index of the `remove_node` just before it takes the removed block's anchor (regenerating a segment).
  - Blocks lifted out of a container take the container's anchor (accepting an AI segment).
  - Any other top-level insert takes the anchor of the block before it (after it, if first).
  - No hook on top-level moves: the reorder's moves leave anchors alone.
- **Session.** The document session loads the record `passage-anchors:<documentId>` with its document. It prunes anchors of blocks not in the document only on open, and writes the record in the same atomic batch as the content whenever the map has changed. A scene without a record writes none until the first anchor command, which records every current top-level block, `null` unless anchored.
- **Anchor command.** `DocumentSession.anchorBlocks(blockIds, beatId | null)` applies to all the blocks or none. It fails with a typed error, changing nothing, for: a read-only session; a document that isn't a scene in the outline; a beat that isn't in this scene (unknown, or another scene's); a block not in the document; a block not at the top level (inside a segment). Editor undo doesn't revert it.
- **Reorder command.** `DocumentSession.reorderBeats(order)` is the only way beats are reordered. It runs these steps in order:
  1. It fails with a typed error, changing nothing, in a read-only session, for a document that isn't a scene, or for an order that isn't a permutation of the scene's beats.
  2. It saves `beats`; if that fails, it returns the error with the prose unchanged and no undo step.
  3. It computes the target from the live document and applies `moveNodes` in one `withNewBatch`, keeping block IDs and anchors.
  4. If anything moved, it tags that batch with the beat order before and after, as a property, and calls `setSplittingOnce(true)`. It never tags when nothing moved.
  5. It flushes the document.

  Undo and redo of a tagged step also save the tagged order, unless beats were added or removed since. The reorder never runs outside history. Running it with the current order repairs an order problem.
- **Wiring.** `SessionOptions` gains a narrow port (load a scene's beat IDs, or `null` if it isn't a scene; save a beat order), built in `app/src/workspace/workspace.ts`. `saveBeatOrder` lives in `app/src/story/beat-order.ts`, is not in the `StoryCommand` union, runs on the story store's command queue, and is imported only by `workspace.ts`, enforced by a biome `noRestrictedImports` rule with an override for that file. The workspace exposes both commands with a lease, as its other commands do, so they work on a scene that isn't open in a tab. `createDocumentEditor` gains the callback that reports a restored order.
- **Headless tests**, using the real document plugins, with each step in its own `withNewBatch`:
  - Enter at the start, middle and end of a passage's first and last blocks, and at the end of a heading.
  - Pasting at the start of a passage, mid-block, into an empty block, and over forward and backward selections across two passages, both a Slate fragment copied from another passage and HTML.
  - Cut and paste across passages, and a text drag (select the drop point, delete the dragged range, `insertData`): the prose takes the beat where it lands.
  - Delete the first block of a passage, then undo: it keeps its beat.
  - Backspace across two passages, then undo: the lower block keeps its beat.
  - A paste at the start of a passage, then undo and redo: the pasted blocks keep that passage's beat.
  - A block recorded as `null` (the scene), deleted, then restored by undo after another edit: it stays `null`.
  - Accepting an AI segment that opens a passage.
  - Regenerating a segment that opens a passage, then undo and redo: it keeps its beat.
  - Reorder, then undo, redo and undo: prose and `beats` agree at each step.
  - A reorder with nothing to move: no undo step, and the writer's previous step isn't tagged.
  - A reorder during a live generation: text keeps streaming into the moved segment, and undo works.
  - A reorder that moves a leading block without a current beat: it stays at the top.
  - The anchor command leaving a scene out of order, and delete, anchor, undo: reported, and repaired by reordering with the current order.
  - Read-only: both commands return the typed error, the editor is unchanged, and nothing is written.
  - A failing `beats` save: the error is returned, the prose is unchanged, and there is no undo step.
  - A failing content save after `beats` saved: retried. A reload before it succeeds reports the order, and reordering repairs it.
  - Each anchor command error.
  - Save and reload, keeping every anchor.
  - A seeded random-edit test (pattern: `app/src/editor/ai-segment.random.test.ts`) over Enter, typing, Backspace, range delete, paste, text drag, generating, regenerating, accepting, undo and redo: `passageProblems` stays empty and every top-level block stays in the map.
- `bun run check` passes.

## Scope

`app/src/story/`, one plugin in `app/src/editor/`, `app/src/workspace/document-session.ts`, `app/src/workspace/workspace.ts`, and the biome rule. Update the doc comment on `AnnotationRecord` in `app/src/storage/types.ts`, which says `id` is the block ID or AI segment ID, to include this record. Anchors live in one annotation record per scene document, written only by that document's session. They never go on content blocks, and the content schema doesn't change. Each top-level block has exactly one anchor. Prose moved into another passage takes the beat where it lands, through the paste rule; no block drag handle is built here. No UI. Staleness and drafting belong to `anchored-prose`, not here.

## Context

Spike worldcrafter-4vxp; the design and its evidence are in `docs/rebuild/data-model-boundaries.md`, "Passage anchors". Stable block IDs (S2): `app/src/editor/block-id-plugin.ts`. Scene structure: worldcrafter-8tbh, whose shape this doesn't change. Removing a beat (worldcrafter-cly1) leaves anchors alone, so they dangle by design and `passageProblems` reports them. Sidecar writes batched with content: `saveWith` in the document session. Regenerating: `startGeneration` in `app/src/editor/ai-segment.ts`.

## Notes

- 2026-10-30 [note] Deferred from review of spike worldcrafter-4vxp: snapshot restore isn't built, but when it is, a restored document brings back blocks whose anchors were pruned on open. They are then treated as new and fall back by position, so whoever builds restore must restore or rebuild the passage_anchors record with the content.
