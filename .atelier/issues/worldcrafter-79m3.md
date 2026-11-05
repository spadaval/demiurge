---
created_at: "2026-11-05T14:15:00.621627344+00:00"
id: "worldcrafter-79m3"
issue_type: "feature"
labels: []
workflow_branch:
  branch_base: master
  work_branch: feature/worldcrafter-79m3
priority: "P1"
relationships:
  blocks: []
  children:
  - kind: "issue"
    id: "worldcrafter-0u90"
  - kind: "issue"
    id: "worldcrafter-nkey"
  - kind: "issue"
    id: "worldcrafter-o0s0"
  - kind: "issue"
    id: "worldcrafter-vw1u"
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-gwx3"
    type: "advances"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T15:31:12.117379415+00:00"
status: "done"
title: "Round 3 fixes: viewpoint marks, reader context, years, traces"
updated_at: "2026-11-05T15:31:12.117379415+00:00"
---

## Goal

Fix what Round 3's reading (docs/rounds/round-3/reading.md, ranked issues 1 and 3-9) found, before Round 4. Issue 2 (quoted lines) gets a skill line under decision worldcrafter-dgkx's note; issue 8 needs no action. Don't gold-plate.

## Done when

- All children are closed, each independently reviewed, and merged into local master before Round 4 starts.

## Close Reason

Round 3 fixes done and reviewed (round1-fix-reviewer, approvals nyje, c72a): o0s0 viewpoint marks (false marks on Round 3 snapshots 7 and 11 -> 0) and each telling shown; 0u90 years as spans, --end year inclusive, counts 'from', output polish; vw1u trace noise (Round 3 replay 24 suspects -> 5, catching the off-by-one note); nkey skill: count the same thing, check reused lines, read reader-order whole every scene.
