---
schema: atelier.review
schema_version: 1
id: worldcrafter-pzpi
title: finding on worldcrafter-hqgq @765f93c1
target: worldcrafter-hqgq
identity: code-reviewer
commit: 765f93c18ea9c8e1ca055571598f03155e13cc29
created_at: 2026-11-05T01:45:43.154854941Z
event:
  event: finding
  recommendation: fix_now
---

medium (worldcrafter-qgom, fix for x7z7): app/scripts/story.ts:1447 staleTextLines cuts to the first 5 mentions in record order (actors, drives, events, scenes, facts...), not by strength, so the match most likely to be stale is hidden behind holder-name matches. Repro: actor Mara named in 12 scene summaries, fact 'Her vow to keep the light binds her', drive d 'Keep the light'; 'update-drive d --want "Leave the island"' prints five 'names its holder Mara' scene lines and '...and 8 more'; the fact that states the old want verbatim is not shown. Same shape for events: a stated old year can fall behind label or span matches. This undoes the stale-motive case in the prompt the agent actually reads. Suggested fix: before truncating, rank direct matches (names it, states its year) ahead of holder-name and 'may state when this happened' matches; add a CLI test where the stale-want text sits after more than five holder mentions.
