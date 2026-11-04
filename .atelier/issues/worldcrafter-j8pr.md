---
created_at: "2026-10-29T22:23:11.180847578+00:00"
id: "worldcrafter-j8pr"
issue_type: "feature"
labels:
- "story-model"
priority: "P2"
relationships:
  blocks: []
  children:
  - kind: "issue"
    id: "worldcrafter-jd8b"
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-i2uz"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-o8b7"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-z9qs"
    type: "advances"
schema: "atelier.issue"
schema_version: 2
status: "backlog"
title: "Attach and draft prose"
updated_at: "2026-10-30T22:02:17.682991261+00:00"
---

## Goal

Prose is written by hand or drafted from the structure, and is marked stale when the structure under it changes.

## Done when

Provisional: delivers `anchored-prose`. Drafting a beat assembles context from the actors' drives, the open questions and what the reader knows at that point, shown by scenario tests against a stub OpenAI-compatible server. Changing the structure under a passage marks it stale, and the writer can rewrite, redraft or keep each one. Includes passages and passage reordering (worldcrafter-jd8b, design from spike worldcrafter-4vxp), and anchoring blocks in a scene's document in the app. Re-plan worldcrafter-jd8b before starting, including scenes outside the outline. Ends with the judging panel's keep, change or drop (decision worldcrafter-zybl).

## Unknowns

- How the existing generation context (S4: document window, entity cards, pins) combines with structure context.
- What counts as a change that makes a passage stale (any edit to a beat, or only to its summary, drives and questions).
