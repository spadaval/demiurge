---
created_at: "2026-11-05T16:59:55.958537559+00:00"
id: "worldcrafter-b0pg"
issue_type: "task"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-lsu3"
    type: "discovered_from"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T17:08:34.971093280+00:00"
status: "done"
title: "Opening counts and viewpoint marks in reader-order --before (Round 4 reading 2, 3)"
updated_at: "2026-11-05T17:20:07.727651902+00:00"
---

## Goal

The pre-scene read gives count values as the scene opens and true viewpoint marks.

## Done when

- reader-order --before prints each count's value entering the scene and each change at the scene's events ('402, then 261 at event:i-did-this').
- The viewpoint character also holds what a scene reveals or implies when they are an actor in it or take part in its depicted events, and what their own viewpoint scenes imply.
- Re-run on Round 4's snapshots shows the counts before s24 and s33 and the marks before s24, s33 and s36, with how many remain false by the reading's judgement; tests; --help; bun run check passes.

## Notes

- 2026-11-05 [note] Orchestrator accepts the deviation: 'implies' in a scene through someone else's eyes is not counted, because on Round 4 it made true marks false (s09 dov-bones, s02 cannot-see-face); 'pays off' is counted instead.

## Close Reason

Implementer report. Outcome: reader-order --before's counts section ('Counts as the scene opens, then as they change during it') prints each count's value in effect before the scene's earliest event, then each change up to its latest event in story order ('402, since event:breakout at …; then 261 at event:i-did-this'); a count that doesn't change prints one value. Viewpoint marks (learning.ts shownFrom): a scene through the character's eyes now counts what it implies and pays off as well as what it shows or reveals; a scene through other eyes counts what it reveals or pays off when the character is one of its actors or takes part in an event it shows. Deviation from the Done when: 'implies' through other eyes is not counted, because on Round 4 it made true marks false: s09 (Tilly's eyes, Casimir present) implies Tilly's secret dov-bones, and s02 (Casimir's eyes, Tilly present) implies cannot-see-face, which the reading judges Tilly doesn't know before s24; what a scene implies is the reader's inference, often from the viewpoint's thoughts. Pays off was added for both (s34 pays off cannot-see-face and final-tidying-needs in front of Tilly). Own knowledge records still decide (g0qy test passes). Re-run on Round 4 snapshots (phases/outline, scene-1, scene-2, scene-3 work, copied to scratch; each verified by the scene files it holds): counts before s24: pact 402 then 261 at i-did-this (was 261 only); before s33: pact 1408 then 1407 at chat-decides, share 31 then 49 at rite, 50 at chat-decides (was 1407 and 50). Before s36 the scene shows aftermath (from 1 October 201 to the year's end), so its opening values are those before 1 October and the list runs through chat-decides, greyhand-expelled and reliquary-breaks to 1406, 0 and 0: true to the model, but long. Marks (false by the reading's judgement): s11 6, 0 false (was 7, 1: hollow-wick gone); s24 10, 3 false (was 11, 4: synod-tidying gone; synod-marrowgate, wardens-hollowing, final-tidying-needs remain, none linked to a scene she is in); s33 9, 4 false (was 10, 5: those three and crane-ribbon, which s24 tells her but doesn't link); s36 6, 3 false (was 9, 6: cannot-see-face and final-tidying-needs gone via s34's pay-offs). What remains needs links or common-knowledge records the model doesn't have. Tests: viewpoint.test.ts (present in another's scene, taking part in its event, implies not counted there, pays off counted, own-scene implies; fails on the old learning.ts), story.test.ts counts opening value and changes. --help updated. bun run check 1148 pass. Open: independent review outstanding; the story-sketch skill's viewpoint paragraph still describes the earlier rule (out of this task's scope; worth a line in the next skill pass).
