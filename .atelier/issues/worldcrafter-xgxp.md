---
created_at: "2026-11-05T00:50:24.443713507+00:00"
id: "worldcrafter-xgxp"
issue_type: "task"
labels:
- "story-model"
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates: []
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Render the story, not the links"
updated_at: "2026-11-05T00:50:24.443713507+00:00"
---

## Goal

The readable form says each thing once, so a sketch's length measures the story and not its links. The first comparison's sessions deleted true links, settled questions and rejected candidates to fit about 1,500 words because the render reprinted them.

## Done when

- `renderStory` prints each drive's want once, under its actor, and elsewhere refers to a drive by a short name, not by quoting the want again. A relation is printed once, not under both drives.
- A constraint that the events' positions already satisfy isn't printed. One that positions don't settle, or that is violated, still is.
- A decided question prints only its chosen answer; rejected candidates and superseded answers stay in the file and out of the render.
- A test over a fixture with many links shows that adding the links, relations and satisfied constraints adds at most a few words per link; another shows a violated constraint still shows; `render`'s word count reflects the result.
- `bun run check` passes.
