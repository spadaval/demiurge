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
closed_at: "2026-11-05T10:17:16.529111828+00:00"
status: "done"
title: "Round runner: choose-random --range"
updated_at: "2026-11-05T10:17:16.529111828+00:00"
---

## Goal

Let the orchestrator draw a random point from a range of beats, so Round 2 can draw one from each half of the arc (finding worldcrafter-exay).

## Done when

- `round.ts choose-random <round> --seed <n> --range <a>-<b>` draws uniformly among beats a..b not already chosen, and records the range and seed in points.json; tests; README; bun run check passes.

## Close Reason

Implementer report (commit 13bfc29). Added parseRange and a range option to choosePoint in app/scripts/round/round.ts; choose-random takes --range <a>-<b> (1-based telling-order positions, inclusive). It draws uniformly with the seeded mulberry32 among unchosen beats in the range, and points.json records range {from,to} beside the seed (absent without --range). Refused: malformed range (a>b, 0, not a-b), a range past the last beat, a range whose beats are all chosen. Tests cover bounds, uniform coverage over seeds, reproducibility, skipping chosen beats and the refusals; README updated. bun run check: 1109 pass, 0 fail. No model sessions. Review outstanding.
