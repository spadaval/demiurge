---
schema: atelier.item
schema_version: 3
id: worldcrafter-4t98
title: 'Sync-ready storage: tombstones for deletes'
status: building
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

- [ ] The storage contract test (`app/src/storage/contract.ts`), run against the memory and IndexedDB adapters, shows for every keyed collection except device-local snapshots: `delete` leaves a tombstone with `deletedAt`; `load` of a tombstoned key fails with `not_found`; `list` omits tombstones; `save` after a delete brings the record back.
- [ ] `annotations.listForDocument` omits tombstoned annotations, and a `batch` that saves a document or annotation after its delete brings it back.
- [ ] Listing tombstones returns each deleted key with its `deletedAt`, on both adapters and through `app/src/workspace/connected-storage.ts`.
- [ ] If tombstones bump `DB_VERSION` (after `worldcrafter-lgz8`'s migration), a test writes records into every collection at the previous version, upgrades it, and reads the same records back.
- [ ] A compile-time check over `StorageAdapter` collections requires every synced record type to have a string key and a change time (`updatedAt`, or `createdAt` for immutable stored requests).
- [ ] `cd app && bun run check` passes.

## Scope

- `app/src/storage/` (types, memory and IndexedDB adapters, contract tests) and `app/src/workspace/connected-storage.ts`.
- The adapter sets `deletedAt` from the clock when `delete` runs; `delete(key)` keeps its signature.
- Stored requests sync like other records (`createdAt` is their change time).
- Snapshots stay device-local (append-only local history, no tombstones).
- No sync network code (`worldcrafter-ji5d`).

## Context

- `StorageAdapter`, `Collection<T>`, `BatchWrite` and record types: `app/src/storage/types.ts`. `listForDocument` reads the `byDocument` index in `app/src/storage/indexeddb.ts`.
- Ordered after `worldcrafter-lgz8` so `DB_VERSION` bumps do not collide and tombstones cover the story-bible collections.
