---
created_at: "2026-11-05T06:28:02.276346704+00:00"
id: "worldcrafter-7coc"
issue_type: "feature"
labels: []
workflow_branch:
  branch_base: master
  work_branch: feature/worldcrafter-7coc
priority: "P1"
relationships:
  blocks: []
  children:
  - kind: "issue"
    id: "worldcrafter-b37f"
  - kind: "issue"
    id: "worldcrafter-wtiz"
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-gwx3"
    type: "advances"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T06:49:55.711581300+00:00"
status: "done"
title: "Round 0, fix 1: separate the bible from the prose"
updated_at: "2026-11-05T06:49:55.711581300+00:00"
---

## Goal

Round 0's first fix (decision worldcrafter-jeue), with the docs housekeeping that points AGENTS.md and the skill at mission worldcrafter-gwx3. Fixes 2 to 6 are their own features (r26d, wefn, 6m2v, j6z1, s2mz), each reviewed and merged locally in order, because Atelier merges one owner at a time.

## Done when

- worldcrafter-b37f and worldcrafter-wtiz are closed, independently reviewed and merged into local master.
- The skill no longer says it is frozen and describes the tool as it now is.

## Close Reason

Fix 1 done: b37f (docs point at gwx3) and wtiz (bible separate from prose: no render word budget, scene prose in scenes/<id>.md, reveals/implies/withholds links, scenes <ref>). Reviewed by round0-reviewer (approval xsz3); findings 0m5a deferred to r26d, 8och to x2ij, ljq1 no action. Fixes 2 to 6 were made their own features so each merges separately.
