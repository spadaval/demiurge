---
created_at: "2026-10-31T02:17:22.244395537+00:00"
id: "worldcrafter-date"
issue_type: "task"
labels:
- "story-model"
workflow_branch:
  branch_base: master
  work_branch: task/worldcrafter-date
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-z9qs"
    type: "advances"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-10-31T03:28:48.379872879+00:00"
status: "done"
title: "Say what fluidity means and who WorldCrafter is for"
updated_at: "2026-10-31T03:28:48.379872879+00:00"
---

## Goal

Someone reading this repository's docs learns what we mean by fluidity and what the goal is: picking elements and weaving them until they fit, so a team of a human and an agent can tell great stories. Today the docs describe a writer-with-a-quiet-AI product, a rebuild as the current mission, and rework without saying how stories get made.

## Done when

- `docs/rebuild/story-model.md` has a section on fluidity that a fresh reader could explain back, says open questions are distinct from reader questions, and cites its quotations.
- `PRODUCT.md` and `README.md` state the goal and the team, and what the first version is, without contradicting `docs/strategies/structure-first.md` or decision worldcrafter-2y4g.
- `AGENTS.md` names the current mission and where to read about fluidity.
- `atelier check` passes.

## Scope

Docs only. Leave `docs/rebuild/prior-art-2026.md` and `docs/strategies/rebuild.md` alone. The strategy and decision hold the reasons; link rather than repeat them.

## Close Reason

Docs say what fluidity means, the goal and the team, the headless first version, and the current mission. The branch also carried plan fixes from review.

### Decisions
Sumeet's four comparison decisions are noted on worldcrafter-2y4g. PRODUCT.md dropped "deliberately not a chatbot" and softened the quiet-colleague principle to apply to the app, following decision worldcrafter-2y4g.

### Surprises
Review found the comparison couldn't run as first written, and that several citations didn't support the text; both fixed.

### Open items
Quotations from Le Guin and Gabaldon rest on secondary sources, and Johnstone on memory, and the docs say so. DESIGN.md still says "the prose is the stage": it's the visual description of the editor, left alone. Later increments are marked stale until the verdict in worldcrafter-i2uz.
