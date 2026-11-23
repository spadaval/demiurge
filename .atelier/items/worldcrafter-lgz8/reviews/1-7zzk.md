---
schema: atelier.review
schema_version: 3
round: 1
commit: 30f9c3ad5fddb24488c08fd7d68930d314771ce5
reviewers:
- 01a20647-f794-7051-9a2c-144ddea62a5e
model: grok-4.6
verdict: approve
created_at: 2026-11-23T02:41:58.461122327Z
---

## Summary

- Complexity: medium. A new `storyRecords` collection, IndexedDB version 2, and a record-by-record story store; the mapping is large but follows the existing adapter pattern.
- Value: high. The app cannot hold the unified bible or link scene prose without this persistence.
- Risk of merging it: low. Load checks the file's rules, the fixture covers every record kind, a version-1 database upgrades with its records kept, and no release has user data yet.

The value warrants the change. Optional `documentId` is the right call: a scene can be sketched before prose exists, existing files still parse, and requiring a document on `addScene` would pull document creation into this item. `book` and `chapter` as names, one record per item, and schema-agnostic storage match the stated sync plan and the file model.

Reviewed `git diff master...30f9c3ad5fddb24488c08fd7d68930d314771ce5` against every Done when line and the Report.

**Storage contract.** `storyRecords` is on `StorageAdapter` in types, memory, IndexedDB and connected storage. `BatchWrite` has `saveStoryRecord` and `deleteStoryRecord`; both adapters apply them in one transaction, and a later unstorable write rolls back a delete. Read-only tabs refuse collection writes and a delete batch. Record IDs are strings; `updatedAt` is the caller's stamp. `storyToRecords` emits every `Story` field and every `Timeline` list, with drive turns and relations inside the drive and candidates inside the open question. Composite IDs match the file's uniqueness keys (`cause`/`effect`, participant, position, placement, follow, deliberate gap). Slashes in IDs are URI-encoded, so `a/b`+`c` and `a`+`b/c` do not collide.

**Upgrade and fixture.** `upgrade()` takes a target version. The IndexedDB test builds a version-1 database with the real version-1 step, writes a record into every version-1 store, upgrades, and reads them back; `storyRecords` is empty until written and survives close and reopen. The lighthouse fixture fills every array on `Story` and `Timeline`, yields every `STORY_RECORD_KINDS` value, gives each scene a `documentId`, and its documents pass `validateDocument`. On memory and IndexedDB (IndexedDB after close and reopen) it saves, reloads equal as a story file, keeps scene order, and `sceneDocuments` reports every scene `linked` with none shared.

**Commands, CLI, docs, neighbours.** `setSceneDocument` refuses a document another scene already names; `setSceneChapter` sets or clears names. Other scene edits keep the new fields. `EDITS` is keyed by `StoryCommandType`, so the CLI had to add both commands; `--help lists every command with an example, and every example runs` passes. `docs/rebuild/story-model.md` Effect on the plan and Records describe the unified `Scene` and the storage layout. `git diff master...HEAD` names no file under `app/src/world/`, `outline/`, `time/` or `app/`.

**Checks run here.** `cd app && bun run check`: tsc clean; biome 3 warnings already on master (`isYear`, `stepAt`, `listLine` in `scripts/story.ts`); 1197 tests pass, 0 fail.

**Not checked.** Real-browser IndexedDB (tests use `fake-indexeddb`). Multi-device last-write-wins and tombstones (`worldcrafter-ji5d`, `worldcrafter-4t98`). UI (`worldcrafter-mtkn`). The bible's timeline in `storyRecords` is a second copy of `StorageAdapter.timelines`; they can drift until those consumers move. That is in Scope.

No findings.
