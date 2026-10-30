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
updated_at: "2026-10-30T22:08:53.256657500+00:00"
---

## Goal

The writer can place scenes and events in time from a timeline view, move an event, preview what the move would break, and choose which connected events move with it.

## Done when

Provisional: delivers the rest of `rework`. A timeline view shows events and scenes, and the writer can add a scene to the outline, set positions and place scenes; scenes from the first trial aren't in the outline, so they have no time yet. A shift previews its conflicts, nothing moves silently, and the writer chooses what follows. `whatThisTouches` also walks placements, timeline constraints, fact changes and reveals. `removeEvent` removes an event and its positions, and is refused while a constraint, scene placement, correspondence, reveal, fact change, drive origin or `depicts` refers to it; scene events can't be removed this way. Ends with the writer's keep, change or drop.

## Unknowns

- **For Sumeet:** can a writer keep a shift that conflicts? Today `applyTimelineCommand` refuses any command that adds a problem, which sits badly with "checks report and never block".
- Moving `seal` and scene 3.2 one at a time fails in either order, so a group shift needs a batch command, and a preview needs `timelineProblems` on a candidate timeline. `during` may be enough to treat a group as a unit.
