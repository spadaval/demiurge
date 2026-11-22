---
schema: atelier.item
schema_version: 3
id: worldcrafter-hqca
title: Wire Night Edition scene apparatus layers and gloss column to live story bible state
status: open
mission: worldcrafter-mtkn
labels:
- ui
- night-edition
- layers
priority: high
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T22:39:02.106023259Z
---

## Goal

Wire the Night Edition scene view's paint-only apparatus layers and lettered gloss column (`DESIGN.md`, `app/src/app/gloss.tsx`, `app/src/app/layers.ts`) to live computations from the unified story bible (`reader-order --before`, viewpoint dramatic-irony marks, opening counts, planted/paid-off objects, versions vs. truth, and time spans).

## Done when

- [ ] Opening a scene displays its live story-time stamp, opening count values, viewpoint dramatic-irony marks, planted/paid-off objects, and time spans in the Night Edition apparatus and gloss column.
- [ ] Toggling layers preserves the Paint-Only Rule (0 px prose reflow, verified by layer tests / measurement script).
- [ ] Updates reactively when the agent (or a command) mutates the story bible.
- [ ] Component and layer tests pass; `bun run check` passes in `app/`.

## Scope

In: `app/src/app/layers.ts`, `app/src/app/gloss.tsx`, `app/src/layers/`, and scene-view wiring to the unified story store.
Out: Heuristic/LLM entity discovery (`worldcrafter-8agg`) and prose Context Viewer wiring (`worldcrafter-aq1r`).
