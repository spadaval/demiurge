---
schema: atelier.review
schema_version: 1
id: worldcrafter-g5n5
title: finding on worldcrafter-i2uz @ba1230c5
target: worldcrafter-i2uz
identity: code-reviewer
commit: ba1230c5302a25e35ec56fca128ca194088b0f1f
created_at: 2026-11-05T00:54:59.384930316Z
event:
  event: finding
  recommendation: fix_now
---

Part 2 (planning), medium: .atelier/issues/worldcrafter-xgxp.md:26-29 covers wants, relations, satisfied constraints and decided questions, but not the cost of open questions' candidates, which two of the three judges put in the top-priority render item: Opus asks for 'a cheap working, don't print state for weighing candidates' (opus-part2.md s7.1) and Fable names 'each open question prints all its candidates' (fable-part2.md s7, render cost). That cost is why run 3c094cd9 weighed Halsey Street 'in my head and left no record', the fault behind the tool losing rubric Q2 (open questions held usefully) on the held-back premise. Left out, the second comparison retests the same flaw. Fix: add a Done when line for keeping open-question candidates out of the render or out of the count (or a working state), with a test.
