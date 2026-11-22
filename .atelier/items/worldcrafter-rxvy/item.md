---
schema: atelier.item
schema_version: 3
id: worldcrafter-rxvy
title: 'Anchored conversation: open a scoped talk topic from any scene, passage, or bible record'
status: open
mission: worldcrafter-mtkn
labels:
- ui
- talk
priority: medium
blocked_by:
- worldcrafter-lhh3
- worldcrafter-wqh0
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T22:39:02.266393429Z
---

## Goal

Let the writer launch or jump into a scoped talk-page conversation anchored to any scene, selected prose passage, or bible record (actor, drive, event, open question, count, contradiction) so the agent automatically receives that target's deterministic context packet.

## Done when

- [ ] From any scene, selected passage, or bible inspector record, one action opens (or focuses) a talk topic anchored to that target.
- [ ] The anchored topic preloads the target record/passage plus its `touches` neighborhood (and `reader-order --before` for scenes) into the Story Agent Runner's context packet.
- [ ] Open topics are surfaced unobtrusively on the record/scene and aggregated in the world inbox (`worldcrafter-lhh3`).
- [ ] Component tests cover opening an anchored topic from both a scene and a bible record; `bun run check` passes.

## Scope

In: Anchored topic triggers, context preloading, and cross-links between inspector views, scene view, and talk pages (`worldcrafter-lhh3`).
Out: Global unanchored chat (explicitly out of scope per `docs/rebuild/talk-pages.md`).
