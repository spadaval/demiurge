---
schema: atelier.item
schema_version: 3
id: worldcrafter-lgz8
title: Persist unified story bible in StorageAdapter and link scenes to Plate documents
status: building
mission: worldcrafter-r7vd
labels:
- storage
- story-model
priority: high
blocked_by: []
implementers:
- thread:delegated-task:command%3Amcp%3A51564328-ab55-47e2-a228-a246e1757d43%3Adelegate-task%3A69a5901c-65e1-4043-b24a-e566425a36f2
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T22:39:00.214104451Z
---

## Goal

Persist the full `app/src/story/` bible inside `StorageAdapter` (memory and IndexedDB) and link each story `Scene` record to a Plate `Document` prose record via `documentId` (with optional `book`/`chapter` grouping), without breaking existing `app/src/world/`, `app/src/outline/`, or `app/src/time/` consumers.

## Done when

- [ ] `StorageAdapter` (`app/src/storage/`) persists every field of `Story` (including the full `Story.timeline` `Timeline`: `events`, `positions`, `constraints`, `placements`, `frames`, `correspondences`, `follows`, `reveals`, `worldUnit`; plus premise, actors, drives + turns + relations, causes, participants, facts, objects, counts, memberships, versions, knowledge, open questions + candidates, reader questions, scenes with `documentId` and optional `book`/`chapter`, and deliberate gaps), with sync-compatible string keys and `updatedAt` timestamps.
- [ ] Storage contract tests (`app/src/storage/contract.ts`) pass on both memory and IndexedDB adapters, including upgrading an IndexedDB database from the previous `DB_VERSION` without losing existing records.
- [ ] A committed fixture story (covering all story record kinds and linked scene Plate documents) saves, reloads, and links cleanly to its scene prose documents.
- [ ] `docs/rebuild/story-model.md` (Effect on the plan and Records sections) is updated to reflect the unified `Scene` record (`documentId`, optional `book`/`chapter`) and `StorageAdapter` persistence.
- [ ] Existing `app/src/world/`, `app/src/outline/`, `app/src/time/`, and `app/src/app/` tests continue passing unchanged; `cd app && bun run check` passes.

## Scope

In: `app/src/storage/`, `app/src/story/` store persistence, and scene-to-document linkage.
Out: Whole-world JSON export/import (`worldcrafter-qizl`), retiring `app/src/world/` or `app/src/outline/` (waits for UI migration in `worldcrafter-mtkn`/`3z9j`), sync tombstones (`worldcrafter-4t98`), and UI views (`worldcrafter-mtkn`).
