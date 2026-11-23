---
schema: atelier.item
schema_version: 3
id: worldcrafter-wqh0
title: Bible inspector views in Night Edition rail (Cast, Drives, Open Questions, Timeline, Counts, Reader-Order, Contradictions)
status: changes_requested
mission: worldcrafter-mtkn
labels:
- ui
- night-edition
priority: high
blocked_by:
- worldcrafter-if6h
- worldcrafter-lgz8
- worldcrafter-7r87
implementers:
- thread:delegated-task:command%3Amcp%3A3f69cce6-a3b3-462c-8abc-fa3ad7d4dffd%3Adelegate-task%3A32495da3-babe-43f7-a255-8eeaf7a3789a
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T22:39:02.027110174Z
---

## Goal

Build the Night Edition rail and inspector views over the unified story bible so the writer can browse and cross-navigate Cast & Drives (including origins, relations, turns, memberships), Open Questions (candidates, rejected reasons, superseded history, `left-open`), Timeline & Counts, Reader-Order vs. Story-Order, and Contradictions.

## Done when

- [x] Night Edition `World` view exposes dedicated inspector views for Cast/Drives, Open Questions, Timeline/Counts, Reader-Order, and Contradictions backed by the unified story store (`worldcrafter-lgz8`, `worldcrafter-7r87`).
- [x] Clicking any record opens its detail view with incoming/outgoing `touches` links and lets the writer jump across connected scenes, events, actors, and questions.
- [x] Follows the amended `DESIGN.md` (`worldcrafter-if6h`) typography, tonal steps, hairlines, and responsive drawer rules.
- [x] Component tests cover rendering and cross-navigation on a committed fixture story; `cd app && bun run check` passes.

## Scope

In: Read-only bible inspector views and cross-navigation in `app/src/app/`.
Out: Direct-manipulation editing forms (`worldcrafter-o7to`) and talk-page conversation UI (`worldcrafter-lhh3`, `worldcrafter-rxvy`).

## Report

The writer can now read the whole story bible in the app: the rail's World view opens with an Inspect section of five views, and every view and record shows in one World tab (commit a3a248c).

**What was built.**
- `app/src/app/bible.ts`: a read-only service that loads the bible with `loadStory` through the workspace's connected storage. It loads at startup, again when the World tab shows a view or record, and when the rail's World view opens. A failed read after a good one keeps the last story on screen.
- Route `/world?at=<view or ref>` (`app/src/app/router.tsx`): `at` is `cast`, `questions`, `timeline`, `reader-order`, `contradictions`, or a ref as the story tools write it (`drive:keep-light`, `candidate:why-leave/debt`). Back and Forward are the browser's.
- The World tab (`app/src/app/shell.tsx`): one tab after the document tabs, titled with the view's or record's name under the `World ›` crumb. It opens when anything shows in it and stays until closed. On it the masthead has no stamp, layer toggles, Context or Generate next, because those need an active document.
- Rail (`app/src/app/rail.tsx`): an Inspect section of five 32px rows with counts (actors, undecided questions, events placed on the world clock, scenes, contradictions). The current view carries the 3px bar. The rail opens on the World view when the app starts on the World tab.
- The five views and the record detail (`app/src/app/inspector.tsx`, with pure logic in `app/src/app/inspector-model.ts`) follow DESIGN.md's World Inspector, Ledger and References sections. Highlights: candidates show Chosen, live and rejected (with "Rejected · reason") states; superseded answers fold under "› N superseded"; events not on the world clock group under "Not placed in time"; an event in a contradiction links to Contradictions; the Reader-Order spark sits in the gutter and gloss column, one point per 32px row; contradictions say "kept" with no error styling.
- Touches: a record's detail puts "Touches" and "Touched by" in the gloss column, grouped by kind, every row a reference with how it connects. Direction comes from `outgoingRefs`: a touch is outgoing when the record names it, or a record it owns names it (a cause's effect, an event's participants, a member's group, a count's events). It is incoming when the other record names this one, or when neither does (a membership that starts at an event). A link both ways shows in both lists.
- Styles in `app/src/app/styles.css` follow DESIGN.md's hairlines, tonal steps and type scale, with the ≤1380, ≤1180 and ≤860px rules. I rendered every sheet with the real stylesheet at 1600, 1400 and 390px and checked it: no fills or cards, blue only on story-time values, and margin numbers move inline on phones.

**Judgment calls for the reviewer.**
- A scene reference opens the scene's prose tab, as DESIGN.md's References says. That leaves no reference to the scene's bible record, so Reader-Order rows and candidates carry a "touches N" reference (the form DESIGN gives a candidate's reach) that opens the record. N counts the record's Touches list, so the number matches what the detail shows.
- Story actors have no link to world entries yet. "Open entry" matches the world entry document whose title equals the actor's name, ignoring case. If two entries share a name, the first wins.
- DESIGN asks Contradictions to group resolved ones last, and Reader-Order to list where each reader question "progresses". The bible records neither (contradictions are computed and are either present or gone; reader questions have only `opensAt` and `answeredAt`), so neither is shown.
- The Open Questions rail count is undecided questions only. The fixture's two questions are answered and left open, so it shows 0.

**Tests.** `app/src/app/inspector.test.tsx` (13 tests) renders the full app on the committed lighthouse fixture (`app/src/story/fixtures/lighthouse.*.json`), plus an entry document for Mara. It covers rail counts and the current row, the World tab and its masthead, each of the five views, and cross-navigation: from a drive to an event, from the event to a scene's prose tab with the World tab kept, Back to the event, actor to group, "Open entry", candidate reach to the candidate and on to its question, a scene's reach to its record and "Open prose", an event's contradiction link, a removed record, and closing the World tab. Two pure tests cover the touch split and parsing `at`. `cd app && bun run check` passes: tsc and biome clean, 1614 tests pass.

**Found on the way.**
- Opening the fixture's `doc-arrival` makes React warn that `<ul>` cannot be inside `<p>`: Plate's ListPlugin renders the list wrapper inside the paragraph element. That bug predates this change, so I filed it as `worldcrafter-ri2r` and routed the test through another scene.
- `generate.app.test.tsx` prints four "update to Rail not wrapped in act" warnings, with or without this change. `worldcrafter-d93c` covers those tests.
- The bible reloads when the inspector is shown, not when the agent or a command changes it. `worldcrafter-hqca` adds live updates for scene apparatus, and should call `bible.refresh()`, or replace it with a subscription, so the inspector follows too.

