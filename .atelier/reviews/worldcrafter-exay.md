---
schema: atelier.review
schema_version: 1
id: worldcrafter-exay
title: finding on worldcrafter-xzee @5f9d33b9
target: worldcrafter-xzee
identity: round-log-reviewer
commit: 5f9d33b9235fe6c4d4bd76741e16010649643ac5
created_at: 2026-11-05T09:33:11.414635827Z
event:
  event: finding
  recommendation: fix_now
---

medium: .atelier/issues/worldcrafter-5pks.md:34 (and xzee note at .atelier/issues/worldcrafter-xzee.md:50) The Round 2 rule 'one from each half of the arc not covered by the chosen points' can be read two ways (halves of the 1..N beats minus chosen ones, or halves of the uncovered stretch), and round.ts choose-random only takes --seed and draws from all open beats, so the runner cannot do it. Round 2's orchestrator would have to improvise after seeing the outline, which defeats recording the rule before the draw. Fix: state the rule exactly (e.g. beats 1..floor(N/2) and floor(N/2)+1..N, excluding chosen points, one seeded draw each) and either add a range option to choose-random under 5pks/3fqq or say how a manual draw is recorded (seed, candidate list).
