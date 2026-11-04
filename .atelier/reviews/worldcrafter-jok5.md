---
schema: atelier.review
schema_version: 1
id: worldcrafter-jok5
title: finding on worldcrafter-i2uz @1fdc802e
target: worldcrafter-i2uz
identity: code-reviewer
commit: 1fdc802e35dfd5e475124aaff1e69784169997fb
created_at: 2026-11-04T23:59:26.469769362Z
event:
  event: finding
  recommendation: defer
---

low: app/scripts/judging/panel.ts:451 and :170 RECORDED holds only an evidence ID matched by a regex; it doesn't pin part1.md's sha256 and nothing checks the ID exists in Atelier. Part 2 copies part1/part1.md as it is at Part 2 start, so an edit after recording would reach Part 2 undetected, and the 'recorded before Part 2' guard is self-attested. Suggested: write the sha256 into RECORDED (and run.json) and have checkPart2Ready compare it, optionally checking the evidence ID with atelier. The procedure reviewer can check this after the run meanwhile.
