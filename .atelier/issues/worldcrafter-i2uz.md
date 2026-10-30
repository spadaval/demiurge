---
created_at: "2026-10-30T22:02:01.320936113+00:00"
id: "worldcrafter-i2uz"
issue_type: "validation"
labels:
- "needs-human"
- "story-model"
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-eg96"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-iaoc"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Trial: rework a real story's motivation"
updated_at: "2026-10-30T22:02:01.320936113+00:00"
---

## Goal

Find out whether reworking in the abstract is worth having, by the writer using it on a real story. Tests can't answer this.

## Done when

Sumeet has entered enough of a real story to matter, ideally a half-formed one, changed a motivation and an event behind one, and recorded in a note here: keep, change or drop, where they stalled, and what they missed (a chain of causes, questions, reaching what text only mentions, a way to see where the story contradicts itself). Any verdict closes this item, and "drop" is a useful result. The next increment is chosen from the verdict.

## Context

Agents don't start or pass this. They prepare the running app and say how to open it, at one address the writer keeps using: IndexedDB is per origin, so a story entered on `vite preview` won't appear on the deployed app.
