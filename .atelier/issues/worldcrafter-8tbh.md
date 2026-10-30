---
created_at: "2026-10-29T22:22:30.590516772+00:00"
id: "worldcrafter-8tbh"
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
    id: "worldcrafter-4t98"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Store drives with their origins, and scene links"
updated_at: "2026-10-30T22:02:01.373924291+00:00"
---

## Goal

Store what reworking a motivation needs: drives linked to the events that created them, what connects a scene to actors and drives, and event summaries (decision worldcrafter-ddha).

## Done when

- A new module `app/src/story/` defines the shapes below and parsers that check stored JSON back into them, rejecting malformed records with typed errors. Unit tests cover valid and invalid records.
- Two new keyed collections, `drives` and `sceneStructures`, pass the storage contract test (including tombstones) on the memory and IndexedDB adapters and through `app/src/workspace/connected-storage.ts`, and the IndexedDB upgrade keeps existing data.
- A stored event gains `summary`. A timeline saved before this loads with an empty summary, shown by a test.
- `bun run check` passes.

## Scope

Shapes (names may change if the reason is recorded; meanings may not):

- **Drive**: `id`, `actorId` (an entry document of kind `person` or `organization`), `want`, `stakes`, `method` (strings, may be empty), `origins: EventId[]` (non-scene events), `relations: { to: driveId, type: "opposes" | "allies" | "competes" }[]`, `authority` (`Authority` from `world/facts.ts`), `updatedAt`. A relation is stored on one drive of the pair only.
- **SceneStructure**: `id` (the scene's document ID), `summary`, `actors: documentId[]`, `depicts: EventId[]` (non-scene events; descriptive only, as story-time placement alone says when a scene happens), `pressures: driveId[]`, `updatedAt`.

Storage keeps each record's body as JSON with `id` and `updatedAt`, as `timelines` does; `story/` owns the types and parsing. Questions and beats come later (worldcrafter-y2y2). Passage anchors are not part of this record.

## Context

`app/src/storage/types.ts`, `app/src/time/timeline.ts` (stored-JSON pattern, `EventId`, `sceneEventId`), `app/src/world/facts.ts` (`Authority`).
