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
    id: "worldcrafter-6m2v"
  - kind: "issue"
    id: "worldcrafter-b37f"
  - kind: "issue"
    id: "worldcrafter-j6z1"
  - kind: "issue"
    id: "worldcrafter-r26d"
  - kind: "issue"
    id: "worldcrafter-s2mz"
  - kind: "issue"
    id: "worldcrafter-wefn"
  - kind: "issue"
    id: "worldcrafter-wtiz"
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-gwx3"
    type: "advances"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Round 0: fix the tool before any run"
updated_at: "2026-11-05T06:32:15.787501502+00:00"
---

## Goal

Fix the story CLI (app/scripts/story.ts, app/src/story/) and its skill (.agents/skills/story-sketch/) from the comparisons' gap logs (/home/supadava/projects/demiurge-comparison{,-2}/key/model-gaps/) and judge reports (docs/verdicts/comparison*/) before any round, in the order of decision worldcrafter-jeue. Don't gold-plate: the rounds show what matters.

## Done when

- Sumeet's six fixes (wtiz, r26d, wefn, 6m2v, j6z1, s2mz) are each independently reviewed and merged into local master, in order, after the docs task b37f, which is housekeeping and not one of the six.
- The skill no longer says it is frozen and describes the tool as it now is.
