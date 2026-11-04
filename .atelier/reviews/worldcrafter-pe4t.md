---
schema: atelier.review
schema_version: 1
id: worldcrafter-pe4t
title: finding on worldcrafter-o8b7 @8ee08cdd
target: worldcrafter-o8b7
identity: code-reviewer
commit: 8ee08cddeab6d68787594388e15093aa0054ce81
created_at: 2026-11-04T21:54:16.265449699Z
event:
  event: finding
  recommendation: no_action
---

low: app/scripts/comparison/comparison.ts:613 phase-b puts the frozen dir at <root>/frozen with root /home/supadava/projects/demiurge-comparison, so only tool sessions see 'demiurge-comparison' in STORY_CLI and --add-dir (and FROZEN.json, readable to them, names the commit of the public repo). That tells the tool arm alone that it's in a comparison and where the key sits. Cheap to avoid when choosing the root at freeze (a neutral path, key elsewhere); no change needed if the human accepts it.
