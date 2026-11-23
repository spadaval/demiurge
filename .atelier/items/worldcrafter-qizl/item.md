---
schema: atelier.item
schema_version: 3
id: worldcrafter-qizl
title: World export and import as JSON, and projection coverage for every node type (revised S1)
status: building
mission: worldcrafter-r7vd
labels:
- rebuild
priority: medium
blocked_by:
- worldcrafter-lgz8
implementers:
- thread:delegated-task:command%3Amcp%3A51564328-ab55-47e2-a228-a246e1757d43%3Adelegate-task%3A266c620d-8d9d-4bd1-bc80-d2876333ff7b
ready: null
trivial: null
caused_by: null
created_at: 2026-10-19T15:20:30.115899083Z
---

## Goal

Implement lossless whole-world JSON export and import over the unified `StorageAdapter` covering every collection (`documents`, `worldEntries`, `annotations`, `requests`, `snapshots`, `outlines`, `timelines`, plus all story-bible collections added in `worldcrafter-lgz8`), and ensure every allowed content node type has tested `prose`, `addressable`, and `plain+map` projections (`worldcrafter-7hjn`).

## Done when

- [ ] Whole-world JSON export and import (with explicit schema version) round-trip a fixture world that populates **every** `StorageAdapter` collection (`documents`, `worldEntries`, `annotations`, `requests`, `snapshots`, `outlines`, `timelines`, and all story-bible collections from `worldcrafter-lgz8`) into an empty store with identical records.
- [ ] `prose`, `addressable`, and `plain+map` projections are implemented and tested for every allowed node type in `app/src/content/schema.ts`.
- [ ] `app/src/content/markdown.ts` provides a clean one-way readable markdown export without breaking any existing prose import path.
- [ ] `cd app && bun run check` passes.

## Scope

In: Versioned whole-world JSON export/import adapter over `StorageAdapter`, `addressable` + `prose` + `plain+map` projection coverage tests, and clarifying `app/src/content/markdown.ts` as one-way readable export.
Out: Persisting story-bible collections (`worldcrafter-lgz8`), sync tombstones (`worldcrafter-4t98`), and UI export dialogs.

## Links

Relationships of the old record that the new format has no field for.

- derived_from: worldcrafter-7hjn (Content schema: lossless via markdown, or via JSON with a one-way readable export)
