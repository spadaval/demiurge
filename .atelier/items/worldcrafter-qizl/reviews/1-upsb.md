---
schema: atelier.review
schema_version: 3
round: 1
commit: c903baae1486eb61bfb0c05682178437f58fffec
reviewers:
- 01a20660-c94c-7641-b18f-5f45693f46f0
model: grok-4.6
verdict: approve
created_at: 2026-11-23T03:09:05.286652793Z
---

## Summary

- Complexity: medium. Dump and restore join the storage contract, a versioned world file checks every collection's storage shape, and the three projections share one block walk; several owners, no new runtime subsystem.
- Value: high. Exact whole-world round-trip is Boundary 3's import path, and `addressable` is what AI edits (worldcrafter-yx9v) will target.
- Risk of merging it: low. There is no UI yet. Import parses then writes once into an empty store, a bad file writes nothing, and both adapters keep snapshot IDs and times.

The value warrants the change. The dump-then-restore empty check is two steps, as the Report says; a single-writer tab and the command queue make a write between them unlikely, and a new `StorageError` for an atomic check is more than this item needs.

Reviewed the three implementation commits (`3b4013d`, `3b1b48e`, `efdfef9`) and `git diff master...c903baae1486eb61bfb0c05682178437f58fffec` against every Done when line and the Report.

**World file.** `COLLECTION_NAMES` drives `WorldRecords`. `dump` and `restore` exist on memory, IndexedDB and connected storage (read-only tabs refuse `restore`). IndexedDB `dump` reads every store plus snapshot content in one readonly transaction; `restore` writes them in one readwrite transaction, snapshots by explicit key so later saves get higher IDs. `parseWorldFile` checks format, version 1, exact record fields, snapshot IDs and reasons, outline nesting, and duplicate keys, and leaves JSON payloads to their owners. `importWorld` refuses a store that already has records and does not call `restore`. The fixture fills all eight collections, including every `STORY_RECORD_KINDS` kind, a batch snapshot, a periodic snapshot, and a snapshot of a deleted document; after import, `dump` matches and a re-export is the same bytes. Contract tests cover empty dump, restore identity, post-restore snapshot IDs, and a failed restore writing nothing.

**Projections.** `projectAddressable` prefixes every text block and placeholder with its ID, keeps empty blocks and hrs, and inlines AI-segment children with no line for the segment. `walkBlocks` is shared; existing prose and plain fixture output is unchanged. The coverage table visits every `BLOCK_TYPES` value plus `ai_segment`, `placeholder`, `a`, both list styles, both AI statuses, and every mark. Generated-tree map checks now cover `addressable`.

**Readable markdown.** `exportReadableMarkdown` is one-way CommonMark plus GFM strikethrough: no IDs, directives, placeholders or empty blocks. `exportMarkdown` / `parseMarkdown` are still the ID-carrying format; their fixture and 500 generated-tree round-trips still pass. Nothing in the product imports through `markdown.ts`: generation uses `generated-text.ts`, and the story CLI reads `scenes/<id>.md` as a path only. `docs/rebuild/data-model-boundaries.md` names the readable export and the world file.

**Checks run here.** `cd app && bun run check`: tsc clean; biome 3 warnings already on master (`isYear`, `stepAt`, `listLine` in `scripts/story.ts`); 1269 pass, 0 fail.

**Not checked.** Real-browser IndexedDB (tests use `fake-indexeddb`). Rendering of `exportReadableMarkdown` in a CommonMark viewer. A UI calling `importWorld` (out of scope). Connected-storage dump/restore beyond reading the wrapper; the read-only write table in `connected-storage.test.ts` was not extended for `restore`.

## Finding 1: IndexedDB dump and both restores can omit a new collection without a type error
Recommendation: defer
Taken: worldcrafter-a8v5 by mcp:fc568ec9-7676-4101-b8d0-b66d173f335e
`COLLECTION_NAMES` is meant to make a new collection fail the type check until dump, restore and the world file handle it (`app/src/storage/types.ts` lines 17–20, and the Report). That holds for memory `dump` (`satisfies WorldRecords` in `app/src/storage/memory.ts`) and for `COLLECTIONS` in `app/src/storage/world-file.ts`. It does not hold for IndexedDB `dump`, which builds the keyed collections then asserts `as Omit<WorldRecords, "snapshots">` (`app/src/storage/indexeddb.ts` around lines 424–432), so a missing field still type-checks. Memory and IndexedDB `restore` each list stores by hand and never mention `COLLECTION_NAMES`, so they can skip a new keyed collection with no error. Today's eight collections are all wired and the round-trip tests would throw if a name were missing at runtime. When a ninth collection is added, drive IndexedDB dump off `COLLECTION_NAMES` with `satisfies WorldRecords` on the value actually returned, and have both restores put every keyed collection from that list (snapshots stay split).
