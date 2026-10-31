---
created_at: "2026-10-31T02:17:08.925424749+00:00"
id: "worldcrafter-33qr"
issue_type: "task"
labels:
- "story-model"
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-cly1"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "See what a candidate or a change touches, and what the story lacks"
updated_at: "2026-10-31T02:17:08.925424749+00:00"
---

## Goal

From anything in a story, an agent or person can see what's connected to it, what would be connected if a candidate answer were taken, what's missing, and where the story conflicts. These reports inform and never block.

## Done when

- A pure `whatThisTouches(story, ref)` in `app/src/story/` returns, grouped by kind, the subject's direct links in both directions: a drive's actor, origins and relations, pressures, scene actors, `depicts`, constraints between events, a fact's `about`, a reader question's scenes, and open questions and candidates that refer to it. It goes one step further where a change plainly carries: from a drive, the scenes its actor is in; from a scene, the drives of its actors; from an event, the scenes pressured by the drives it created. It skips dangling references.
- `whatThisTouches` works on a candidate answer: the connections it declares in `touches`, and one step on from each as above. A test checks the step past `touches` reaches records the candidate doesn't name.
- A scenario test over a fixture based on the Ninefold walkthrough (worldcrafter-o8b7, Background) checks the lists for changing a drive and changing its origin. It fails if 2.1 isn't reached through its actors, the drive isn't reached from 2.1, 3.2 isn't reached through `depicts`, or 4.2 isn't reached from `seal` through the drive. The fixture gives one character two opposed drives, and the test checks each lists the other.
- `storyGaps(story)` lists: a person with no drive; a drive with no actor; a drive with no origin; a drive nothing opposes; a scene with no drive under pressure; a drive that pressures no scene; an event nothing refers to; a fact nothing refers to; a story with scenes and no reader question; a reader question that never opens or is never answered; an unanswered open question with no candidates or one candidate. Each is shown by a planted case in a test, and a test shows a story with a premise and nothing else returns without error.
- `storyContradictions(story)` returns the timeline's problems (`timelineProblems`) and the unanswered open questions marked as conflicts, shown by a test that keeps a conflicting move, and one that answers a conflict and sees it leave the list.
- `bun run check` passes.

## Scope

No scoring or ranking of candidates: how much a candidate touches is for people and agents to weigh. Report wording says what isn't woven in yet and doesn't read as an error.

## Context

Records and commands from worldcrafter-8tbh and worldcrafter-cly1. Gaps are a first guess (strategy, Risks), so keep the list easy to change.
