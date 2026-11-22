---
schema: atelier.review
schema_version: 3
round: 2
commit: 3711b625e4d48dddb1f77c75dbb0b5c6d1b4404b
reviewers:
- 01a2057a-af67-70c2-ae99-a47fbad2832e
model: grok-4.6
verdict: changes
created_at: 2026-11-22T22:57:46.824843250Z
---

## Summary

Complexity: high. The mission still adds a persisted bible, a tool registry, multi-turn LLM transport, and an agent runner, now beside the live `world/` + `outline/` + `time/` stores rather than in place of them.

Value: high. The 2026-11-22 direction needs a typed store and an app-owned agent; those gaps are still real.

Risk of merging it: medium. Coexistence plus "existing tests continue passing" makes a silent retirement of live stores much less likely. The remaining hole is a whole-world export that can pass its item checks and still drop the collections the current app uses.

Checked the plan diff `bffb481..3711b62` on the four rewritten files, then the current mission and all five items. Checked each carried finding against the code those findings name: `app/src/story/story.ts` (`Scene`, `Story`), `commands.ts`, `app/scripts/story.ts` (`READS`, `proseFile`), `app/src/storage/types.ts` (`CollectionName`), `app/src/time/timeline.ts` (`Timeline`, `sceneEventId`), `app/src/world/kinds.ts`, `app/src/content/projections.ts` (`projectProse` / `projectPlain`, no `addressable`), `app/src/storage/contract.ts`, and that no `story.json` exists in the tree. Did not run `bun run check`; this is a plan review. Did not read `worldcrafter-mtkn` / `worldcrafter-3z9j` beyond the names this plan uses.

Round 1's storage split, query extraction, fixture line, IndexedDB wording, and qizl rewrite hold. One export-contract gap from 1-co84.2 is still open: qizl's Done when does not name the live adapter collections the mission says must round-trip.

## Finding 1: The plan doesn't say which model wins where `app/src/story/` and `app/src/world/` + `app/src/time/` disagree, and that is a core-primitive call
Recommendation: fix now
Was: 1-at22.1
Now: fixed
The unification rule now names `app/src/story/` as the canonical bible schema, keeps `world/` / `outline/` / `time/` intact for this mission, and puts `documentId` plus optional `book`/`chapter` on `Scene` in the mission text for agree. Replacement is out of scope. That is a mapping for this mission; later UI migration can settle the rest.

## Finding 2: The queries the tool registry wraps are in `app/scripts/story.ts`, not `app/src/story/commands.ts`, and they read prose files from disk
Recommendation: fix now
Was: 1-at22.2
Now: fixed
Mission success criteria and `worldcrafter-7r87` now extract `show`, `reader-order --before`, `span`, `touches`, `trace`, `contradictions`, and `gaps` from `app/scripts/story.ts`, send `trace` through `StorageAdapter` + `prose`, and keep the CLI by delegation without regressions in `app/scripts/story.test.ts`.

## Finding 3: Retiring `app/src/world/` and `app/src/outline/` breaks `app/src/time/` and `app/src/context/`, and `worldcrafter-lgz8` holds both the new store and the retirement
Recommendation: fix now
Was: 1-at22.3
Now: fixed
Retirement is in mission Out and in `worldcrafter-lgz8` Out. lgz8 Done when requires existing `world/`, `outline/`, `time/`, and `app/` tests to keep passing.

## Finding 4: The fixture `worldcrafter-lgz8` names isn't in the repository
Recommendation: fix now
Was: 1-at22.4
Now: fixed
The unmeetable Round 5 `story.json` line is gone. lgz8 now requires a committed fixture covering every story record kind and linked scene documents. Confirmed there is still no `story.json` in the tree; the implementer adds the fixture as part of the item.

## Finding 5: `worldcrafter-qizl` was moved into this mission without being rewritten for it
Recommendation: fix now
Was: 1-at22.5
Now: fixed
qizl Goal, Done when, and Scope now target the unified adapter, split the checkboxes, and keep existing prose import. Whole-world JSON sits on qizl; lgz8 no longer claims `story.json` export.

## Finding 6: "No browser-only APIs inside the store" contradicts an IndexedDB store
Recommendation: fix now
Was: 1-at22.6
Now: fixed
The success criterion now isolates IndexedDB behind `StorageAdapter` and requires the domain, tools, and runner to stay DOM-free, tested with the memory adapter.

## Finding 7: qizl still specifies the old 3otd S1, not this mission's store
Recommendation: fix now
Was: 1-co84.1
Now: fixed
qizl no longer proves 3otd S1. It round-trips the unified store after lgz8 and keeps projection coverage in this item. Blocking projections on lgz8 is sequencing, not a defect, now that 3otd is dropped.

## Finding 8: lgz8 and qizl both own JSON round-trip, and the public export is unspecified
Recommendation: fix now
Was: 1-co84.2
Now: kept
Dual ownership is gone: lgz8 dropped the `story.json` round-trip, qizl owns versioned whole-world JSON. The contract still does not name the records.

`CollectionName` today is `documents`, `worldEntries`, `annotations`, `requests`, `snapshots`, `outlines`, `timelines` (`app/src/storage/types.ts:17-24`). Mission success criteria and qizl's Goal require "active legacy collections". qizl Done when (`.atelier/items/worldcrafter-qizl/item.md` line 26) only lists documents, annotations, stored requests, and story-bible collections.

An implementer who ticks that line can omit `worldEntries`, `outlines`, `timelines`, and `snapshots`. During this mission those collections are still the live app. Export then import would drop outline structure, world facts, S10 time, and snapshot history while the item looks done.

Name the collections in qizl Done when so they match the mission: the seven current adapter collections, plus the bible lgz8 adds. If snapshots are excluded, say so on the item, not as "active legacy collections".

## Finding 9: lgz8 requires the manuscript view to follow story order while UI is out of scope
Recommendation: fix now
Was: 1-co84.3
Now: fixed
The manuscript-view Done when line is gone. lgz8 is data-layer persistence and `documentId` linkage. UI stays in `worldcrafter-mtkn`. Outlines are not dropped this mission, so stored book/chapter titles remain.

## Finding 10: lgz8's collection list does not match the story graph or the time store
Recommendation: fix now
Was: 1-co84.4
Now: fixed
lgz8 now requires the complete `Story` (premise, participants, candidates, drive turns/relations, and the rest). Coexistence plus "existing `time/` tests pass" keeps `timelines` as S10's store; story events live on the bible. Persistence layout stays an Authority call.

## Finding 11: replacing `world/` is unspecified for kinds that have no story primitive
Recommendation: fix now
Was: 1-co84.5
Now: fixed
The unification rule keeps non-actor kinds on world facts and `worldEntries` until UI migration. `world/` is not retired here, so generation can keep `WorldStore`.

## Finding 12: 7r87 points at queries that are not in `commands.ts`
Recommendation: fix now
Was: 1-co84.6
Now: fixed
Same rewrite as Finding 2. The named reads, including `reader-order --before` for 667u, move into `app/src/story/`; mutations stay in `commands.ts`; the CLI delegates.

## Finding 13: 7r87 binds `trace` to `StorageAdapter` while the CLI must keep reading scene files
Recommendation: defer
`worldcrafter-7r87` Done when requires `trace` to read prose through `StorageAdapter` + `prose`, and also requires `app/scripts/story.ts` to delegate without regressions in `app/scripts/story.test.ts`. The CLI still loads `scenes/*.md` via `proseFile` (`app/scripts/story.ts:2013`, `2890`). Authority covers a prose-source port (Plate documents in the app, files in the CLI). Say that on the item when it starts so the two Done when lines are one design.
