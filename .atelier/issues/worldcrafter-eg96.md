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
    id: "worldcrafter-i2uz"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-iaoc"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-iu6l"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
status: "backlog"
title: "Focus view: see and follow what a character, drive, event or scene touches"
updated_at: "2026-10-31T03:23:43.519520082+00:00"
---

## Goal

From any character, drive, event or scene, the writer sees what's connected to it, goes there, and changes things in place. This is what the mission's first bet is about.

## Done when

- A pure `whatThisTouches` in `app/src/story/` returns, grouped by kind, the subject's direct links in both directions: a drive's actor, drive origins, drive relations, pressures, scene actors and `depicts`. It also goes one step further where a change plainly carries: from a drive, the scenes its actor is in; from a scene, the drives of its actors; from an event, the scenes pressured by the drives it created. Anything beyond that, the writer reaches by clicking through. It skips dangling references.
- A scenario test over a fixture based on the Ninefold walkthrough (worldcrafter-o8b7, Background) checks the lists for changing the drive and changing its origin. The fixture gives one character two opposed drives, and the test checks each lists the other. It fails if 2.1 isn't reached through its actors, the drive isn't reached from 2.1, 3.2 through `depicts`, or 4.2 from `seal` through the drive.
- In the app, a character's page lists their drives and scenes, the rail lists drives and events, and each character, drive, event and scene has a view showing those lists, with links to follow and its edit form from worldcrafter-iaoc in place. Component tests cover opening a character and seeing their drives and scenes, changing a drive and following it to a scene, and changing an event and following it to the drive.
- Checked by hand in the running app, with a note in the handoff. To run it: in `app/`, `bun run build`, then `bunx vite preview` in the background; stop it afterwards.
- `bun run check` passes.

## Scope

Show what's connected; don't rewrite anything or score it. There's no change history or diff: the list is what's linked now. Placements, constraints, fact changes and reveals join the walk with worldcrafter-js5y, when a writer can make them. Layout is open.

## Context

`app/src/app/router.tsx`, `app/src/app/rail.tsx`.

## Notes

- 2026-10-30 [note] 2026-10-30: moved to worldcrafter-frqk after decision worldcrafter-2y4g. whatThisTouches moved to worldcrafter-33qr. Rewrite this when the screen increment is planned.
- 2026-10-30 [note] 2026-10-30: its Done when still lists whatThisTouches and app forms. Don't execute this as written.
