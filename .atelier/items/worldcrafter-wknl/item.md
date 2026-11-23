---
schema: atelier.item
schema_version: 3
id: worldcrafter-wknl
title: 'Writer notes: decide their representation and keep them out of model context'
status: in_review
mission: worldcrafter-3z9j
labels: []
priority: medium
blocked_by: []
implementers:
- thread:delegated-task:command%3Amcp%3A6d73f777-f6d1-4f6c-b6f0-9f634b2c4463%3Adelegate-task%3A8f4e585c-946f-4b12-8c80-c79b000c8356
ready: null
trivial: null
caused_by: null
created_at: 2026-10-18T05:27:28.178059781Z
---

## Goal

The Night Edition workspace renders inline `[[ ... ]]` writer notes in scene Plate documents as apparatus, but today they are literal prose text and leak into LLM requests through `projectProse` (`app/src/content/projections.ts`). Decide their representation (literal `[[ ... ]]` stripped by `projectProse`, or a dedicated annotation/node) and strip them inside `projectProse` so **every** downstream context builder—both `worldcrafter-667u`'s scene context packet and `worldcrafter-aq1r`'s prose Context Viewer—excludes writer notes automatically while the workspace still renders them as apparatus.

## Done when

- [x] Representation choice is recorded (in this item's Report and `docs/rebuild/data-model-boundaries.md` if the schema changes).
- [x] `projectProse` (`app/src/content/projections.ts`) excludes `[[ ... ]]` writer notes from scene Plate documents, verified by unit tests (including multi-word notes, multiple notes per paragraph, and unclosed brackets).
- [x] The Night Edition workspace still renders `[[ ... ]]` notes as apparatus without breaking `DESIGN.md`'s Two Voices / Paint-Only rules.
- [x] `cd app && bun run check` passes.

## Scope

In: Writer-note representation decision, `projectProse` exclusion in `app/src/content/projections.ts`, and workspace rendering test.
Out: Wiring story-bible context into prose generation (`worldcrafter-aq1r`, blocked on this item).

## Context

Found while wiring generation (worldcrafter-2tz9, 2026-10-18). See .impeccable/surfaces/writing-workspace.md, docs/rebuild/data-model-boundaries.md (Boundary 1: content is only what the author would expect in an export), app/src/content/projections.ts, app/src/context/builder.ts.

## Notes

- 2026-11-22 [note] Supersedes the 2026-10-29 and 2026-11-05 backlog notes (which predate `worldcrafter-jeue` and Sumeet's 2026-11-22 typed-store + app-owned agent direction); scheduled in `worldcrafter-3z9j` alongside prose finishing.

## Report

Writer notes no longer reach the model. `projectProse` now cuts every `[[ ... ]]` note, so the scene context packet and the prose Context Viewer both leave them out with no change on their side. The workspace still shows the notes exactly as before.

**Representation: notes stay literal text, and `prose` cuts them.** The schema doesn't change, and the markdown export keeps notes as the writer typed them. I didn't take a dedicated note node because it would add a schema type, its projections and an editor element for text the writer already types inline. It also wouldn't help on its own: brackets typed as plain text would still reach the model until something converted them. The decision is recorded in `docs/rebuild/data-model-boundaries.md`, in the Boundary 3 table and a paragraph under it.

- **One matcher.** `app/src/content/writer-notes.ts` has `writerNotes`, and the workspace's `fountainNotes` (`app/src/layers/model.ts`) now delegates to it. A note runs from `[[` to the first `]]` with no `]` between. Brackets that never close stay prose, as they always rendered.
- **Whitespace.** `writerNoteCuts` cuts the note along with the whitespace that would double up. `a [[x]] b` becomes `a b`, `a. [[x]]` becomes `a.`, `[[x]] a` becomes `a`, `a[[x]]b` becomes `ab`. Notes with only whitespace between them are cut as one group. A block that held only notes is dropped, like an empty block.
- **Source map.** A `Span` can now carry `cuts`, in block-text offsets. `toText` maps a block offset inside a note to the place it was cut. `toBlock` maps an output character to its own block offset. A range that spans a cut maps to a block range that contains it. So a cursor inside a note in `buildContext` cuts the window where the note was.
- **`plain+map` keeps notes.** That keeps "every block has a position" intact for entity matching. A follow-up question: should an entity named only in a note count as mentioned? `buildContext` already gives it no card, because it matches on the prose window.

**Tests.** `app/src/content/projections.test.ts` has a new "prose: writer notes" block covering multi-word notes, several notes per paragraph (including adjacent ones), notes at the ends of a block, unclosed and broken brackets, a note across marks and a link, a block that is only notes, and offset mapping across a cut. `checkMap` now checks the cut-aware contract, and the generated trees can now contain `[[` and `]]`, so the property tests cover cuts too. `app/src/context/context.test.ts` checks that no `[[` reaches the request body, that an entity named only in a note gets no card, and where a cursor inside a note lands.

**Workspace.** `app/src/app/layers.test.tsx` checks that the demo note still renders inside the prose as `.lm-note`, brackets and all. The paint-only toggle test still passes with the Notes layer, so Two Voices (italic sans at 15px) and Paint-Only hold. Nothing in the rendering path changed.

**Check.** tsc and biome pass, and 1164 of 1165 tests pass. The one failure is `scripts/story.test.ts`, "--help lists every command…". It hits its 5 s timeout with the host at load average 26 to 29 on 12 cores. It fails the same way with my change stashed, and the story CLI imports none of the files I changed, so it's host load (compare `worldcrafter-08kf`), not this change. A second run at load average 32 failed four `story CLI` tests (in `scripts/story.test.ts`), each at exactly the 5 s timeout. Every other test passed both times. A reviewer should rerun `bun run check` when the host is quieter.

**Round 2: merged master (`c9034b7`).** Round 1 was approved with no findings, but master had changed `projections.ts` since, so `atelier merge` refused and I merged master in. Master's `prose` writer now runs on `walkBlocks`, and the note cuts are ported onto it. Master also added the `addressable` projection (for AI edits by block ID, `worldcrafter-yx9v`), and I decided it **keeps** writer notes. A model that rewrites a block has to see all of its text, or its replacement would silently drop the notes. That decision is in the `addressable` comment in `projections.ts` and has a test. If notes should be hidden from edits too, the edit applier would need to put them back after a replace. That belongs in `worldcrafter-yx9v`.

One thing in the merge commit needs a look. Atelier's pre-commit hook refused it because master's item records arrive with statuses that changed (`open` to `approved`), and the hook reads that as a lifecycle violation. Every flagged status matches master exactly, so I committed past it with `ATELIER_SKIP`, stating that reason. The hook should accept a merge commit that brings in a parent's records unchanged.

`bun run check` passes on the merged head: tsc, biome, and all 1407 tests.

