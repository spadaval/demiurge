---
created_at: "2026-11-05T00:50:24.551339850+00:00"
id: "worldcrafter-ac45"
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
    id: "worldcrafter-fax9"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Run the second comparison on a fresh held-back premise"
updated_at: "2026-11-05T00:50:24.551339850+00:00"
---

## Goal

Produce what a judging panel needs to judge whether the changed tool beats plain notes, as in worldcrafter-04z5, with only the tool changed.

## Done when

- A fresh agent that builds nothing in this increment chooses one new premise, about as open as the first two (a phrase or a short paragraph, any genre), records the choice as a decision note here without the premise text, and writes the text to a sealed file outside the repository. Nobody building the tool reads it before the freeze.
- The harness from 04z5 is reused, changed only to add the new premise and to label runs as the second comparison. Each change is independently reviewed before the freeze. The prompts, `craft.md` and step instructions stay the same.
- Freeze, then eight runs: Thukker and the fresh premise, two tool runs and two notes runs each, on the same model as before, in a new comparison root (not the first one's). Failed runs aren't quietly rerun. Packets, key and failures are written as before.
- The handoff gives the paths, the model, the frozen commit and the number of failed runs.
