---
created_at: "2026-11-05T14:15:00.661349359+00:00"
id: "worldcrafter-o0s0"
issue_type: "task"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-lxmj"
    type: "discovered_from"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T14:24:53.941809695+00:00"
status: "done"
title: "Viewpoint marks and reader-order --before telling (Round 3 reading 3, 4)"
updated_at: "2026-11-05T14:24:53.941809695+00:00"
---

## Goal

reader-order --before tells the writer what the reader and the viewpoint character know, correctly.

## Done when

- The viewpoint character counts as knowing an event it takes part in and the objects in it, a version it tells, and what a scene told through its eyes reveals (from that scene's latest event); a belief given up reads 'no longer believes'.
- Each told record shows its latest or strongest telling ('planted in 10, revealed in 24'), and a question whose chosen candidate a scene revealed is not listed as held back.
- Re-run on Round 3's snapshots (the reading's method) shows the marks before last-evening and nobody-unmasked, and how many remain false by the reading's judgement; tests; --help; bun run check passes.

## Close Reason

Implementer report. Outcome: reader-order --before's viewpoint marks now count what the story shows the viewpoint character, and its told list shows every way a record was told. learning.ts viewpointGap: the actor's own knowledge records of a record decide where they exist (so a belief given up still reads, now as 'no longer believes'); without them the actor holds an event from when they take part in it, an object from an event they take part in that it is in, a version they tell from its event, and what a scene through their eyes depicts or reveals from just after that scene's now (latest placed event; the scene being written aside; with no time, scenes told before it). sceneNow moved from the CLI into learning.ts. toldBefore keeps the first scene for each way a record was told ('implied in 16, revealed in 25'; 'revealed and planted in 14, paid off in 27') and drops from held back a question whose chosen candidate a scene revealed, and that candidate when the question was revealed. Help (top text, set-scene-viewpoint unchanged, reader-order --before flag) and the story-sketch skill's one paragraph on marks updated to the new rule, premise-neutral. Deviations: 'shows' (depicts) in a viewpoint scene counts as well as 'reveals'; own knowledge records override inference rather than merging with it (explicit until/since wins). Re-run on Round 3 phase snapshots (scene-1/work = before nobody-unmasked, scene-3/work = before last-evening, copied to scratch): before nobody-unmasked 11 marks -> 4 (v-agathe-bargain no longer believes; who-nobody/agathe, fever, fever-cause/undertow-sent doesn't know yet), all true by the reading's judgement, 0 false (was 7 false); before last-evening 12 marks -> 1 (v-agathe-bargain no longer believes), true, 0 false (was 11). Held back before last-evening lost who-nobody, who-benefice and ember-first; before nobody-unmasked lost who-benefice. Surprise: today's app gives 11 marks before nobody-unmasked where the reading counted 12 on the round's built tool. Proof: viewpoint.test.ts (6 fail on the old learning.ts, pass now), story.test.ts reader-order --before case for tellings and an answered question; bun run check 1134 pass. Open: independent review outstanding; skill guidance follow-up is worldcrafter-nkey.
