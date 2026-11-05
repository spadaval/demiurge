---
schema: atelier.review
schema_version: 1
id: worldcrafter-mnm0
title: finding on worldcrafter-qmq0 @ae24b9ae
target: worldcrafter-qmq0
identity: round1-fix-reviewer
commit: ae24b9aeb2743abf03f589c4348bb7172e58c795
created_at: 2026-11-05T17:22:01.366684535Z
event:
  event: finding
  recommendation: fix_now
---

medium: app/src/story/learning.ts shownFrom, the 'present in a scene through other eyes' rule (b0pg, 56ff185). Covers 7b2r, b0pg and yyki. Counting what another's viewpoint scene reveals or pays off as known to every actor in it hides the classic dramatic irony, with no way for the writer to get the mark back: a scene through the villain's eyes, the hero in the room, revealing the villain's private secret. Repro: fact guilt 'Ivo cut the rope', ivo knows fact:guilt; object vial, ivo knows object:vial; scene s1 (supper) viewpoint ivo, actors ivo and mara, reveals fact:guilt, pays-off object:vial; scene s2 (dawn) viewpoint mara. reader-order --before s2 lists 'fact:guilt ...: revealed in 1' and 'object:vial ...: paid off in 1' with no mark: Mara is taken to know Ivo's guilt because she sat at the table while the reader read his thoughts. A knowledge record for her with a later --since brings 'doesn't know yet' back, but a secret she never learns can't be marked at all. Fix, small and in the spirit of 'own records decide': in a scene through someone else's eyes, a present character does not learn by presence what that scene's viewpoint character holds by their own knowledge record (it is told through their thoughts); everything else revealed or paid off there still counts, and a writer who has the secret spoken aloud records her knowledge, which wins. Re-run the Round 4 marks to see whether any false mark comes back. Otherwise b0pg checked: counts as the scene opens then each change (the s36 list is long because the scene shows aftermath to the year's end; true to the model, acceptable); the remaining false marks need links or common-knowledge records the model doesn't have, which is a fair explanation; not counting others' implies is right (the deviation note). bun run check at ae24b9a: 1151 pass, 0 fail, exit 0.
