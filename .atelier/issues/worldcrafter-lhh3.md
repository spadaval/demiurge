---
created_at: "2026-10-17T07:07:33.752391106+00:00"
id: "worldcrafter-lhh3"
issue_type: "feature"
labels:
- "ai"
- "talk"
priority: "P2"
relationships:
  blocks: []
  children: []
  attachments: []
  relates: []
schema: "atelier.issue"
schema_version: 2
status: "backlog"
title: "Talk pages and world inbox"
updated_at: "2026-11-05T05:44:18.479355020+00:00"
---

## Goal

Every document has a talk page, and so does the world. Threads have status. Model messages record the model
and the request ID. Messages can carry proposals (edit, fact, relation, record decision) that apply only
when accepted. Open threads started by the AI form the world inbox. This replaces the old global chat.

## Done when

Provisional: scenario tests for both scopes, attribution, and proposals applying only when accepted. Delivers S6.

## Design

`docs/rebuild/talk-pages.md`.

## Notes

- 2026-10-17 [note] From the 2ony story-time review (2026-10-17): (R6) when a scene leaves the outline, fact changes anchored to its event and reveals it made only show up as unknown_event reasons per query; load() does not report them. Surface them (and reveals whose fact or change no longer exists) as problems in the world inbox. (R7) reordering the outline can create contradictions with explicit scene constraints that are only reported on load; surface those too.
- 2026-10-29 [note] Moved out of the rebuild mission (worldcrafter-3otd) on 2026-10-29: it was planned for a manuscript-first app. Re-plan it under the story model (decision worldcrafter-ok5a, docs/rebuild/story-model.md) before scheduling it.
- 2026-11-05 [note] 2026-11-05: correction to the 2026-10-29 note: decision worldcrafter-03rp ended the typed story model (decision worldcrafter-ok5a is superseded) and the Structure first mission (worldcrafter-z9qs). Don't re-plan this under docs/rebuild/story-model.md. It stays in the loose backlog, unlinked from that mission, and is re-planned only if the notes-first mission (worldcrafter-p3k7) shows the product needs an app.
