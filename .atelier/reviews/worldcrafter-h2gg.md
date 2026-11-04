---
schema: atelier.review
schema_version: 1
id: worldcrafter-h2gg
title: finding on worldcrafter-o8b7 @287d51e5
target: worldcrafter-o8b7
identity: code-reviewer
commit: 287d51e5051ef14e74b916c3198e6cce16bb9b9b
created_at: 2026-11-04T21:20:11.713099460Z
event:
  event: finding
  recommendation: no_action
---

low: app/scripts/story.ts:1347-1352 --help/-h anywhere in argv (including as a text value, e.g. add-actor x "-h") prints help and exits 0 without saving, and any positional text starting with "--" is refused as an unknown option. Unlikely in story text and visible to the caller (help printed / error), so no change needed now.
