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
    id: "worldcrafter-i2uz"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-iu6l"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-o8b7"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-z9qs"
    type: "advances"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T05:35:47.143978603+00:00"
status: "superseded"
title: "Shift an event, and see what breaks"
updated_at: "2026-11-05T05:35:47.143978603+00:00"
---

## Goal

The writer can place scenes and events in time from a timeline view, move an event, preview what the move would break, and choose which connected events move with it.

## Done when

Provisional: delivers the rest of `rework`. A timeline view shows events and scenes, and the writer can create a book and chapter, add a scene to the outline, set positions and place scenes; scenes from the first trial aren't in the outline, so they have no time yet. A shift previews its conflicts, nothing moves silently, and the writer chooses what follows. A conflicting shift can be kept (Sumeet, 2026-10-30): `applyTimelineCommand` stops refusing a command that adds a problem and returns every problem added along with the new timeline, and the contradiction stays visible until the writer resolves it. Malformed commands are still refused. The store already recomputes `problems` on load, and queries already treat a contradictory order as uncertain. Update the store and its callers, the module's comments and error types, the tests that expect a refusal, `docs/rebuild/story-model.md` and `docs/rebuild/story-time.md` to match. `whatThisTouches` also walks placements, timeline constraints, fact changes and reveals. `removeEvent` removes an event and its positions, and is refused while a constraint, scene placement, correspondence, reveal, fact change, drive origin or `depicts` refers to it; scene events can't be removed this way. Ends with the judging panel's keep, change or drop (decision worldcrafter-zybl).

## Unknowns

- How to show held contradictions so they're useful rather than noise.
- Whether events need an "overlaps" relation. Positions can overlap as intervals, but `TimeRelation` has only before, after, during and simultaneous.
- Once a conflicting shift can be kept, moving `seal` or scene 3.2 alone works and shows its problems, so moving a group together is a convenience, not a necessity. `during` may be enough to treat a group as a unit. `during` may be enough to treat a group as a unit.

## Notes

- 2026-10-30 [note] 2026-10-30: written for the app-first plan and stale until it's re-planned from the verdict in worldcrafter-i2uz (decision worldcrafter-2y4g). It may assume drive editing and a focus view exist in the app; they don't yet.

## Close Reason

Obsolete: decision worldcrafter-03rp ended the typed-model bet after two blind comparisons favoured plain notes (worldcrafter-i2uz change, worldcrafter-iu6l drop). This was written for the typed model; what follows is mission worldcrafter-p3k7 (docs/strategies/notes-first.md). Evidence and history kept.
