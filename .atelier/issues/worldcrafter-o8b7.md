---
created_at: "2026-10-30T22:02:01.217384506+00:00"
id: "worldcrafter-o8b7"
issue_type: "feature"
labels:
- "story-model"
workflow_branch:
  branch_base: master
  work_branch: feature/worldcrafter-o8b7
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
closed_at: "2026-11-04T23:40:18.167022280+00:00"
status: "done"
title: "Sketch a story from a premise and rework it, headless"
updated_at: "2026-11-04T23:40:18.167022280+00:00"
---

## Goal

An agent in an ordinary session, using a CLI and a skill, can take a one-paragraph premise to a sketch of a story: elements that aren't woven in yet, open questions with candidate answers, and contradictions it hasn't resolved. It can try a candidate, see what it touches and what the story lacks, and rework a motivation or an event behind one. This is the mission's biggest bet: that the model makes a team better at finding a great story than the same team with plain notes.

## Done when

- Delivers `sketch` and the change-a-drive, change-its-origin and shift-an-event parts of `rework`, headless. Scenes have no place in story time here, so a shift can conflict with another event but not with a scene. Each child's proof passes, and the increment is independently reviewed.
- The blind comparison is ready for the judging panel to read (worldcrafter-04z5). Its keep, change or drop is worldcrafter-i2uz, a standalone validation decided by a panel of agent judges (decision worldcrafter-zybl), and the mission's next increment waits on it.

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
- Sumeet decided after the plan's review (2026-10-30): partial blinding is accepted; both arms get the same craft advice, so only the tool differs; rework is tested by two fresh-session reworks, one of them a timeline shift; and the first model also has facts, reader questions and scene order.

Paper walkthrough, 2026-10-30, on the demo world (`app/src/demo/ninefold.ts`), with hand-invented drives. It's the author's reasoning, not a test with a writer. Ardelia's drive: keep the Salt Gate shut; origin event `seal`; pressures 4.2 and 5.1.

- **Change the motivation (shut to open).** Links reach 4.2 and 5.1 and related drives. They miss scene 2.1, "Ardelia", which shows her without any drive under pressure. So a scene needs to record its actors. "She wanted it shut in 902 and wants it open in 1203" works as two drives with different origins, so time-indexed drives aren't needed yet.
- **Change the event behind it (she sealed it on Aldric's order).** Needs an event summary and a link from a drive to its origin events. From `seal` the links then reach the drive and its scenes, and 3.2 through `depicts`. Before and after can't say that one event caused another.
- **Shift the event (902 to 1100).** The same links reach the drive and 3.2. The engine refuses the shift (`contradiction`), because 3.2 has its own position; this was run. The Salt Gate entry's "sealed in 902" and Kesh's "three hundred years" are out of reach as free text. That is the limit of this approach.

## Notes

- 2026-11-04 [decision] The verdict worldcrafter-i2uz becomes a standalone validation blocked by this increment, and the backlog increments that waited on this increment also wait on the verdict
  Reason: As a child, i2uz (needs-human) kept the reviewed code off master until Sumeet reads the comparison. Reading the packets doesn't need the code unmerged. The verdict still gates what comes next. Reversible; Atelier suggested this shape.

## Close Reason

Delivered headless sketch and rework: story commands (cly1), touches/gaps/contradictions (33qr), CLI and story-sketch skill (p4zf), and the blind comparison, run and packeted (04z5: 8 runs, 0 failed, frozen at 33c2e626). Each child independently reviewed. The verdict is worldcrafter-i2uz, now decided by a judging panel of agents (decision worldcrafter-zybl) rather than Sumeet; it follows this increment and gates the next one.
