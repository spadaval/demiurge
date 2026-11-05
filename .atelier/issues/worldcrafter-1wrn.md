---
created_at: "2026-11-05T00:07:39.711941030+00:00"
id: "worldcrafter-1wrn"
issue_type: "task"
labels: []
priority: "P3"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-z9qs"
    type: "advances"
  - kind: "review"
    id: "worldcrafter-vidi"
    type: "discovered_from"
schema: "atelier.issue"
schema_version: 2
status: "backlog"
title: "Panel runner: record interrupted runs fully in run.json"
updated_at: "2026-11-05T00:29:09.219488392+00:00"
---

## Goal

An interrupted judge run's run.json shows the interruption, so nobody reading it alone sees a clean run.

## Done when

- On SIGINT/SIGTERM, panel.ts writes the problem and exit state into run.json as well as STATUS, and keeps the run dir's files/ copy before removing it; a test covers it; `bun run check` passes.

## Notes

- 2026-11-04 [note] Also from review finding worldcrafter-aaj0: skip a quoted cat heredoc body only when the cat line is top-level (not inside bash <<X or a multi-line string), with the two probes as tests.
