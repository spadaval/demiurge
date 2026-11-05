---
created_at: "2026-11-05T11:33:23.606043357+00:00"
id: "worldcrafter-ulpg"
issue_type: "feature"
labels: []
workflow_branch:
  branch_base: master
  work_branch: feature/worldcrafter-ulpg
priority: "P1"
relationships:
  blocks: []
  children:
  - kind: "issue"
    id: "worldcrafter-2m7d"
  - kind: "issue"
    id: "worldcrafter-ktfa"
  - kind: "issue"
    id: "worldcrafter-uf0f"
  - kind: "issue"
    id: "worldcrafter-vg6e"
  - kind: "issue"
    id: "worldcrafter-zevg"
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-gwx3"
    type: "advances"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T12:27:27.558103760+00:00"
status: "done"
title: "Round 2 fixes: numbers checked, traces precise, viewpoint and membership"
updated_at: "2026-11-05T12:27:27.558103760+00:00"
---

## Goal

Fix what Round 2's reading (docs/rounds/round-2/reading.md, ranked issues 1-8) found (issue 5 only in its skill half: the tool half, not prompting gaps for date-anchor events, is left out because the reading proposed only the skill line; finding worldcrafter-3q8b), plus the round runner's story-so-far length, before Round 3. Don't gold-plate.

## Done when

- All children are closed, each independently reviewed, and merged into local master before Round 3 starts.

## Close Reason

Round 2 fixes done and reviewed (round1-fix-reviewer, approvals 64sy, e1y4, fet1): uf0f counts in reader-order --before and quieter count output; vg6e trace precision (Round 2 replay 8 traces/22 suspects -> 1, the real stale note); zevg story so far held to length by one revision; ktfa scene viewpoint and group membership (decision dgkx); 2m7d skill: check numbers after drafting, read reader-order whole. mugi deferred to Round 3.
