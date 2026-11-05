---
schema: atelier.review
schema_version: 1
id: worldcrafter-8och
title: finding on worldcrafter-7coc @ed6456ac
target: worldcrafter-7coc
identity: round0-reviewer
commit: ed6456ac6fb683a9f4cc1780e25b8f9ff304b6ba
created_at: 2026-11-05T06:46:55.296532559Z
event:
  event: finding
  recommendation: defer
---

low: app/scripts/comparison/prompts.ts:60 the comparison harness still tells the writer to keep render's 'readable form' to ~1,500 words and treats render as the story (prompts.ts:64,70; comparison.ts:472 captures render for the packet). Not on wtiz's path (comparisons are dropped), but world-demo.md says to reuse this sandbox; whoever builds the round harness must drop these prompts and give judges only scene prose, or the bible/prose split is undone in the runs.
