---
schema: atelier.review
schema_version: 1
id: worldcrafter-ol4w
title: disposition on worldcrafter-o8b7 @0da6e92b
target: worldcrafter-o8b7
identity: orchestrator
commit: 0da6e92ba3e34b84b1ba5545370af747d7622fde
created_at: 2026-11-04T20:57:15.086649985Z
event:
  event: disposition
  finding: worldcrafter-1za9
  decision: no_action
  supersedes: null
  resolution_commit: null
  follow_up: null
---

storyContradictions recomputes from state, so a constraint and a move exercise the same path; p4zf's CLI test keeps a real conflicting event move.
