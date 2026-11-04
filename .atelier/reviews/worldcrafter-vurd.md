---
schema: atelier.review
schema_version: 1
id: worldcrafter-vurd
title: finding on worldcrafter-o8b7 @8ee08cdd
target: worldcrafter-o8b7
identity: code-reviewer
commit: 8ee08cddeab6d68787594388e15093aa0054ce81
created_at: 2026-11-04T21:54:16.208850934Z
event:
  event: finding
  recommendation: no_action
---

low: app/scripts/comparison/packet.ts:214-244 smoke packets are 7,518 and 8,881 words, against i2uz's estimate of about 25,000 for all eight (about 3,100 each). Each rework diff is 2,300-3,200 words, more than the story itself, because the readable text is a paragraph per line and most lines change, so -U3 shows nearly the whole story twice. That matches 04z5 (line diff, nothing truncated), so no code change is required, but eight packets would be about 65,000 words, and the format can't change after the freeze: put the number to Sumeet before freezing (a word-level diff, or the after-text plus a list of changed passages, would be shorter but changes the Done when).
