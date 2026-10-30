---
created_at: "2026-10-30T22:02:01.234516753+00:00"
id: "worldcrafter-js5y"
issue_type: "feature"
labels:
- "story-model"
priority: "P2"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-o8b7"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-z9qs"
    type: "advances"
schema: "atelier.issue"
schema_version: 2
status: "backlog"
title: "Shift an event, and see what breaks"
updated_at: "2026-10-30T22:02:01.234516753+00:00"
---

## Goal

The writer can move an event in story time from a timeline view, preview what the move would break, and choose which connected events move with it.

## Done when

Provisional: delivers the rest of `rework`. A timeline view shows events and scenes. A shift previews its conflicts, nothing moves silently, and the writer chooses what follows. Events can be removed (`removeEvent`, refused while anything refers to the event; see worldcrafter-cly1's history). Ends with the writer's keep, change or drop.

## Unknowns

- The engine checks gaps against positions and doesn't derive positions, so how a group moves together needs design. `during` may be enough to treat a group as a unit.
