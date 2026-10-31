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
  relates: []
schema: "atelier.issue"
schema_version: 2
status: "in_progress"
title: "Hold a story in one readable file"
updated_at: "2026-10-31T05:18:53.836243055+00:00"
---

## Goal

One file holds a whole story sketch in a form a person can read and git can diff, with anything in it allowed to be unconnected, unanswered or contradictory, including a motive with no owner yet.

## Done when

- A new module `app/src/story/` defines the shapes below, and `parseStory` checks a file back into them, rejecting malformed files with typed `neverthrow` errors. Unit tests cover valid and invalid files.
- A story with a premise and nothing else is valid, and so is an actor with no drive, a drive with no actor, an event nothing refers to, a scene with no actors, a fact about nothing, a reader question no scene opens and an open question with no candidates. Each is shown by a test.
- `serializeStory` writes pretty-printed JSON with a stable key order. `scenes` keeps its order, which is the telling order. Every other list of records, including the timeline's, is sorted by ID, because timeline edits reorder them. A test shows that parsing and writing a file leaves it byte for byte the same, and that changing one record changes only that record's lines.
- A timeline event can have a summary. A timeline saved before this parses with an empty summary, shown by a test, and the app's existing timeline behaviour doesn't change.
- `bun run check` passes in `app/`.

## Scope

Shapes (names may change if the reason is recorded; meanings may not):

- **Story**: `version`, `premise`, `actors`, `drives`, `facts`, `readerQuestions`, `scenes` (in telling order), `openQuestions`, `timeline` (the existing `Timeline`, from `app/src/time/timeline.ts`).
- **Actor**: `id`, `name`, `kind` (`person` or `organization`), `notes`.
- **Drive**: `id`, `actorId` (may be null), `want`, `stakes`, `method` (strings, may be empty), `origins: EventId[]`, `relations: { to: driveId, type: "opposes" | "allies" | "competes" }[]`. A relation is stored on one drive of the pair only.
- **Fact**: `id`, `text`, `about: Ref[]`. A plain statement about the world, such as how Titan fusion works. It doesn't change at events, unlike the app's world facts.
- **ReaderQuestion**: `id`, `question`, `opensAt?: sceneId`, `answeredAt?: sceneId`. What the reader is waiting for.
- **Scene**: `id`, `title`, `summary`, `actors`, `depicts: EventId[]`, `pressures: driveId[]`. No outline, chapters or beats. A scene has no place in story time here: `depicts` is its only link to events, so a flashback can't be placed.
- **OpenQuestion**: `id`, `question`, `about: Ref[]`, `candidates: { id, answer, touches: Ref[] }[]`, `answer?: candidateId`, `conflict: boolean` (true when it records a contradiction someone noticed, such as two things that can't both be true). A `Ref` is a kind and an ID, for an actor, drive, fact, reader question, event, scene or open question, or a candidate, which also names its open question. Candidate IDs are unique within their question.

No storage adapter, collections, tombstones or database upgrade. Actors and scenes are plain records here and not documents (decision worldcrafter-2y4g).

## Context

`app/src/time/timeline.ts` (`parseTimeline`, `TimeEvent`, `EventId`) for the stored-JSON pattern.
