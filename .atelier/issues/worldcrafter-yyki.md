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
status: "in_progress"
title: "Trace and span polish; --add on scene lists (Round 4 reading 4, 5, 6)"
updated_at: "2026-11-05T17:08:37.954880553+00:00"
---

## Goal

Remove the last small frictions the reading found.

## Done when

- Traces leave out the old target of a changed knowledge record (matched against its own text). A record rewritten earlier in the same command line is left out only when its sole evidence is shared words; it stays when its text names the changed record or states its old year, value or a span (keeping review finding worldcrafter-gu8c's repro as a passing test).
- The --precision free text no longer prints as if it were the position (Round 4 reading item 9; finding worldcrafter-qs5e).
- span and reader-order give ranges for month-precision ends and year-range events, as single years do.
- set-scene-pressures, set-scene-actors and set-scene-events accept --add and --remove, as set-scene-links does.
- Tests; --help; bun run check passes.
