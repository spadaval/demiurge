---
created_at: "2026-11-05T05:44:05.244567184+00:00"
id: "worldcrafter-fi68"
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
    id: "worldcrafter-9ecm"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T06:27:30.860765854+00:00"
status: "superseded"
title: "Three long runs on the sealed premise"
updated_at: "2026-11-05T06:27:30.860765854+00:00"
---

## Goal

Produce the finished stories the panel reads.

## Done when

- The harness is frozen at a recorded commit.
- Three runs go on the sealed premise, on claude-opus-5-5, with the Claude Code version recorded. Each run works in its own temporary git repository outside this one, and its outputs go to the run root.
- Each run's output is its finished story, its notes and its per-session read log.
- Failed runs aren't quietly rerun; failures are written down.
- Each transcript is checked for reads outside its run's directory. Any session over the read budget is reported.
- The handoff gives the paths, the model, the frozen commit and the number of failed runs.

## Close Reason

Superseded by Sumeet's direction of 2026-11-05, decision worldcrafter-jeue: head-to-head comparisons and the notes-first framing are dropped; the next mission is worldcrafter-gwx3. Work done is parked unmerged on feature/worldcrafter-efis (dcc1e0a).
