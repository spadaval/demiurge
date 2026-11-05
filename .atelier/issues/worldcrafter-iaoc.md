---
created_at: "2026-10-30T22:08:53.174842213+00:00"
id: "worldcrafter-iaoc"
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
closed_at: "2026-11-05T05:35:46.836326218+00:00"
status: "superseded"
title: "Enter a story: characters, scenes, drives, events and their links"
updated_at: "2026-11-05T05:35:46.836326218+00:00"
---

## Goal

A writer can get enough of a real story into the app to try reworking it. Today they can create documents, but not characters, events or anything that links them.

## Done when

- In the app, a writer can create a character (a document with a `person` or `organization` entry, through `createDocument` and `attachEntry`, with `worldIndex` refreshed so it shows up) and a scene.
- They can create, edit and remove drives, a drive's origins and relations, a scene's summary, actors, pressures and depicted events, and events with summaries. All of it goes through the command stores; the UI never writes records directly.
- Component tests (pattern: `app/src/app/app.test.tsx`) cover creating a character, giving them a drive with an origin event, and putting them in a scene.
- `bun run check` passes.

## Scope

Plain forms in the existing shell. No outline, positions, placements, facts, reveals, questions, beats or prose work. Events, characters and scenes entered by mistake can't be deleted yet; `removeEvent` comes with worldcrafter-js5y, and the app has no document delete.

## Context

Commands from worldcrafter-cly1. `app/src/world/store.ts` (`attachEntry`), `app/src/app/world.ts`, `app/src/app/router.tsx`.

## Notes

- 2026-10-30 [note] 2026-10-30: moved to worldcrafter-frqk after decision worldcrafter-2y4g. Rewrite this when the screen increment is planned.

## Close Reason

Obsolete: decision worldcrafter-03rp ended the typed-model bet after two blind comparisons favoured plain notes (worldcrafter-i2uz change, worldcrafter-iu6l drop). This was written for the typed model; what follows is mission worldcrafter-p3k7 (docs/strategies/notes-first.md). Evidence and history kept.
