---
created_at: "2026-11-05T16:59:55.918125363+00:00"
id: "worldcrafter-qmq0"
issue_type: "feature"
labels: []
workflow_branch:
  branch_base: master
  work_branch: feature/worldcrafter-qmq0
priority: "P1"
relationships:
  blocks: []
  children:
  - kind: "issue"
    id: "worldcrafter-7b2r"
  - kind: "issue"
    id: "worldcrafter-b0pg"
  - kind: "issue"
    id: "worldcrafter-hibo"
  - kind: "issue"
    id: "worldcrafter-l55e"
  - kind: "issue"
    id: "worldcrafter-yyki"
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-gwx3"
    type: "advances"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T17:28:19.633112555+00:00"
status: "done"
title: "Round 4 fixes: retold events, opening counts, viewpoint marks"
updated_at: "2026-11-05T17:28:19.633112555+00:00"
---

## Goal

Fix what Round 4's reading (docs/rounds/round-4/reading.md, ranked issues 1-6) found, before Round 5, the last round the direction allows. Issues 7, 8 and 10 need no action; item 9 is in worldcrafter-yyki. A killed runner left its sandboxed writer running (finding worldcrafter-gbh1); that is fixed in a runner child. Don't gold-plate.

## Done when

- All children are closed, each independently reviewed, and merged into local master before Round 5 starts.

## Close Reason

Round 4 fixes done and reviewed (round1-fix-reviewer, approvals w4pl, zqqn): 7b2r runners stop their sandboxes on SIGTERM/SIGINT/SIGHUP and refuse to start over a live one; b0pg counts as the scene opens and at each change, viewpoint marks for present characters (with mnm0: not the viewpoint's own secrets; versions still heard); yyki trace and span polish, --add/--remove on all scene lists; l55e and hibo skill guidance and catch-up.
