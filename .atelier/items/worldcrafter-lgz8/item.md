---
schema: atelier.item
schema_version: 3
id: worldcrafter-lgz8
title: Persist unified story bible in StorageAdapter and link scenes to Plate documents
status: open
mission: worldcrafter-r7vd
labels:
- storage
- story-model
priority: high
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T22:39:00.214104451Z
---

## Goal

Persist the full `app/src/story/` bible inside `StorageAdapter` (memory and IndexedDB) and link each story `Scene` record to a Plate `Document` prose record via `documentId` (with optional `book`/`chapter` grouping), without breaking existing `app/src/world/`, `app/src/outline/`, or `app/src/time/` consumers.

## Done when

- [ ] `StorageAdapter` (`app/src/storage/`) persists the complete `Story` bible (premise, actors, drives + turns + relations, events + causes + participants, timeline `positions`, `constraints`, and frames, facts, objects, counts, memberships, versions, knowledge, open questions + candidates, reader questions, scenes with `documentId` and optional `book`/`chapter`, deliberate gaps), with sync-compatible string keys and `updatedAt` timestamps.
- [ ] Storage contract tests (`app/src/storage/contract.ts`) pass on both memory and IndexedDB adapters, including upgrading an IndexedDB database from the previous `DB_VERSION` without losing existing records.
- [ ] A committed fixture story (covering all story record kinds and linked scene Plate documents) saves, reloads, and links cleanly to its scene prose documents.
- [ ] `docs/rebuild/story-model.md` (Records section) is updated to reflect the unified `Scene` record (`documentId`, optional `book`/`chapter`) and `StorageAdapter` persistence.
- [ ] Existing `app/src/world/`, `app/src/outline/`, `app/src/time/`, and `app/src/app/` tests continue passing unchanged; `cd app && bun run check` passes.

## Scope

In: `app/src/storage/`, `app/src/story/` store persistence, and scene-to-document linkage.
Out: Whole-world JSON export/import (`worldcrafter-qizl`), retiring `app/src/world/` or `app/src/outline/` (waits for UI migration in `worldcrafter-mtkn`/`3z9j`), sync tombstones (`worldcrafter-4t98`), and UI views (`worldcrafter-mtkn`).
