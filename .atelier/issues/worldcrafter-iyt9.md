---
created_at: "2026-11-05T00:50:24.508703985+00:00"
id: "worldcrafter-iyt9"
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
    id: "worldcrafter-xgxp"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Keep answers' history, and let a gap be deliberate"
updated_at: "2026-11-05T00:50:24.508703985+00:00"
---

## Goal

A reworked answer keeps the old one on record, and a gap the team has judged fine stops being reported. Sessions deleted decided questions to save words, so the history lived only in git, and gap reports nagged about deliberate choices (a drive from temperament, with no origin event).

## Done when

- Changing a question's chosen answer keeps the old answer marked superseded, with what replaced it. `show` lists the history, and `render` doesn't. Unanswering keeps it too. Tests show both.
- A command marks one gap on one record as deliberate, with a reason, and `storyGaps` stops listing it; removing the mark brings it back. The mark lives in the story file.
- `bun run check` passes.
