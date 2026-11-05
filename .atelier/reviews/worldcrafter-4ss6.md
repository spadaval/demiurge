---
schema: atelier.review
schema_version: 1
id: worldcrafter-4ss6
title: finding on worldcrafter-xzee @5f9d33b9
target: worldcrafter-xzee
identity: round-log-reviewer
commit: 5f9d33b9235fe6c4d4bd76741e16010649643ac5
created_at: 2026-11-05T09:33:11.893945832Z
event:
  event: finding
  recommendation: no_action
---

low: .atelier/evidence/worldcrafter-sosf.md:5 (and ygcu, 6wb8, tvqh, ntjj) Evidence is pinned to 315915ae but cites docs/rounds/round-1/reading.md and scores.md, which first exist at 5f9d33b9; someone checking out the pinned commit finds no file. The content is identical to the round directory copies, so nothing is wrong in substance; pin future evidence to the commit that adds its path.
