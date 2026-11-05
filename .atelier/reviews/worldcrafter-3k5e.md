---
schema: atelier.review
schema_version: 1
id: worldcrafter-3k5e
title: finding on worldcrafter-i2uz @ada1a818
target: worldcrafter-i2uz
identity: procedure-reviewer
commit: ada1a818ba4251982f250748f11201a245e48117
created_at: 2026-11-05T00:49:07.176527528Z
event:
  event: finding
  recommendation: fix_now
---

low: Superseded records now point at the opposite reports. Evidence worldcrafter-t2uj (VERDICT drop, the uncounted replacement) still has Path docs/verdicts/comparison/sonnet-part2.md, which since 7b8aa90 holds the counted part2-failed-1 report (VERDICT change), and its text points at docs/verdicts/comparison/failed/, which no longer exists. Evidence worldcrafter-tshh (drop) has Path docs/verdicts/comparison/verdict.md, which now says change. The decision note from d2401a0 cites 'docs/verdicts/comparison/failed/sonnet-part2-failed-1.md' (deleted; the same bytes are now sonnet-part2.md, sha256 c5d785b2...). It also asked for t2uj to be amended, but it was superseded by bzev instead. bzev and enlh say they supersede, so a careful reader isn't misled, but someone opening t2uj or tshh by its Path reads the other run's report. Fix: a note on worldcrafter-i2uz saying that t2uj and tshh are superseded by bzev and enlh, that the uncounted replacement is now docs/verdicts/comparison/sonnet-part2-replacement-uncounted.md, and that the failed/ path moved to sonnet-part2.md. This doesn't affect whether the procedure held.
