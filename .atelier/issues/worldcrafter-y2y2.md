---
created_at: "2026-10-30T22:02:01.285234289+00:00"
id: "worldcrafter-y2y2"
issue_type: "task"
labels:
- "story-model"
priority: "P2"
relationships:
  blocks: []
  children: []
  attachments: []
  relates: []
schema: "atelier.issue"
schema_version: 2
status: "backlog"
title: "Questions and beats: records and commands"
updated_at: "2026-10-30T22:02:01.285234289+00:00"
---

## Goal

Add the records the outline, weave grid and passages need, split out of worldcrafter-8tbh and worldcrafter-cly1 when those narrowed to what the first bet needs. `worldcrafter-wllv` and `worldcrafter-jd8b` also depend on it, so it survives if this increment is dropped: move it, don't drop it.

## Done when

Provisional: a `questions` keyed collection with `id`, `text`, `kind: "milieu" | "inquiry" | "character" | "event" | null` (optional, not required of the writer), `plannedPayoff: string | null`, `marks: { sceneId, type: "opens" | "progresses" | "answers", note }[]`, `authority`, `updatedAt`, and `beats: { id, summary }[]` on scene structures, loading empty for records saved earlier. Commands add, update and remove each, mark and unmark a question at a scene (whether or not the scene has a place in the outline), and removing a question removes its marks; reordering beats stays with worldcrafter-jd8b. Storage contract and command tests as for drives. `bun run check` passes.
