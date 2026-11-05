---
schema: atelier.review
schema_version: 1
id: worldcrafter-x7z7
title: finding on worldcrafter-hqgq @0805b7a5
target: worldcrafter-hqgq
identity: code-reviewer
commit: 0805b7a5c60f73c9e697e6dc399f28bda05b9a5c
created_at: 2026-11-05T01:37:23.386785099Z
event:
  event: finding
  recommendation: fix_now
---

medium (worldcrafter-qgom): app/scripts/story.ts:1373 staleTextLines prints the mentions prompt after every update-actor/update-drive, even when the edit changes nothing the text could state, and lists every text naming the holder. Repro: actor mara named in 18 scene/fact texts; 'update-actor mara --kind person' (no change at all) and 'update-drive d --method ...' each print 19 mention lines. In a comparison session the protagonist's name is in most records, so routine edits dump dozens of lines and the prompt becomes noise the agent learns to skip, the attention cost the judges named. Suggested fix: prompt only when the edit changed a value text can state (actor name; drive want/actor, and holder-name matches only then; event label/position), skip no-op edits, and past a few lines print a count and 'run mentions <ref>'. Add a CLI test that a notes/kind/method-only edit doesn't dump holder mentions.
