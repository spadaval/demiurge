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
    id: "worldcrafter-04z5"
  - kind: "issue"
    id: "worldcrafter-33qr"
  - kind: "issue"
    id: "worldcrafter-8tbh"
  - kind: "issue"
    id: "worldcrafter-cly1"
  - kind: "issue"
    id: "worldcrafter-i2uz"
  - kind: "issue"
    id: "worldcrafter-p4zf"
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
title: "Sketch a story from a premise and rework it, headless"
updated_at: "2026-10-31T02:17:09.165393070+00:00"
---

## Goal

An agent in an ordinary session, using a CLI and a skill, can take a one-paragraph premise to a sketch of a story: elements that aren't woven in yet, open questions with candidate answers, and contradictions it hasn't resolved. It can try a candidate, see what it touches and what the story lacks, and rework a motivation or an event behind one. This is the mission's biggest bet: that the model makes a team better at finding a great story than the same team with plain notes.

## Done when

- Delivers `sketch` and the change-a-drive, change-its-origin and shift-an-event parts of `rework`, headless. Each child's proof passes, and the increment is independently reviewed.
- The human has read the blind comparison and recorded keep, change or drop (worldcrafter-i2uz). Agents can't pass that item.

## Unknowns

- Whether the model beats plain notes at all. An agent can list open questions in markdown too.
- Whether seeing what a candidate or a change touches helps, given that it can't reach what free text only mentions.
- Whether the first gap reports are what a story needs to be interesting.
- Whether a chain of events ("because") is missed. Events have only before and after.
- Whether a second drive is an acceptable way to record a changed motivation.
- Whether actors, drives, events, scenes and open questions can hold what a sketch throws up, or something needs its own type. The agent's log of what the model couldn't hold answers this.

## Background

- Strategy: `docs/strategies/structure-first.md`. Model: `docs/rebuild/story-model.md`. Direction: decision worldcrafter-2y4g. This replaces the app-first plan for this increment; `worldcrafter-iaoc` and `worldcrafter-eg96` moved to worldcrafter-frqk.
- Keep specification light: field names may change as the work teaches something.

Paper walkthrough, 2026-10-30, on the demo world (`app/src/demo/ninefold.ts`), with hand-invented drives. It's the author's reasoning, not a test with a writer. Ardelia's drive: keep the Salt Gate shut; origin event `seal`; pressures 4.2 and 5.1.

- **Change the motivation (shut to open).** Links reach 4.2 and 5.1 and related drives. They miss scene 2.1, "Ardelia", which shows her without any drive under pressure. So a scene needs to record its actors. "She wanted it shut in 902 and wants it open in 1203" works as two drives with different origins, so time-indexed drives aren't needed yet.
- **Change the event behind it (she sealed it on Aldric's order).** Needs an event summary and a link from a drive to its origin events. From `seal` the links then reach the drive and its scenes, and 3.2 through `depicts`. Before and after can't say that one event caused another.
- **Shift the event (902 to 1100).** The same links reach the drive and 3.2. The engine refuses the shift (`contradiction`), because 3.2 has its own position; this was run. The Salt Gate entry's "sealed in 902" and Kesh's "three hundred years" are out of reach as free text. That is the limit of this approach.
