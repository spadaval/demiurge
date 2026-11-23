---
schema: atelier.item
schema_version: 3
id: worldcrafter-qizl
title: World export and import as JSON, and projection coverage for every node type (revised S1)
status: approved
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

- [x] Whole-world JSON export and import (with explicit schema version) round-trip a fixture world that populates **every** `StorageAdapter` collection (`documents`, `worldEntries`, `annotations`, `requests`, `snapshots`, `outlines`, `timelines`, and all story-bible collections from `worldcrafter-lgz8`) into an empty store with identical records.
- [x] `prose`, `addressable`, and `plain+map` projections are implemented and tested for every allowed node type in `app/src/content/schema.ts`.
- [x] `app/src/content/markdown.ts` provides a clean one-way readable markdown export without breaking any existing prose import path.
- [x] `cd app && bun run check` passes.

## Scope

In: Versioned whole-world JSON export/import adapter over `StorageAdapter`, `addressable` + `prose` + `plain+map` projection coverage tests, and clarifying `app/src/content/markdown.ts` as one-way readable export.
Out: Persisting story-bible collections (`worldcrafter-lgz8`), sync tombstones (`worldcrafter-4t98`), and UI export dialogs.

## Links

Relationships of the old record that the new format has no field for.

- derived_from: worldcrafter-7hjn (Content schema: lossless via markdown, or via JSON with a one-way readable export)

## Report

A whole world now exports to one versioned JSON file and imports into an empty store with every record identical, and the AI edit work (worldcrafter-yx9v) has the `addressable` projection it needs. Three commits, one per Done-when line.

**World file** (`3b4013d`). `StorageAdapter` gains `dump()` and `restore(records)` (`app/src/storage/types.ts`), implemented for memory, IndexedDB and `connected-storage.ts` (where `restore` is refused in a read-only tab). `dump` reads every store in one readonly IndexedDB transaction, so the export is consistent. `restore` writes everything in one readwrite transaction, so it is all or nothing. Snapshots keep their IDs and `createdAt`, and later saves get higher IDs because an explicit key moves IndexedDB's key generator. The old API could do neither: snapshots could only be listed per document, so snapshots of deleted documents were unreachable, and their IDs and times were always assigned by the store. `WorldRecords` is a mapped type over the new `COLLECTION_NAMES`, so adding a collection fails the type check until dump, restore and the file handle it.

`app/src/storage/world-file.ts` wraps these as `{format: "demiurge-world", version: 1, records}`, with `exportWorld`, `importWorld` and `parseWorldFile`. On import it checks each record's storage shape: exact fields and their types, snapshot IDs and reasons, outline structure, and no duplicate keys. It leaves the JSON payloads (content, facts, story data, timelines) to the modules that own them, because stored documents and `repaired_on_load` snapshots may be outside the content schema on purpose. Import refuses a store that already has records (`store_not_empty`) and writes nothing.

Evidence: `world-file.test.ts` runs over memory and fake IndexedDB. A world fills all 8 collections: the lighthouse documents and full story bible (asserted to have every `STORY_RECORD_KINDS` kind), plus world entries, provenance, a request, an outline, a timeline, and snapshots saved alone, in a batch and for a deleted document. The test asserts that the target's `dump()` equals the source's and that re-exporting gives byte-identical JSON. Contract tests cover dump/restore for both adapters, including atomic failure and IDs after a restore.

**Projections** (`3b1b48e`). `projectAddressable` (`app/src/content/projections.ts`) writes one `[id] marker text` line per block. Empty blocks, hrs (an empty span after `* * *`) and placeholders (marked `(placeholder)`) are all addressable. AI segments have no line of their own; their children appear with their own IDs. The three projections now share one walk (`walkBlocks`) for list numbering, and the existing prose and plain outputs and tests are unchanged. A new table in `projections.test.ts` runs all three projections over each node type, list style, mark, link kind and AI segment status, checking text and source map. A coverage test compares the table against the schema's exported `BLOCK_TYPES`, `MARKS`, `LIST_STYLES` and `AI_SEGMENT_STATUSES`, so a new node type fails until it has a row. Generated-tree property tests now cover `addressable` too.

**Readable markdown** (`efdfef9`). `exportReadableMarkdown` in `app/src/content/markdown.ts` writes CommonMark plus GFM strikethrough. It drops IDs, directives, placeholders and empty blocks, nests lists by indentation and uses the editor's numbers. Escaping is limited to what a reader could misread, so dialogue lines starting with `"` and words like `snake_case` stay clean. Whitespace at the edges of marked spans moves outside the delimiters so emphasis renders. It has no parser. `exportMarkdown` and `parseMarkdown` (the ID-carrying format) are unchanged and their round-trip tests still pass. No product prose import path used `markdown.ts`: the story CLI reads `scenes/*.md` as plain text, and generation uses `generated-text.ts`. The header and `docs/rebuild/data-model-boundaries.md` now name the readable export and the world file. No markdown renderer is installed, so the tests pin exact output rather than rendering it; I did not add a dependency for that.

Decisions a reviewer may want to question:
- `importWorld` checks for an empty store with `dump()` before `restore`, as two steps. The command queue and the single-writer tab make a write between them unlikely. Making it atomic would need a new expected error in `StorageError`, which every exhaustive switch over it would have to handle.
- Placeholders are in `addressable` so a model can be asked to fill one. Whether an edit may target one is for the applier (worldcrafter-yx9v) to decide.
- No UI was added (out of scope).

`cd app && bun run check`: tsc and Biome clean, 1269 pass, 0 fail.

