---
schema: atelier.item
schema_version: 3
id: worldcrafter-lgz8
title: Persist unified story bible in StorageAdapter and link scenes to Plate documents
status: approved
mission: worldcrafter-r7vd
labels:
- storage
- story-model
priority: high
blocked_by: []
implementers:
- thread:delegated-task:command%3Amcp%3A51564328-ab55-47e2-a228-a246e1757d43%3Adelegate-task%3A69a5901c-65e1-4043-b24a-e566425a36f2
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T22:39:00.214104451Z
---

## Goal

Persist the full `app/src/story/` bible inside `StorageAdapter` (memory and IndexedDB) and link each story `Scene` record to a Plate `Document` prose record via `documentId` (with optional `book`/`chapter` grouping), without breaking existing `app/src/world/`, `app/src/outline/`, or `app/src/time/` consumers.

## Done when

- [x] `StorageAdapter` (`app/src/storage/`) persists every field of `Story` (including the full `Story.timeline` `Timeline`: `events`, `positions`, `constraints`, `placements`, `frames`, `correspondences`, `follows`, `reveals`, `worldUnit`; plus premise, actors, drives + turns + relations, causes, participants, facts, objects, counts, memberships, versions, knowledge, open questions + candidates, reader questions, scenes with `documentId` and optional `book`/`chapter`, and deliberate gaps), with sync-compatible string keys and `updatedAt` timestamps.
- [x] Storage contract tests (`app/src/storage/contract.ts`) pass on both memory and IndexedDB adapters, including upgrading an IndexedDB database from the previous `DB_VERSION` without losing existing records.
- [x] A committed fixture story (covering all story record kinds and linked scene Plate documents) saves, reloads, and links cleanly to its scene prose documents.
- [x] `docs/rebuild/story-model.md` (Effect on the plan and Records sections) is updated to reflect the unified `Scene` record (`documentId`, optional `book`/`chapter`) and `StorageAdapter` persistence.
- [x] Existing `app/src/world/`, `app/src/outline/`, `app/src/time/`, and `app/src/app/` tests continue passing unchanged; `cd app && bun run check` passes.

## Scope

In: `app/src/storage/`, `app/src/story/` store persistence, and scene-to-document linkage.
Out: Whole-world JSON export/import (`worldcrafter-qizl`), retiring `app/src/world/` or `app/src/outline/` (waits for UI migration in `worldcrafter-mtkn`/`3z9j`), sync tombstones (`worldcrafter-4t98`), and UI views (`worldcrafter-mtkn`).

## Report

The story bible now persists through `StorageAdapter` one record per item, and each scene can name the Plate document that holds its prose.

**Choices worth checking.**
- `documentId`, `book` and `chapter` are optional on `Scene`, not required. A scene can be sketched before any prose exists, and every existing story file and CLI test still parses. The lead may prefer a required `documentId`; that would mean every `addScene` creates or names a document.
- `book` and `chapter` are names, not IDs. They are packaging only: the telling order is still the order of `Story.scenes`.
- The bible is stored one record per item, not as one blob, because `worldcrafter-ji5d` resolves conflicts per record with the server's copy winning. A single blob would lose a whole device's bible edit to any concurrent edit. Scene order is one `sceneOrder` record; a scene it doesn't name loads last, by ID, so two devices adding scenes at once lose no scene.
- Storage stays schema-agnostic: `storyRecords` holds `{ id, kind, data: JsonValue, updatedAt }`, and `app/src/story/store.ts` owns the kinds, the IDs and the checks, as `src/time/` does for timelines.

**What was built.**
- `app/src/story/story.ts`: the three `Scene` fields, kept in the file only when set; `storyFromJson` checks a story that is already JSON. `commands.ts`: `setSceneDocument` (refuses a document another scene already names) and `setSceneChapter`. `scripts/story.ts`: `set-scene-document` and `set-scene-chapter`, which the CLI's command table requires. The CLI still reads prose from `scenes/<id>.md`.
- `app/src/storage/`: the `storyRecords` collection on memory and IndexedDB, `saveStoryRecord` and `deleteStoryRecord` batch writes, and `DB_VERSION` 2. `upgrade()` takes a target version, so `indexeddb.test.ts` builds a version 1 database with the real version 1 step, writes a record into every version 1 store, and reads them all back after the adapter upgrades it. The contract tests add `storyRecords` and atomic save-and-delete batches on both adapters. `connected-storage.ts` wraps the collection and refuses its writes in a read-only tab.
- `app/src/story/store.ts`: `saveStory`, `loadStory`, `executeStoryCommand` and `sceneDocuments`. Record IDs are built from each item's identity with URI-encoded parts: `actor/mara`, `cause/storm/wreck`, `participant/wreck/actor/ivo`, `position/wreck/log`. A save writes only records whose content changed, stamped with the caller's `updatedAt`, and deletes removed items' records, in one batch. Saving an unchanged story writes nothing. A load checks the assembled bible with the story file's own checks, so a bad record fails the load and is named.
- Fixture: `app/src/story/fixtures/lighthouse.story.json` and `lighthouse.documents.json`. A test checks that it fills every list of `Story` and `Timeline` and yields every record kind, and that its documents pass `validateDocument`. On both adapters it saves, reloads (IndexedDB after close and reopen) to an equal story with scenes in the same order, and every scene comes back `linked` to its document.
- `docs/rebuild/story-model.md`: Effect on the plan and Records describe the unified `Scene` and the storage layout.

**Checks.** `cd app && bun run check`: tsc clean, biome clean apart from 3 warnings that are already on master (unused `isYear`, `stepAt` and `listLine` in `scripts/story.ts`), 1197 tests pass, 0 fail. No file under `app/src/world/`, `outline/`, `time/` or `app/` changed.

**For later.**
- Story commands never create or remove `timeline.placements`, so removing a scene leaves its placement behind. That is the existing behaviour of the file model, unchanged here.
- `worldcrafter-4t98` (tombstones) now has `storyRecords` to cover, and `DB_VERSION` 2 to build on.

