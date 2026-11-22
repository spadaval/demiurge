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

Persist the battle-tested story bible (`app/src/story/`) inside `StorageAdapter` (memory and IndexedDB) and link each story `Scene` record to a Plate `Document` prose tree, unifying the split between `app/src/story/` and the older `app/src/world/` + `app/src/outline/` stores.

## Done when

- [ ] `StorageAdapter` (`app/src/storage/`) stores story bible collections (actors, drives, events, causes, facts, objects, counts, memberships, versions, knowledge, open questions, reader questions, scenes, deliberate gaps) with contract tests passing on both memory and IndexedDB adapters.
- [ ] Each `Scene` record links cleanly to its Plate `Document` prose record, and scene ordering in the story bible drives the manuscript view without duplicating outline state.
- [ ] Existing `story.json` files (such as Round 5's `story.json`) import cleanly into the unified store and export back identically.
- [ ] `bun run check` passes in `app/`.

## Scope

In: `app/src/storage/`, `app/src/story/`, `app/src/workspace/`, and migration/cleanup of overlapping `app/src/world/` and `app/src/outline/` wiring.
Out: Sync tombstones (`worldcrafter-4t98`), UI views (`worldcrafter-mtkn`), and full relativistic frame UI (`app/src/time/` stays modular).
