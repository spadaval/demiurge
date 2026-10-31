---
created_at: "2026-10-31T02:16:00.194906414+00:00"
id: "worldcrafter-2y4g"
issue_type: "decision"
labels:
- "story-model"
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-ddha"
    type: "related"
  - kind: "issue"
    id: "worldcrafter-ok5a"
    type: "related"
  - kind: "issue"
    id: "worldcrafter-z9qs"
    type: "advances"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-10-31T02:17:08.814723104+00:00"
status: "done"
title: "Headless first, for a team of a writer and an agent, with open questions as records"
updated_at: "2026-10-31T02:17:08.814723104+00:00"
---

## Question

What should the first version of the story model be, and who is it for? The plan built permanent storage, entry forms and a focus view before anyone could try the model, and treated the AI as out of bounds for the first trial.

## Options

- App first (`worldcrafter-o8b7` as planned): tombstones, collections, forms and a focus view, then a writer's trial. Tests the feel of it, but only after building all of it.
- Throwaway screen over one JSON file: cheaper, but most of the code is lost, and it still adds a UI unknown to the model unknown.
- Headless: a CLI and a skill over one file per story, used by an agent. The commands and queries carry over to a later UI, and the model is tested on its own. It can't test how a screen feels.

## Decision

Decided by Sumeet (2026-10-30), from their own proposal.

- The first version is headless: a CLI and a skill used in an ordinary agent session, over one readable file per story in git. No MCP server, since a CLI does the job and a person can run it too.
- The user is a team of a human and an agent. The model has to be readable by both. Building for the agent side first is fine, an agent may drive alone and reason beyond the model, and the human's judgment settles whether the result is good.
- The first test is sketching a story mostly from scratch from a fanfiction premise, then reworking it, compared blind against the same agent with plain notes. The Thukker premise is used to build the tool, and the magical girl therapist premise is held back.
- Open questions are their own records, holding candidate answers and what each would connect to. They are distinct from the telling layer's questions, which are what the reader is waiting for.

Consequences: `worldcrafter-4t98`, `worldcrafter-iaoc` and `worldcrafter-eg96` wait for a verdict. Decision worldcrafter-ddha still describes how the app stores things: in the trial's file, actors and scenes are plain records and not documents, and a keep verdict has to map one onto the other. Decision worldcrafter-gcox stands, because this is a way to find out and not how the product ships.

## Close Reason

Headless first, for a team of a writer and an agent; open questions as records (Sumeet's direction)
