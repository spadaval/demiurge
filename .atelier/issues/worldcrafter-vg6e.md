---
created_at: "2026-11-05T11:33:23.681409055+00:00"
id: "worldcrafter-vg6e"
issue_type: "task"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-5pks"
    type: "discovered_from"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Trace precision (Round 2 reading 2)"
updated_at: "2026-11-05T11:33:23.681409055+00:00"
---

## Goal

Inline traces that are mostly real, so a writer keeps reading them.

## Done when

- set-count traces only when the value changed, and matches text stating the old value at that event, including numbers written in words.
- Text traces ignore stems common across the story (beyond the rarity cap) and don't list a record that the same batch rewrites, or the scene being rewritten.
- Re-run on Round 2's 8 traces (replay as in the reading) shows how many suspects remain and that the missed stale count note is found; tests; bun run check passes.
