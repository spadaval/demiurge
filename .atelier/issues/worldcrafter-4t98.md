---
created_at: "2026-10-29T22:22:09.827789464+00:00"
id: "worldcrafter-4t98"
issue_type: "task"
labels:
- "storage"
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-3otd"
    type: "advances"
schema: "atelier.issue"
schema_version: 2
status: "backlog"
title: "Sync-ready storage: tombstones for deletes"
updated_at: "2026-10-31T02:17:08.852873669+00:00"
---

## Goal

Make every synced collection ready for a later sync backend (S9, decision worldcrafter-gcox): deleting a record leaves a tombstone instead of removing it, so another device can learn of the delete. New story collections, when the app stores the story model, are built on this.

## Done when

- The storage contract test (`app/src/storage/contract.ts`), run against the memory and IndexedDB adapters, shows for every keyed collection except snapshots: `delete` leaves a tombstone with `deletedAt`; `load` of a tombstoned key fails with `not_found`; `list` omits tombstones; `save` after a delete brings the record back.
- The other read and write paths agree: `annotations.listForDocument` omits tombstoned annotations, and a `batch` that saves a document or annotation after its delete brings it back.
- Listing tombstones returns each deleted key with its `deletedAt`, on both adapters and through `app/src/workspace/connected-storage.ts`, the adapter the app actually uses.
- If tombstones change the IndexedDB schema (`DB_VERSION` goes up), a test writes records into every collection of a database at the old version, upgrades it, and reads the same records back.
- A compile-time check (a type over the `StorageAdapter` collections that fails `tsc` when broken) requires every synced record type to have a string key (`id`, or `documentId` for world entries) and a change time: `updatedAt`, or `createdAt` for stored requests.
- `bun run check` passes in `app/`. Evidence recorded against S9.

## Scope

- `app/src/storage/` (types, the memory and IndexedDB adapters, contract tests) and `app/src/workspace/connected-storage.ts`, which implements the same interfaces by hand.
- The adapter sets `deletedAt` from the clock when `delete` runs; `delete(key)` keeps its signature.
- Stored requests sync like other records. They never change and have client-generated IDs, so `createdAt` is their change time; AI segment provenance on other devices points at them.
- Snapshots stay device-local (auto-increment IDs, append-only local history) and get no tombstones. Say so in `types.ts`.
- Update the `DB_VERSION` comment in `indexeddb.ts`: the app has been deployed (worldcrafter-kvzy), so real databases may exist.
- No sync code. Callers keep their current behaviour.

## Context

- `StorageAdapter`, `Collection<T>`, `BatchWrite` and the record types: `app/src/storage/types.ts`. `listForDocument` reads the `byDocument` index in `app/src/storage/indexeddb.ts`.
- S9 in `docs/strategies/rebuild.md`. It was proven before the sync-ready wording was added, so it needs fresh evidence.

## Notes

- 2026-10-30 [note] 2026-10-30: deferred at Sumeet's direction (decision worldcrafter-2y4g). It prepares deletes for a later sync, and the headless first version has neither. Plan it again when the app's story storage is built or sync comes closer.
