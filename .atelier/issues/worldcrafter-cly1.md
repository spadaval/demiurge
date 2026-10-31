---
created_at: "2026-10-29T22:22:30.604851359+00:00"
id: "worldcrafter-cly1"
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
    id: "worldcrafter-8tbh"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Commands for everything in a story file"
updated_at: "2026-10-31T02:17:08.908015201+00:00"
---

## Goal

Every change to a story is a typed command that holds what it's told, so an agent, a person at the CLI, tests and any later UI use the same path, and a contradiction can be recorded and kept.

## Done when

- `app/src/story/commands.ts` exports a `StoryCommand` union and a pure `applyStoryCommand(story, command)` returning `Result<{ story: Story; problems: TimelineProblem[] }, StoryError>`, where `problems` is what the command added.
- Tests call each command directly and cover each error: an unknown ID in a command's target or in any link it sets (so `touches`, `about` and the like can't point at something that doesn't exist yet; add it first, unconnected if need be), a duplicate ID, a drive related to itself, and a relation that already exists in either direction.
- Two drives of one actor can oppose or compete, shown by a test: a character pulled two ways is ordinary.
- Removing a record removes references to it from every other record, shown by a test for each kind. A candidate's `touches` is treated the same way. Removing an actor sets their drives' `actorId` to null and keeps the drives. Removing a candidate clears `answer` if it was the chosen one.
- Timeline commands go through a new `applyTimelineCommandKeepingProblems` in `app/src/time/commands.ts`, which returns the new timeline and every problem the command added, and refuses only malformed commands. A test moves an event so that it conflicts with another event's `before` constraint (an empty scene list means scenes have no time here) and shows that the move is kept and the problem returned. `applyTimelineCommand`, its callers and the `TimelineCommand` union don't change; worldcrafter-js5y moves them over later, and may change how `removeEvent` works in the app.
- Answering an open question records the chosen candidate and can be undone. Recording it doesn't change any other record: the agent makes those changes as its own commands, and a test shows this.
- `bun run check` passes.

## Scope

Commands: set the premise; add, update and remove actors, drives, facts, reader questions, scenes and open questions; move a scene in the telling order; set where a reader question opens and is answered; set a drive's origins; relate and unrelate two drives; set a scene's actors, depicted events and pressures; add, update and remove candidates; answer and unanswer an open question; add, describe and remove events (these three live in `story/commands.ts`, on the `Story`'s timeline); set an event's position; add and remove constraints between events. Removing an event removes its positions and constraints too, since git holds the history. Scene events and the outline aren't used here, so timeline calls pass an empty scene list.

## Context

Records from worldcrafter-8tbh. `app/src/time/commands.ts` (`TimelineCommand`, `timelineProblems`). Note for later, from review of spike worldcrafter-4vxp: once scenes are documents, deleting one orphans its `passage-anchors:<documentId>` annotation, and whoever does that delete has to remove it (worldcrafter-jd8b).

## Notes

- 2026-10-30 [note] Deferred from review of spike worldcrafter-4vxp: removeScene, or deleting a document, orphans the document's passage_anchors annotation (ID passage-anchors:<documentId>, added by worldcrafter-jd8b), because storage requires callers to delete annotations themselves. Delete it where the scene or document is deleted, once jd8b exists.
