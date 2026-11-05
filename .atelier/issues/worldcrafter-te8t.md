---
created_at: "2026-11-05T09:33:51.069106245+00:00"
id: "worldcrafter-te8t"
issue_type: "task"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "review"
    id: "worldcrafter-exay"
    type: "discovered_from"
schema: "atelier.issue"
schema_version: 2
status: "in_progress"
title: "Round runner: choose-random --range"
updated_at: "2026-11-05T10:15:01.509814111+00:00"
---

## Goal

Let the orchestrator draw a random point from a range of beats, so Round 2 can draw one from each half of the arc (finding worldcrafter-exay).

## Done when

- `round.ts choose-random <round> --seed <n> --range <a>-<b>` draws uniformly among beats a..b not already chosen, and records the range and seed in points.json; tests; README; bun run check passes.
