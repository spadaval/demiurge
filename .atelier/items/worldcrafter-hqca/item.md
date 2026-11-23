---
schema: atelier.item
schema_version: 3
id: worldcrafter-hqca
title: Wire Night Edition scene apparatus layers and gloss column to live story bible state
status: changes_requested
mission: worldcrafter-mtkn
labels:
- ui
- night-edition
- layers
priority: high
blocked_by:
- worldcrafter-lgz8
- worldcrafter-7r87
- worldcrafter-yxfp
- worldcrafter-0pt4
implementers:
- thread:delegated-task:command%3Amcp%3A3f69cce6-a3b3-462c-8abc-fa3ad7d4dffd%3Adelegate-task%3A0c650a01-7782-4849-8707-7bed5ed067c8
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T22:39:02.106023259Z
---

## Goal

Wire the Night Edition scene view's paint-only apparatus layers and lettered gloss column (`DESIGN.md`, `app/src/app/gloss.tsx`, `app/src/app/layers.ts`) to live computations from the unified story bible (`reader-order --before`, viewpoint dramatic-irony marks, opening counts, planted/paid-off objects, versions vs. truth, and time spans).

## Done when

- [x] Opening a scene displays its live story-time stamp, opening count values, viewpoint dramatic-irony marks (fixed by `worldcrafter-0pt4`), planted/paid-off objects, versions vs. truth (distinguishing an event's true summary from told versions), and time spans (fixed by `worldcrafter-yxfp`) in the Night Edition apparatus and gloss column.
- [x] Defines and tests how bible records attach to scene apparatus (anchored to matching spans via `TextAnchor` where a passage match exists, or rendered as scene-level gloss entries when unanchored).
- [x] Toggling layers preserves the Paint-Only Rule: 0 px prose reflow verified by `app/scripts/measure-layers.ts` and `app/src/app/layers.test.tsx`.
- [x] Updates reactively when the agent (or a command) mutates the story bible.
- [x] Component and layer tests pass; `cd app && bun run check` passes.

## Scope

In: `app/src/app/layers.ts`, `app/src/app/gloss.tsx`, `app/src/layers/`, and scene-view wiring to the unified story store.
Out: Heuristic/LLM entity discovery (`worldcrafter-8agg`) and prose Context Viewer wiring (`worldcrafter-aq1r`).

## Report

A scene whose prose a story-bible scene names now shows the bible's view of it in the gloss column, the marks and the masthead stamp, and it updates when a command or the agent changes the bible (commit `9fb8c97`).

**What shows.** `app/src/layers/bible.ts` builds the notes for one scene, with authority "story bible" (or "inferred" for an inferred time):
- Time: how long after the scene before it in telling order, using `span`'s day counts with `worldcrafter-yxfp`'s fix ("3 days after “Night Market”", or "0.1 to 1.1 years after …" when a placement is a month or coarser), and each event the scene shows with its time and how far before the scene's latest event it is.
- World: each count's value as the scene opens and each change during it (`stepsAround`), and each version of an event the scene shows or links, set beside the event's summary ("What really happened: …").
- Subtext: what the scene plants (and where it pays off) and pays off (and where it was planted); dramatic irony for the viewpoint, using `viewpointGap` and `viewpointTurns` as `reader-order --before` does since `worldcrafter-0pt4`; and what earlier scenes still hold back.
- The stamp reads the bible's time for the scene (its latest placed event) before the outline's, and says "inferred" when that position is.

**How records attach.** A note sits on the first words in the prose that name its record: its name or label, a stated year (100 or more) for an event, or a count value of 10 or more, in digits or words. Small numbers are everywhere in prose, so they never anchor. The mark is an ordinary `TextAnchor` (with the occurrence counted as `locate` counts it), styled Time band, Subtext dots, or a new World hairline (`.lm-record`, paint only). Two notes never share a key's place. If the prose doesn't name the record, the note is about the whole scene (`GlossNote.placement: "scene"`): it has no key in the text and no tick, it is lettered after the notes on words, and it follows the scene's last line. Anchors are found again when the text changes. A `useEditorSelector` with a structural equality check (`sameBibleLayers`) redecorates only when an anchor actually moves. Tests: `app/src/layers/bible.test.ts` (13).

**Live updates.** `app/src/app/story.ts` holds the bible as a store. It wraps the app's connected storage so that every story-record write through it reloads the bible: a save or delete, a batch with a story write, or a restore. Reloads that pile up coalesce. `AppServices.story.storage` is the adapter any writer should use: future agent surfaces (`worldcrafter-lhh3`, `worldcrafter-w4mr`) should give it to `createAgentRunner`. A write that goes around it is seen only at the next `refresh`. Generation now uses the same adapter. `app/src/app/layers.test.tsx` checks that the gloss follows a `setCount` command, and an agent run (a scripted `complete` calling `setSceneViewpoint`) that removes the irony note. `app/src/app/story.test.ts` (4) covers the service.

**Paint-only.** `bun run build` then `bun scripts/measure-layers.ts`: 9 toggles, 0 px prose movement, slowest click-to-paint 33 ms, up to 14 notes shown including the bible's. The prose-DOM-untouched test in `layers.test.tsx` passes with the bible's marks in it.

**Demo.** The Ninefold now has a bible (`app/src/demo/ninefold-story.ts`) linked to its scene documents, so 4.2 The Sealed Door shows every kind of note. Its stamp now reads "12 November 1203, 23:00" from the bible instead of the outline's "Frost 12, 1203 · night", because the bible has no custom calendar. The rail's chronology still reads the outline's timeline.

**Other changes.** `DESIGN.md` gains a "Bible notes" paragraph under Gloss Note and the World record hairline under Layer Marks. `numberPattern` and `numberWordsPattern` are now exported from `app/src/story/mentions.ts`.

**Choices worth checking.**
- Scene-level notes follow the scene's last line. They first went at the head of the column, but there five of them pushed every word note about 380px below its words in the demo, which breaks the rule that notes sit beside the line they annotate.
- Notes refer to scenes by title ("pays off in “Undertow”"), not by the CLI's telling position, because the app numbers scenes by book and chapter (4.2) and the two would disagree.
- Bible notes have no actions: editing records is out of this mission's scope. "Open topic" is a natural action once talk pages land (`worldcrafter-rxvy`).

`cd app && bun run check`: tsc and Biome clean, 1621 tests pass across 76 files. The 4 React act warnings it prints come from `generate.app.test.tsx` and predate this change (`worldcrafter-d93c`).

Round 2: both findings were right, and both new component tests fail on round 1's code. `bibleLayers` now takes the scene's other marks and reserves the place of each keyed one that still locates, so a bible note whose only words end there becomes a note about the scene. The gloss orders notes by the order `assignKeys` gave their keys. `cd app && bun run check`: 1624 tests pass. `measure-layers`: 0 px movement, slowest 32.9 ms.

### Responses

1-ik8g.1: fixed in 52c3df9
1-ik8g.2: fixed in 52c3df9

