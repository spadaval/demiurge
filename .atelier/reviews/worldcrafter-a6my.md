---
schema: atelier.review
schema_version: 1
id: worldcrafter-a6my
title: finding on worldcrafter-ulpg @cbeb9305
target: worldcrafter-ulpg
identity: round1-fix-reviewer
commit: cbeb9305a087c0b5faacf6545ef7a0604b2b1a54
created_at: 2026-11-05T12:12:27.230670951Z
event:
  event: finding
  recommendation: fix_now
---

low: app/src/story/mentions.ts roundings() (vg6e). Covers uf0f and vg6e. A changed count value from 10 to 99 is also looked for rounded to 10s, in figures and words, so any 'ten', 'twenty' etc. in the story is a suspect: set-count boats storm2 14 (was 12) prints 'fact:f4 ("Ten men crew the lifeboat, ..."): text "Ten" may state its value 12 roughly'. That is new noise in the change meant to make inline traces mostly real, and small round numbers are common in prose. Fix: round only to 100 and up (Round 2's real case was 540 said as 'five hundred'), or only for values of 100 or more; add the 12->14 case as a test.
