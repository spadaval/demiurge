---
schema: atelier.item
schema_version: 3
id: worldcrafter-4t98
title: 'Sync-ready storage: tombstones for deletes'
status: approved
mission: worldcrafter-3z9j
labels:
- storage
priority: high
blocked_by:
- worldcrafter-lgz8
implementers:
- thread:delegated-task:command%3Amcp%3A6d73f777-f6d1-4f6c-b6f0-9f634b2c4463%3Adelegate-task%3Ae25748fa-1485-40bb-aacc-0b3e04eb63d8
ready: null
trivial: null
caused_by: null
created_at: 2026-10-29T22:22:09.827789464Z
---

## Goal

Make every synced `StorageAdapter` collection (including the unified story-bible collections added in `worldcrafter-lgz8`) ready for the Cloudflare Worker sync backend (`worldcrafter-ji5d`, decision `worldcrafter-gcox`): deleting a record leaves a tombstone instead of removing it, so another device can learn of the delete.

## Done when

- [x] The storage contract test (`app/src/storage/contract.ts`), run against the memory and IndexedDB adapters, shows for every keyed collection except device-local snapshots: `delete` leaves a tombstone with `deletedAt`; `load` of a tombstoned key fails with `not_found`; `list` omits tombstones; `save` after a delete brings the record back.
- [x] `annotations.listForDocument` omits tombstoned annotations, and a `batch` that saves a document or annotation after its delete brings it back.
- [x] Listing tombstones returns each deleted key with its `deletedAt`, on both adapters and through `app/src/workspace/connected-storage.ts`.
- [x] If tombstones bump `DB_VERSION` (after `worldcrafter-lgz8`'s migration), a test writes records into every collection at the previous version, upgrades it, and reads the same records back.
- [x] A compile-time check over `StorageAdapter` collections requires every synced record type to have a string key and a change time (`updatedAt`, or `createdAt` for immutable stored requests).
- [x] `cd app && bun run check` passes.

## Scope

- `app/src/storage/` (types, memory and IndexedDB adapters, contract tests) and `app/src/workspace/connected-storage.ts`.
- The adapter sets `deletedAt` from the clock when `delete` runs; `delete(key)` keeps its signature.
- Stored requests sync like other records (`createdAt` is their change time).
- Snapshots stay device-local (append-only local history, no tombstones).
- No sync network code (`worldcrafter-ji5d`).

## Context

- `StorageAdapter`, `Collection<T>`, `BatchWrite` and record types: `app/src/storage/types.ts`. `listForDocument` reads the `byDocument` index in `app/src/storage/indexeddb.ts`.
- Ordered after `worldcrafter-lgz8` so `DB_VERSION` bumps do not collide and tombstones cover the story-bible collections.

## Report

Deleting from any synced collection now leaves a tombstone, so the sync backend (`worldcrafter-ji5d`) can carry deletes to other devices. Commit `a9e08f2`.

**Design.** Tombstones live apart from the records, not as marked records in the same store. IndexedDB has one new `tombstones` store keyed by `[collection, key]` with a `byCollection` index (`DB_VERSION` 3 to 4); the memory adapter keeps a map per collection. A delete removes the record and writes the tombstone in one transaction, and a save, a batch save or a restore writes the record and removes its tombstone in one transaction, so a key never has both. Because the record stores and their indexes hold only live records, `load`, `list`, `listForDocument` and `listForSession` needed no filtering and no change.

**API.** `Collection<T>` gains `listTombstones(): ResultAsync<Tombstone[], StorageError>`, ascending by key, with `Tombstone = { key, deletedAt }`. `delete(key)` keeps its signature; the adapter stamps `deletedAt` with `Date.now()` (one clock read per batch). `batch`'s `deleteStoryRecord` tombstones too. Snapshots are untouched. `connected-storage.ts` passes `listTombstones` through as a read, so read-only tabs can list them.

**Compile-time check.** `SYNC_FIELDS` in `types.ts` names each synced collection's key and change-time field (`createdAt` for requests). `SyncedCollectionsAreSyncReady` fails to compile if a `StorageAdapter` collection's record type lacks a string key or numeric change time, or if a collection is added to `COLLECTION_NAMES` without a `SYNC_FIELDS` entry. I checked it fails by changing requests to `updatedAt` and worldEntries' key to `id`. `types.test.ts` pins `SyncReady` with `@ts-expect-error` cases so it can't pass vacuously.

**Tests.** The contract (both adapters) now covers, per collection: delete leaves a tombstone with `deletedAt` in the call's time window, `load` is `not_found`, `list` omits it, tombstones list by key, save after delete brings the record back and clears the tombstone, deleting a missing key leaves a tombstone. Also: `listForDocument` and `listForSession` omit deleted records; a batch saving a deleted document and annotation brings both back; batch story-record delete and re-save; a failed batch leaves no tombstone; restore clears tombstones of the keys it writes; collections' tombstones are separate. `indexeddb.test.ts` writes records into every collection at version 3, upgrades, reads them all back via `dump` and the indexes, and checks a tombstone survives a reopen. `connected-storage.test.ts` lists tombstones through the connection, including in a read-only tab. `bun run check` passes (1471 tests).

**Choices a reviewer may question.**
- Deleting a missing key leaves a tombstone. The record may exist on another device, so the delete is still news to sync. A repeat delete moves `deletedAt` forward.
- `dump`/`restore` and the world file don't carry tombstones: a world file is what the world holds. `restore` does clear the tombstones of the keys it writes.
- Tombstones are never pruned. Retention belongs with the sync protocol (`worldcrafter-ji5d`).
- `docs/rebuild/story-model.md` now says story-record deletes leave tombstones (schema version 4).
