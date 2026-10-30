---
created_at: "2026-10-30T22:02:01.217384506+00:00"
id: "worldcrafter-o8b7"
issue_type: "feature"
labels:
- "story-model"
priority: "P1"
relationships:
  blocks: []
  children:
  - kind: "issue"
    id: "worldcrafter-8tbh"
  - kind: "issue"
    id: "worldcrafter-cly1"
  - kind: "issue"
    id: "worldcrafter-eg96"
  - kind: "issue"
    id: "worldcrafter-i2uz"
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-ddha"
    type: "implements"
  - kind: "issue"
    id: "worldcrafter-z3w0"
    type: "supersedes"
  - kind: "issue"
    id: "worldcrafter-z9qs"
    type: "advances"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Change why a character acts, and see what it touches"
updated_at: "2026-10-30T22:02:01.388857840+00:00"
---

## Goal

On a real story, with no prose and no AI, a writer can change a character's motivation, or an event behind it, and see every scene, drive and fact connected to the change. They can jump from any of those to the next and keep working. This is the mission's biggest bet: that reworking in the abstract is worth having.

## Done when

- Delivers the change-a-drive and change-its-origin parts of `rework`; shifting an event is the next bet. Each child's proof passes, and the increment is independently reviewed.
- The writer has tried it on a real story and recorded keep, change or drop (the trial child). Agents can't pass that item.

## Unknowns

- Whether seeing what a change touches feels like reworking, given that it can't reach what free text only mentions.
- Whether a chain of events ("because") is missed. Events have only before and after.
- Whether a second drive is an acceptable way to record a changed motivation.
- How the focus view should look. Build it functional and consistent with the existing shell.

## Background

- Strategy: `docs/strategies/structure-first.md`. Model: `docs/rebuild/story-model.md`. Records: decision worldcrafter-ddha. Replaces worldcrafter-z3w0, which was sliced by technical layer.
- Pattern to follow: pure `apply…Command` functions with typed `neverthrow` errors plus a store that persists through the storage adapter (`outline/store.ts`, `time/store.ts`). Stored JSON is parsed back by the owning module.
- Keep specification light: field names and view layout may change as the slice teaches something.

Paper walkthrough, 2026-10-30, on the demo world (`app/src/demo/ninefold.ts`), with hand-invented drives. It's the author's reasoning, not a test with a writer. Ardelia's drive: keep the Salt Gate shut; origin event `seal`; pressures 4.2 and 5.1.

- **Change the motivation (shut to open).** Links reach 4.2 and 5.1 and related drives. They miss scene 2.1, "Ardelia", which shows her without any drive under pressure. So a scene needs to record its actors. "She wanted it shut in 902 and wants it open in 1203" works as two drives with different origins, so time-indexed drives aren't needed yet.
- **Change the event behind it (she sealed it on Aldric's order).** Needs an event summary, because an event is only a label today, and a link from a drive to its origin events. From `seal` the links then reach the drive and its scenes. They reach 3.2 only through its placement (`during seal`), so the walk must follow scene placements as well as `depicts`. The seeded demo has no fact changes or reveals, so those links went unexercised. Before and after can't say that the coronation caused the sealing.
- **Shift the event (902 to 1100).** The same links reach the drive and 3.2, whose own position then conflicts, which the engine reports. Nothing connects `seal` to the coronation, even though the prose ties them together. The Salt Gate entry's "sealed in 902" and Kesh's "three hundred years" are out of reach as free text. That is the limit of this approach.
