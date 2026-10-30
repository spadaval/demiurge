---
created_at: "2026-10-29T22:22:30.604851359+00:00"
id: "worldcrafter-cly1"
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
    id: "worldcrafter-8tbh"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Commands for drives, their origins and scene links"
updated_at: "2026-10-30T22:02:01.388084087+00:00"
---

## Goal

Every change to these records is a typed command callable without the UI, so the UI, tests and later an outside agent use the same path.

## Done when

- `app/src/story/commands.ts` exports a `StoryCommand` union and a pure `applyStoryCommand(state, context, command)` returning `Result<…, StoryError>`, plus a store that runs commands and persists through the storage adapter (pattern: `outline/store.ts`). `state` is the drives and scene structures. `context` is read-only: the scene documents, whether or not they're in the outline (a scene is any document that isn't an entry of another kind; "New document" attaches no kind); entry kinds by document ID; and the timeline's event IDs. The result names the records to save and to delete.
- Tests call each command directly and cover each error: unknown or wrong-kind actor, unknown scene document, unknown event, unknown drive, a drive related to itself, a relation that already exists in either direction, and duplicate IDs.
- A scene that isn't in the outline can have a summary, actors and pressures, shown by a test.
- Removing a drive removes it from other drives' relations and from every scene's `pressures`.
- References may dangle, for example after a cascade fails part-way. Derivations skip them, shown by a test. Taking a scene out of the outline keeps its structure.
- `describeEvent` in `app/src/time/commands.ts` sets an event's label and summary. Scene events can't be described this way.
- `bun run check` passes.

## Scope

Commands: add, update and remove drives; set a drive's origins (non-scene events, as with `depicts`: to say a drive began in a scene, add an event and have the scene depict it); relate and unrelate two drives; set a scene's summary, actors, depicted events and pressures; describe events. Actors and scenes already have commands (world store, `outline/outline.ts`); reuse them. Cascades save each changed record in turn, with no cross-store transaction.

## Context

Records from worldcrafter-8tbh. `app/src/time/commands.ts` (`TimelineCommand`).

## Notes

- 2026-10-30 [note] Deferred from review of spike worldcrafter-4vxp: removeScene, or deleting a document, orphans the document's passage_anchors annotation (ID passage-anchors:<documentId>, added by worldcrafter-jd8b), because storage requires callers to delete annotations themselves. Delete it where the scene or document is deleted, once jd8b exists.
