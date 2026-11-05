---
created_at: "2026-11-05T11:33:23.758213756+00:00"
id: "worldcrafter-zevg"
issue_type: "task"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-5pks"
    type: "discovered_from"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Round runner: story so far to length; judge evidence (Round 1 and 2 logs)"
updated_at: "2026-11-05T11:33:23.758213756+00:00"
---

## Goal

Keep the story-so-far texts within about 300-500 words and judges' evidence verbatim.

## Done when

- The story-so-far phase checks the length and, if over 550 or under 250 words, asks the same agent once to revise to length, recording both versions; still-out-of-range is recorded as a note, not a failure.
- The judge prompt (app/scripts/judging/scenes.ts) says evidence and moment quotes are copied verbatim from the scene with no commentary, reasons going in the prose after the block; the rubric file is not changed.
- Tests; bun run check passes.
