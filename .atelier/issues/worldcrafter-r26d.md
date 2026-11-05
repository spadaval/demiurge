---
created_at: "2026-11-05T06:28:02.365759326+00:00"
id: "worldcrafter-r26d"
issue_type: "task"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-wtiz"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Give open questions distinct states"
updated_at: "2026-11-05T06:28:02.365759326+00:00"
---

## Goal

An open question is one of: undecided (an author task, with candidates and rejected options and their reasons kept and shown), decided but not revealed, deliberately left open for the reader, or revealed in scene X. Unclosed threads are normal.

## Done when

- The model holds the four states, rejected candidates keep their reasons, and show/render display them.
- 'Revealed in scene X' ties to the scene links from the bible/prose split.
- Nothing reports an unrevealed or reader-open question as a problem.
- Tests; bun run check passes; independently reviewed and merged locally.
