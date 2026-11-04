---
schema: atelier.review
schema_version: 1
id: worldcrafter-8vrv
title: finding on worldcrafter-i2uz @1fdc802e
target: worldcrafter-i2uz
identity: code-reviewer
commit: 1fdc802e35dfd5e475124aaff1e69784169997fb
created_at: 2026-11-04T23:59:26.406249654Z
event:
  event: finding
  recommendation: fix_now
---

high: app/scripts/judging/panel.ts:184 Part 1 run dirs get the whole rubric file, including its Part 2 section (docs/verdicts/comparison-rubric.md:51-62), which says the arms are 'the structured story tool' and 'plain markdown notes' and that Thukker was tuned on while magical girl therapist was held back. Confirmed in the smoke run: smoke-root/judging/sonnet/part1/files/rubric.md lines 54-59. Combined with the accepted format giveaway this tells a blind judge which arm is which and which premise flatters the tool, breaking the strategy's 'Part 1's wording says nothing that hints at which arm is which' and undoing zybl's planning note that removed the tuned-on premise from Part 1. Fix: for part1 write only the rubric text before '## Part 2' (from the same pinned commit), record its sha256 in run.json, give the full rubric in Part 2, and add a test that Part 1's rubric.md has no Part 2 heading, 'tool', 'notes' or 'held back'. Wording of the prompt or rubric may need a matching line saying Part 1's questions are the whole Part 1 task.
