---
schema: atelier.review
schema_version: 1
id: worldcrafter-y21o
title: approval on worldcrafter-i2uz @ada1a818
target: worldcrafter-i2uz
identity: procedure-reviewer
commit: ada1a818ba4251982f250748f11201a245e48117
created_at: 2026-11-05T00:49:07.249051890Z
event:
  event: approval
---

Procedure re-check 0ab62e80..ada1a818: the procedure now holds. Rule (decision d2401a0, disposition eemo by decider): a flag starts a diagnosis, and a run is replaced only for an incomplete report or an actual reach beyond its material. Applied the same way to all three flagged runs: opus P1 and fable P1 kept (recheck 26fa501), sonnet part2-failed-1 kept (recheck.json at 7a407cc: problems [], outside 0, unparsed 0, init/models claude-sonnet-5-5; recheck ran at 00:47:25Z, after 7a407cc was committed; STATUS.original keeps the first 'failed' flag, byte-equal to docs/verdicts/comparison/sonnet-part2.STATUS.original). The replacement sonnet/part2 is kept and not counted. Check fix f4be6c2 and recheck addressing 7cc5ae9 were approved in h0g5; nothing under app/ changed after 5443d5b6. Counted calls: opus change, sonnet (part2-failed-1) change, fable drop, so change by the rule. judging/verdict.md, docs/verdicts/comparison/verdict.md, evidence enlh and the new verdict note agree, and the note discloses that the uncounted replacement called drop. Byte checks: docs sonnet-part2.md = judging/sonnet/part2-failed-1/part2.md (= the 0ab62e80 failed/ copy, sha256 c5d785b2); sonnet-part2-replacement-uncounted.md = judging/sonnet/part2/part2.md; verdict.md and the other five reports match. Nothing else changed: rubric and strategy untouched; the other runs' STATUS unchanged since 19:26-19:36; part2-failed-1 run.json, inputs and part2.md unchanged. One low records finding filed (stale Paths on superseded t2uj/tshh). Not verifiable from records: that 'decider' was independent of the panel's operator (all commits share one git author), and that Sumeet was told.
