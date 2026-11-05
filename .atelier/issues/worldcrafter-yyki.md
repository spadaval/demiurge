---
created_at: "2026-11-05T16:59:55.999424360+00:00"
id: "worldcrafter-yyki"
issue_type: "task"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-lsu3"
    type: "discovered_from"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Trace and span polish; --add on scene lists (Round 4 reading 4, 5, 6)"
updated_at: "2026-11-05T16:59:55.999424360+00:00"
---

## Goal

Remove the last small frictions the reading found.

## Done when

- Traces leave out records rewritten earlier in the same command line and the old target of a changed knowledge record.
- span and reader-order give ranges for month-precision ends and year-range events, as single years do.
- set-scene-pressures, set-scene-actors and set-scene-events accept --add and --remove, as set-scene-links does.
- Tests; --help; bun run check passes.
