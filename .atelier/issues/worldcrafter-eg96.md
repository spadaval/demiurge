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
  - kind: "issue"
    id: "worldcrafter-iaoc"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Focus view: see and follow what a drive, event or scene touches"
updated_at: "2026-10-30T22:08:53.223551636+00:00"
---

## Goal

From any event, drive or scene, the writer sees what's connected to it, goes there, and changes things in place. This is what the mission's first bet is about.

## Done when

- A pure `whatThisTouches` in `app/src/story/` returns, grouped by kind, the subject's direct links in both directions: drive origins, drive relations, pressures, scene actors and `depicts`. It also goes one step further where a change plainly carries: from a drive, the scenes its actor is in; from an event, the scenes pressured by the drives it created. Anything beyond that, the writer reaches by clicking through. It skips dangling references.
- A scenario test over a fixture based on the Ninefold walkthrough (worldcrafter-o8b7, Background) checks the lists for changing the drive and changing its origin. It fails if 2.1 isn't reached through its actors, 3.2 through `depicts`, or 4.2 from `seal` through the drive.
- In the app, each event, drive and scene has a view showing those lists, with links to follow and its edit form from worldcrafter-iaoc in place. Component tests cover changing a drive and following it to a scene, and changing an event and following it to the drive.
- Checked by hand in the running app, with a note in the handoff. To run it: in `app/`, `bun run build`, then `bunx vite preview` in the background; stop it afterwards.
- `bun run check` passes.

## Scope

Show what's connected; don't rewrite anything or score it. There's no change history or diff: the list is what's linked now. Placements, constraints, fact changes and reveals join the walk with worldcrafter-js5y, when a writer can make them. Layout is open.

## Context

`app/src/app/router.tsx`, `app/src/app/rail.tsx`.
