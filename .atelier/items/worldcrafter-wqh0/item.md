---
schema: atelier.item
schema_version: 3
id: worldcrafter-wqh0
title: Bible inspector views in Night Edition rail (Cast, Drives, Open Questions, Timeline, Counts, Reader-Order, Contradictions)
status: open
mission: worldcrafter-mtkn
labels:
- ui
- night-edition
priority: high
blocked_by:
- worldcrafter-if6h
- worldcrafter-lgz8
- worldcrafter-7r87
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T22:39:02.027110174Z
---

## Goal

Build the Night Edition rail and inspector views over the unified story bible so the writer can browse and cross-navigate Cast & Drives (including origins, relations, turns, memberships), Open Questions (candidates, rejected reasons, superseded history, `left-open`), Timeline & Counts, Reader-Order vs. Story-Order, and Contradictions.

## Done when

- [ ] Night Edition `World` view exposes dedicated inspector views for Cast/Drives, Open Questions, Timeline/Counts, Reader-Order, and Contradictions backed by the unified story store (`worldcrafter-lgz8`, `worldcrafter-7r87`).
- [ ] Clicking any record opens its detail view with incoming/outgoing `touches` links and lets the writer jump across connected scenes, events, actors, and questions.
- [ ] Follows the amended `DESIGN.md` (`worldcrafter-if6h`) typography, tonal steps, hairlines, and responsive drawer rules.
- [ ] Component tests cover rendering and cross-navigation on a committed fixture story; `cd app && bun run check` passes.

## Scope

In: Read-only bible inspector views and cross-navigation in `app/src/app/`.
Out: Direct-manipulation editing forms (`worldcrafter-o7to`) and talk-page conversation UI (`worldcrafter-lhh3`, `worldcrafter-rxvy`).
