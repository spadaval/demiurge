---
created_at: "2026-10-30T05:25:24.173863179+00:00"
id: "worldcrafter-4vxp"
issue_type: "spike"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-0pxn"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-10-30T16:25:00.199023433+00:00"
status: "done"
title: "Spike: passage anchoring design"
updated_at: "2026-10-30T16:25:00.199023433+00:00"
---

## Goal

Settle how prose passages anchor to beats so the anchors survive real editing, before passages are built (worldcrafter-jd8b). Splitting, pasting, dragging and undo all disturb a naive list of block IDs, and the answer shapes the scene structure record.

## Done when

- A short "Passage anchors" section in `docs/rebuild/data-model-boundaries.md` answers each question below. Each answer is backed by a headless Plate experiment whose result is recorded in the handoff: pressing Enter inside an anchored block, splitting one, pasting blocks into a passage, dragging a block into another passage, and undoing a beat reorder.
- worldcrafter-jd8b's Done when and Scope are rewritten from that section.
- The section and the jd8b rewrite are independently reviewed before jd8b starts.

## Scope

Experiments in a scratch branch or test file, deleted afterwards. No production code. Questions:

1. Where anchors live. A sidecar keyed by block ID (an annotation, per Boundary 1) or a property on content blocks. A property in the tree breaks "annotations never write to the tree", so choosing it goes to Sumeet: how scenes relate to documents is his call (strategy, Authority).
2. Whether new blocks (Enter, a split, a paste) inherit the beat of the block they came from or sit next to.
3. Which order wins when beat order and block order disagree (the writer drags blocks in the editor).
4. What undo restores after a beat reorder, given that Plate's history covers content only.
5. Whether a block can anchor to more than one beat.

## Context

- Stable block IDs (S2 of the rebuild): `app/src/editor/block-id-plugin.ts`. A split gives the trailing half a new ID (`docs/rebuild/data-model-boundaries.md`, Boundary 4).
- Document session: `app/src/workspace/document-session.ts`.
- Scene structure record: worldcrafter-8tbh. Decision worldcrafter-ddha (optional beats; a passage anchors to a beat or to its scene).

## Notes

- 2026-10-30 [note] Spike experiments (2026-10-30), headless Plate with the real document plugins, in a scratch test since deleted. Scene: beats b1,b2,b3 with passages a,b | c,d | e. 'tree' = a beat property on blocks (schema plugin removed for the test); 'sidecar' = a map from block ID to beat. E0: the document editor strips beat on load; validateDocument rejects it. E1 tree: Enter mid, at the end and at the start of a block copies beat to both halves; Enter at the end of an h2 makes a p with no beat; undo of a split restores it. E1s sidecar: with position alone, Enter at the start of c (first of b2) puts the new empty block in b1; a split_node hook fixes it; mid and end agree. E3 tree: a same-doc paste mid-block carries the source beat on middle blocks; a paste into an empty block replaces it and takes the source beat (b1 in b2); a paste from another scene carries a foreign beat; HTML middle blocks have none. E3/E3h: position alone puts HTML pasted at the start of c into b1; an insertData hook using the cursor block's anchor puts every pasted block in the cursor's passage, in both models, and undo works. E4: a drag keeps ID and anchor; c moved into b1 gives runs b1,b2,b1,b2,b3; a whole-passage move gives contiguous runs out of order. E5: the reorder is one undo step with IDs kept; undo restores the prose but not the beat record (out of order). E5t: Plate's undo pushes a copy of the batch, so identity-keyed tags are lost; a property tag restores beat order on undo, redo and undo. E5m: same-tick ops merge into the reorder batch. E5w: a reorder under withoutSaving, then undo of earlier typing, deleted text from the wrong block silently. E5g: a reorder gathers a split passage; a dangling anchor rides with the block before it. E7: delete and undo restores the tree property; a sidecar pruned on save re-resolves c into b1. E9: accepting an AI segment loses the anchor in both models (sidecar by position goes to b1); E9h: a hook on move_node lifts from [i,k] to [j] keeps the segment's anchor. E10: Backspace at the start of c merges its text into b (b1); undo restores. E12: blocks inside a segment are nested, not top-level. Outcome: discard the code; the learning is in docs/rebuild/data-model-boundaries.md, 'Passage anchors'.
- 2026-10-30 [note] Review round (2026-10-30), scratch test since deleted, combined plugin implementing every rule over the real document plugins. Once: 'only IDs not in the map' keeps c in b2 after delete+undo and Backspace+undo, and pasted blocks in b2 after redo; negative control overwriting the map gives c:b1 and pasted:b1 (the delete case only with the replace rule off, since its state masks it). Regenerate: without the replace rule a segment opening b2 comes back b1; with it b2, and undo/redo stay right. Text drag (select drop, delete range, insertData): prose lands with the drop point's beat; dragging all of c's text leaves an empty c in b2. Selection: forward and backward pastes take the block at the selection start. Heading Enter: ops are split_node, split_node, set_node type p; sidecar gets the heading's anchor; in the tree option a further set_node clears beat. Read-only editor still applies moveNodes. A reorder with no moves makes no batch, and undos.at(-1) is then the previous step, so it must not be tagged. setSplittingOnce after a reorder keeps same-tick typing a separate step. Plugin-level undo/redo tag: before, after, before. Out-of-order paths: anchor a to b2 (repaired by reorder with current order); delete, anchor, undo; reorder, anchor, undo. A block absent from the map, deleted, then restored by undo after another edit takes b1, so the first anchor command records every block with null. Reorder during live generation: render follows by ID, undo mid-stream then undo generation restores the document. Fuzz: 500 seeds x 60 steps of ordinary edits, 0 order violations, 0 blocks missing from the map, 0 errors; it checks order and map membership, not that each anchor is the right one. Control with pasted blocks forced to b1: 25 of 50 seeds violate. Biome noRestrictedImports with pattern **/story/beat-order catches alias and relative imports.
- 2026-10-30 [note] Second review round (2026-10-30), scratch test since deleted. Correction to the earlier note: the biome pattern **/story/beat-order flags ~/story/beat-order and ../story/beat-order but not ./beat-order from inside story/. Replace rule: without a same-tick limit, delete c then in a later tick generate at its index gives b2; with editor.operations.length > 0 it gives b1, and regenerate still gives b2 with or without a caret inside the old segment, and through undo and redo (operations are remove_node, insert_node). Load repair: with a record and a repeated ID, the repaired block is absent from the map, and after delete, typing, undo, undo takes b1; with prune and fill on open it is null and stays null. Undo past a no-move reorder: a:b1, c:b2, delete c, reorder to [b2,b1], undo gives c after a with beats [b2,b1]: out of order; reorder with the current order repairs. Signal: onChange fired on typing, delete and undo; the top-level ID sequence went ac, a, ac, so it changes on structure and not on typing.

## Close Reason

Anchors stay outside the tree in a per-scene annotation record; five questions answered with experiments in docs/rebuild/data-model-boundaries.md; jd8b rewritten; independently reviewed
