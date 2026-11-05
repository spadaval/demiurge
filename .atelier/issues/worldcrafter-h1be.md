---
created_at: "2026-11-05T00:50:24.465371383+00:00"
id: "worldcrafter-h1be"
issue_type: "task"
labels:
- "story-model"
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-xgxp"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Events can cause events"
updated_at: "2026-11-05T00:50:24.465371383+00:00"
---

## Goal

A team can record that one event happened because of another, and see when a change breaks the chain. Three of four model-gaps logs asked for this, and moving an event turned an effect into its cause with nothing to object.

## Done when

- A command records and removes `causes` from one event to another. It refuses unknown IDs, a self-cause and a duplicate; it keeps a cycle and reports it, since contradiction is material.
- `storyContradictions` reports an effect positioned before its cause, and a cycle, without refusing either; a test moves a cause after its effect and sees the contradiction, then moves it back and sees it leave.
- `whatThisTouches` follows causes in both directions, and from an event reaches what its effects reach one step on; a test shows it.
- The CLI has the commands, `render` says what happened because of what, and `--help` shows an example.
- `bun run check` passes.
