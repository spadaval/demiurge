---
created_at: "2026-11-05T09:13:32.783897695+00:00"
id: "worldcrafter-w2hx"
issue_type: "task"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-b0la"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-xzee"
    type: "discovered_from"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Counts over time, and what the reader knows before a scene (Round 1 reading 2, 3)"
updated_at: "2026-11-05T09:13:32.783897695+00:00"
---

## Goal

Let the model hold a quantity that changes at events and check it, and let a writer ask, before writing a scene, what the reader knows by then and how long ago things happened.

## Done when

- A count record with values set at events (and an optional total or threshold) is shown as a running series by show and render, and trace follows it; contradictions reports a value set at an event that conflicts with an earlier one only if the writer declared it monotonic (or another simple rule the implementer picks and documents).
- reader-order --before <scene> lists, in short labels (no full fact text repeated), what the reader has been told before that scene.
- show event: (or a small command) gives the time between two events in days or the natural unit.
- SKILL.md and --help; tests; bun run check passes.
