---
schema: atelier.item
schema_version: 3
id: worldcrafter-a8v5
title: Storage dump and restore can miss a new collection without a type error
status: open
mission: null
labels: []
priority: low
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-23T04:13:38.426886029Z
---

## Goal

Taken from deferred finding worldcrafter-qizl/1-upsb.1, in .atelier/items/worldcrafter-qizl/reviews/1-upsb.md:

> Finding 1: IndexedDB dump and both restores can omit a new collection without a type error
> Recommendation: defer
> `COLLECTION_NAMES` is meant to make a new collection fail the type check until dump, restore and the world file handle it (`app/src/storage/types.ts` lines 17–20, and the Report). That holds for memory `dump` (`satisfies WorldRecords` in `app/src/storage/memory.ts`) and for `COLLECTIONS` in `app/src/storage/world-file.ts`. It does not hold for IndexedDB `dump`, which builds the keyed collections then asserts `as Omit<WorldRecords, "snapshots">` (`app/src/storage/indexeddb.ts` around lines 424–432), so a missing field still type-checks. Memory and IndexedDB `restore` each list stores by hand and never mention `COLLECTION_NAMES`, so they can skip a new keyed collection with no error. Today's eight collections are all wired and the round-trip tests would throw if a name were missing at runtime. When a ninth collection is added, drive IndexedDB dump off `COLLECTION_NAMES` with `satisfies WorldRecords` on the value actually returned, and have both restores put every keyed collection from that list (snapshots stay split).

## Done when

- [ ] `dump` and `restore` in the memory and IndexedDB adapters, and the world file, are driven from `COLLECTION_NAMES` (for example with `satisfies WorldRecords`), so adding a collection without handling it is a type error or a failing test.
- [ ] `cd app && bun run check` passes.

## Scope

In: `app/src/storage/`.
Out: making `importWorld`'s empty-store check atomic.
