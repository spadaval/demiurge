---
schema: atelier.review
schema_version: 1
id: worldcrafter-u4px
title: finding on worldcrafter-wefn @0bd0a708
target: worldcrafter-wefn
identity: round0-reviewer
commit: 0bd0a708a96cc14b998d5bb9946f12067c6607f7
created_at: 2026-11-05T07:06:55.910057172Z
event:
  event: finding
  recommendation: no_action
---

low: app/src/story/story.ts:680 retired marks are filtered out before validation, so a later invalid mark's error names the wrong index (a bad mark at deliberateGaps[2] after a retired one is reported as deliberateGaps[1]). It only misleads someone hand-editing a file. If it ever matters, validate first and then drop retired kinds.
