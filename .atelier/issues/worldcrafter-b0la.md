---
created_at: "2026-11-05T09:13:32.748475981+00:00"
id: "worldcrafter-b0la"
issue_type: "task"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-xzee"
    type: "discovered_from"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Cut CLI noise and friction (Round 1 reading 1, 4, 6, 7, 8, 10)"
updated_at: "2026-11-05T09:13:32.748475981+00:00"
---

## Goal

Make the CLI quiet enough that a writer making a thousand calls never needs to filter its output.

## Done when

- No change-trace prints for add-* or an event's first set-position; inline traces after a real change are capped to a few lines with a count and the trace command to see all.
- gaps no longer lists fact-unconnected per fact (dropped or collapsed to one count line).
- render takes --section <name>; question sections are named after their states; the skill's words match.
- Date ranges and dates print as dates everywhere (render, reader-order, contradictions, edit output, show), never as fractional years (also finding worldcrafter-mdk6).
- set-scene-links can add or remove refs without retyping the list, and a set that drops refs says which.
- update-event works as an alias of describe-event (or the error suggests it).
- SKILL.md and --help match; tests; bun run check passes.
