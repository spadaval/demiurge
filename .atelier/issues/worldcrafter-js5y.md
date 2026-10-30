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

Provisional: delivers the rest of `rework`. A timeline view shows events and scenes, and the writer can create a book and chapter, add a scene to the outline, set positions and place scenes; scenes from the first trial aren't in the outline, so they have no time yet. A shift previews its conflicts, nothing moves silently, and the writer chooses what follows. A conflicting shift can be kept (Sumeet, 2026-10-30): `applyTimelineCommand` stops refusing a command that adds a problem, returns the problem with the new timeline, and the contradiction stays visible until the writer resolves it. Update the module's comments, its tests, `docs/rebuild/story-model.md` and `docs/rebuild/story-time.md` to match. `whatThisTouches` also walks placements, timeline constraints, fact changes and reveals. `removeEvent` removes an event and its positions, and is refused while a constraint, scene placement, correspondence, reveal, fact change, drive origin or `depicts` refers to it; scene events can't be removed this way. Ends with the writer's keep, change or drop.

## Unknowns

- How to show held contradictions so they're useful rather than noise.
- Whether events need an "overlaps" relation. Positions can overlap as intervals, but `TimeRelation` has only before, after, during and simultaneous.
- A single move of `seal` or scene 3.2 is refused in either order. Multi-step routes exist, so an atomic group shift is a design choice for preview and undo, not a necessity. A preview needs `timelineProblems` on a candidate timeline. `during` may be enough to treat a group as a unit.
