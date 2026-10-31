---
created_at: "2026-10-31T04:44:50.226012159+00:00"
id: "worldcrafter-y0mv"
issue_type: "task"
labels:
- "story-model"
workflow_branch:
  branch_base: master
  work_branch: task/worldcrafter-y0mv
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates: []
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-10-31T04:47:22.611539920+00:00"
status: "done"
title: "Say plainly where we stand on AI writing, and let the form follow results"
updated_at: "2026-10-31T04:47:22.611539920+00:00"
---

## Goal

Someone reading the docs learns where we stand: no position on whether AI should write, the best possible story is what counts, the theory is AI thoroughness plus human judgment, we won't be a slop cannon, and the form follows results (decision worldcrafter-45an).

## Done when

- `docs/strategies/structure-first.md`, `docs/rebuild/story-model.md`, `PRODUCT.md` and `README.md` say this and don't imply that AI shouldn't write or that the product must stay a web app.
- `atelier check` passes.

## Scope

Docs only. Implementation detail and the comparison's design don't change.

## Close Reason

The strategy, story model, PRODUCT and README now say we want AI to write the story, take no position on AI writing in general, want the best possible story, won't be a slop cannon, and let the form follow results.

### Decisions
Decision worldcrafter-45an. The story-first ranking is an agent proposal awaiting Sumeet's confirmation, noted there.

### Surprises
Leftover wording treated AI as secondary and the app as settled in more places than expected.

### Open items
Sumeet to confirm or reverse the ranking. DESIGN.md's editor description is unchanged, because it describes the visual design.
