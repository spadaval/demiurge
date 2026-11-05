---
schema: atelier.review
schema_version: 1
id: worldcrafter-0m5a
title: finding on worldcrafter-7coc @ed6456ac
target: worldcrafter-7coc
identity: round0-reviewer
commit: ed6456ac6fb683a9f4cc1780e25b8f9ff304b6ba
created_at: 2026-11-05T06:46:55.223812227Z
event:
  event: finding
  recommendation: defer
---

low: app/src/story/commands.ts:697 set-scene-links stores duplicate refs (set-scene-links storm reveals fact:a fact:a is saved; show lists it twice, scenes fact:a prints 'reveals it; reveals it'). Cosmetic noise in author output; dedupe refs in setSceneLinks (or sortedRefs) when convenient.
