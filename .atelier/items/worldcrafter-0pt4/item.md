---
schema: atelier.item
schema_version: 3
id: worldcrafter-0pt4
title: 'Viewpoint marks: presence rule, group presence, timing, unplaced scenes'
status: approved
mission: worldcrafter-k7uh
labels: []
priority: medium
blocked_by: []
implementers:
- thread:delegated-task:command%3Amcp%3A19a62698-b51c-422f-9aec-662edcca5fd6%3Adelegate-task%3A8e288766-5d13-4c08-a854-ba67cde5896a
ready: null
trivial: null
caused_by: null
created_at: 2026-11-05T19:02:18.248813588Z
---

## Goal

Round 5's reading (ranked items 2–4): the presence rule's `!theirs(s)` exception cancels it for secondary viewpoints; group members in a scene's actors don't count as present; a revealed knowledge record doesn't reveal what it knows; marks are taken at the scene's latest event, not as it opens; a scene whose depicted events are unplaced loses its anchor.

This does **not** pre-empt `worldcrafter-lfyv` (private reveals, `does-not-know`, shared senses): as Round 5's reading (section 3) showed, a bystander's own `add-knowledge` record already protects whispered secrets without `!theirs(s)`, and any primitive `worldcrafter-lfyv` adds later will layer on top.

## Done when

- [x] Each of the five defects above is fixed with unit tests in `app/src/story/`.
- [x] Re-running viewpoint marks on Round 5's fixture/scenarios clears the false marks listed in `docs/rounds/round-5/reading.md` without hiding true ones (including finding `mnm0`'s whispered-secret case when the bystander has their own knowledge record).
- [x] `cd app && bun run check` passes.

## Links

Relationships of the old record that the new format has no field for.

- related: worldcrafter-gwx3 (World first: demonstrate the Demiurge-assisted process on one premise)
- discovered_from: worldcrafter-hdly (Round 5)

## Report

Secondary viewpoints in Round 5 now get true marks: before s21 (Silt) the marks drop from 10 to 4, and before s34 (Brannoc) every false mark the reading lists is gone except one, the tender. No true mark is lost.

**The five fixes** (`app/src/story/learning.ts`; the CLI side is in `app/scripts/story.ts` `toldBeforeLines`):

1. **Presence exception dropped.** `shownFrom` no longer has `!theirs(s)`. Someone present learns what a scene reveals or pays off even when the viewpoint holds it by a record. A whispered secret is protected by the bystander's own record, as Round 5 section 3 found: own records decide before presence is consulted.
2. **Group presence.** A group in a scene's actors brings its members, if a membership overlaps the scene's first to latest event. A group taking part in an event brings the members who belong at that event.
3. **Revealed knowledge records.** A scene that reveals or pays off `knowledge:k` reveals what `k` is of.
4. **Timing.** `reader-order --before` takes marks as the scene opens, at its first event in story order, before that event happens. A record ending at that event still holds. The new `viewpointTurns` adds a note for any of the viewpoint's own records (or, for an event, a version's) that start or end at an event the scene shows, such as `; Sir Brannoc Hale believes until event:closing-bell, in this scene`. When the opening event differs from the latest, the header says `through the eyes of X as it opens at event:Y`.
5. **Unplaced scenes.** The new `sceneSpan` orders a scene's events by story order, which needs no positions. An unplaced scene's marks now respect `--since`/`--until`, and an earlier unplaced scene tells from its place in story order instead of before everything. Day counts still use `sceneNow`.

Unit tests are in `app/src/story/viewpoint.test.ts`, in a new describe block "round 5's viewpoint mark defects", plus a rewritten test for the old exception. There is a new CLI test in `app/scripts/story.test.ts`. It checks the line without its day count, because `worldcrafter-yxfp` is changing that count. The CLI help paragraph on marks is updated.

**Round 5 re-run** (phase snapshots from `demiurge-world/round-5/phases/*/work/story.json`, taken before the writer's hand-made records):
- s15 (Kit): the same 2 true marks. `penny-sells` now adds "knows from event:wending-fair, in this scene".
- s21 (Silt): 10 marks become 4. All of `bought-watch`, `histories-swarm`, `majority-holding`, `chat-name`, `penny-sells` and `hush-limit` clear. `corvin-release` and `names-restore` stay (true). `corvin-pact` and `tender` stay. The reading says these need shared senses, which is `worldcrafter-lfyv`.
- s25 (Kit): the same 6 true marks.
- s34 (Brannoc): `bought-watch`, `chat-name`, `hush-limit`, `names-restore`, `surety` and `penny-sells` clear. `brannoc-saltcombe` is no longer "no longer believes". It now reads "believes until event:closing-bell, in this scene". Two true marks that the old end-of-scene timing hid now appear: `saltcombe-clerks` and `foreclosure` ("doesn't know, believes version:…", each ending at the bell). `corvin-release`, `ysolde-bargain` and `penny-line` stay (true). The mnm0 whispered-secret case stays marked: Brannoc was present in s25 for Lampwick's confession, and his own `brannoc-knows-lampwick --since closing-bell` keeps `candidate:why-silent/hiding` at "doesn't know yet", now with "knows from event:closing-bell, in this scene".
- The reading's unplaced-scene experiment (adding `silt knows event:tender --since closing-bell` before s21) now gives "Silt doesn't know yet". Before the fix, the mark disappeared.

**Left over, for the reviewer to judge against the second Done when line:** Silt's `tender` and `corvin-pact` marks (shared senses, `worldcrafter-lfyv`) stay. So does Brannoc's `event:tender` mark is still false. None of the five causes covers it: he has no record of the tender and isn't in a scene that reveals it. It is a bible gap, or part of the knowledge-reach decision in `worldcrafter-lfyv`.
