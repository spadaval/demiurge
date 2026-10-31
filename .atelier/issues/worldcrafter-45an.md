---
created_at: "2026-10-31T04:44:50.123430630+00:00"
id: "worldcrafter-45an"
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
    id: "worldcrafter-2y4g"
    type: "related"
  - kind: "issue"
    id: "worldcrafter-gcox"
    type: "related"
  - kind: "issue"
    id: "worldcrafter-z9qs"
    type: "advances"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-10-31T04:44:50.173775401+00:00"
status: "done"
title: "No stance on AI writing: the best story decides, and the form follows"
updated_at: "2026-10-31T04:46:50.284425421+00:00"
---

## Question

Should AI write the story, and what form should WorldCrafter take? The docs still implied that AI shouldn't write ("crafted stories, not a text generator") and that the product stays a web app whatever the results show.

## Decision

Decided by Sumeet (2026-10-31).

- We take no position on whether AI should be used to write stories. We want to write the best possible story, and AI writing it is fine wherever that helps.
- Our theory is that the best way there is AI tenacity and thoroughness combined with human judgment. It's a theory, and results can change it.
- What we don't want is an AI slop cannon: volume that nobody has judged.
- The form follows the results. If the best way to get a good story is to give Claude an MCP server, a database and a skill, that's what this becomes.

Consequences: the web app (decision worldcrafter-gcox) is the current plan and not a commitment. It's still how anything built for the app is targeted until a verdict says otherwise, and changing it comes back to the human. A screen is a bet like any other. This corrects decision worldcrafter-2y4g's statement that the product doesn't change form. "No MCP server" there only means the first version doesn't need one.

## Notes

- 2026-10-31 [note] 2026-10-31: the strategy's quality ranking now starts with the quality of the story, as the human judges it, above visibility and control. The agent proposed this from Sumeet's direction, and they can reverse it. The writer's corrections still win, and nothing is rewritten silently.

## Close Reason

No stance on AI writing; best story decides; form follows results (Sumeet's direction)
