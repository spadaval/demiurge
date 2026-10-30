---
created_at: "2026-10-30T22:02:01.303550954+00:00"
id: "worldcrafter-eg96"
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
    id: "worldcrafter-cly1"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Focus view: see and follow what a drive, event or scene touches"
updated_at: "2026-10-30T22:02:01.303550954+00:00"
---

## Goal

From any event, drive or scene, the writer sees everything connected to it, goes there, and changes things in place. This is the first thing in the mission a writer can actually use.

## Done when

- A pure `whatThisTouches` in `app/src/story/` follows, in both directions: drive origins, drive relations, pressures, scene actors, `depicts`, scene placements relative to an event, fact changes anchored to an event, and reveals. It skips dangling references.
- A scenario test over a fixture based on the Ninefold walkthrough (parent's Background) checks the lists for changing the drive and changing its origin. It fails if 2.1 isn't reached through its actors, or 3.2 through its placement, and includes a fact change and a reveal, which the demo doesn't seed.
- In the app, a writer can create and edit drives and their origins, a scene's summary, actors and pressures, and events and their summaries, all through the command stores. From any of them they can follow a link to the next. Component tests cover changing a drive and following it to a scene, and changing an event and following it to the drive.
- Checked by hand in the running app, with a note in the handoff. To run it: in `app/`, `bun run build`, then `bunx vite preview` in the background; stop it afterwards.
- `bun run check` passes.

## Scope

Show what's connected; don't rewrite anything or score it. There's no change history or diff: the list is what's linked now. No questions, beats, outline changes or prose work. Layout is open.

## Context

`app/src/time/holds.ts` and `time/timeline.ts` (placements, reveals), `world/facts.ts` (fact changes), `app/src/app/router.tsx`, `app/src/app/rail.tsx`.
