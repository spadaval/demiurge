---
created_at: "2026-10-29T22:23:11.198458681+00:00"
id: "worldcrafter-oes2"
issue_type: "feature"
labels:
- "story-model"
priority: "P2"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-i2uz"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-o8b7"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-z9qs"
    type: "advances"
schema: "atelier.issue"
schema_version: 2
status: "backlog"
title: "Point out structural problems"
updated_at: "2026-10-30T22:02:17.694136607+00:00"
---

## Goal

The app points out structural problems while they are cheap to fix, without the AI.

## Done when

Provisional: delivers `inspection`. A question ledger, a collision map and a scene check are computed from the model and shown in the app, proven by tests over fixture stories with planted problems. The checks report when asked and never block. Ends with the judging panel's keep, change or drop (decision worldcrafter-zybl).

## Unknowns

- Thresholds (how long is "open too long") and how to keep the checks from being noisy enough to ignore.
- Whether to also flag scenes whose story-time placement disagrees with the events they depict (`depicts` is descriptive, decision worldcrafter-ddha).
