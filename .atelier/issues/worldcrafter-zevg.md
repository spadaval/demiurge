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
title: "Round runner: story so far to length"
updated_at: "2026-11-05T11:33:23.758213756+00:00"
---

## Goal

Keep the story-so-far texts within about 300-500 words. (The judge prompt is not changed: judging stays fixed across rounds so scores stay comparable, as Round 1's log decided; finding worldcrafter-71bo.)

## Done when

- The story-so-far phase checks the length and, if over 550 or under 250 words, asks the same agent once to revise to length, recording both versions; still-out-of-range is recorded as a note, not a failure.
- Tests; bun run check passes.
