---
created_at: "2026-10-29T22:22:47.090478783+00:00"
id: "worldcrafter-asip"
issue_type: "task"
labels:
- "story-model"
priority: "P2"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-8tbh"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-y2y2"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T05:35:47.022827298+00:00"
status: "superseded"
title: "Outline view: premise down to beats"
updated_at: "2026-11-05T05:35:47.022827298+00:00"
---

## Goal

A story can exist as a premise alone and grow into books, chapters, scenes and beats, and the outline view is derived from that structure, never stored as a document (`coarse-to-fine`).

## Done when

- The stored outline gains a `premise` and a `summary` on each book and chapter, with outline commands to set them. `loadOutline` fills in empty values for outlines saved before these fields existed, shown by a test that loads one.
- A pure function in `app/src/story/` derives the outline view: premise, then books, chapters, scenes (title and structure summary) and beats, each scene listing the questions marked and drives pressured there. Dangling references are skipped.
- Tests over one fixture story at three levels of detail (premise only; premise with chapters and scene summaries; full, with beats) check the derived view, including scenes with no prose.
- `bun run check` passes.

## Scope

Outline storage and commands in `app/src/outline/`, `StoredOutline` in `app/src/storage/types.ts` and the contract-test fixture that builds one, and the derivation in `app/src/story/`. No UI.

## Context

`app/src/outline/outline.ts` (`readingOrder`), `app/src/outline/store.ts` (`loadOutline` currently trusts the stored shape), `app/src/storage/types.ts` (`StoredOutline`).

## Close Reason

Obsolete: decision worldcrafter-03rp ended the typed-model bet after two blind comparisons favoured plain notes (worldcrafter-i2uz change, worldcrafter-iu6l drop). This was written for the typed model; what follows is mission worldcrafter-p3k7 (docs/strategies/notes-first.md). Evidence and history kept.
