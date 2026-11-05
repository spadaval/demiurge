---
created_at: "2026-11-05T06:28:02.454321564+00:00"
id: "worldcrafter-j6z1"
issue_type: "feature"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-6m2v"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-gwx3"
    type: "advances"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Fill the remaining model gaps: objects, participants, drive life, finer time"
updated_at: "2026-11-05T06:49:45.811735067+00:00"
---

## Goal

Objects (planted in one scene, paid off in another), event participants, a drive's life (satisfied, renounced, replaced, flipped), and time finer than a year.

## Done when

- SKILL.md describes the new commands or states, and `--help` is accurate (review finding worldcrafter-j8lb).
- Each of the four is held by the model and the CLI, shown by show/render, with tests.
- bun run check passes; independently reviewed and merged locally.
