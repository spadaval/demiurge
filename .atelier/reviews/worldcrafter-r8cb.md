---
schema: atelier.review
schema_version: 1
id: worldcrafter-r8cb
title: finding on worldcrafter-ql1d @936e93ec
target: worldcrafter-ql1d
identity: rubric-reviewer
commit: 936e93ec82fa0ae4c689c646938215f7333b0767
created_at: 2026-11-05T07:03:15.864047593Z
event:
  event: finding
  recommendation: defer
---

low: app/scripts/judging/panel.ts:247 Integration note for w716, not a blvm defect: prompt('part1') still asks for 'every pair', 'the one-line preference and your confidence' and packets/, and names 'Part 1' and a later Part 2 session (leaking process); the new cut has no Part 1 heading and asks for none of that. Judges given this prompt with the new rubric would get contradictory instructions. Fix in w716: a world-demo prompt that names the two files, says nothing of parts, sessions or later steps, and points to the rubric's report section.
