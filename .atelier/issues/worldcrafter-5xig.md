---
created_at: "2026-11-05T05:35:41.423753588+00:00"
id: "worldcrafter-5xig"
issue_type: "task"
labels:
- "story-model"
workflow_branch:
  branch_base: master
  work_branch: task/worldcrafter-5xig
priority: "P2"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-03rp"
    type: "discovered_from"
  - kind: "issue"
    id: "worldcrafter-p3k7"
    type: "advances"
schema: "atelier.issue"
schema_version: 2
status: "in_progress"
title: "Point the docs and agent instructions at the notes-first mission"
updated_at: "2026-11-05T05:46:01.503518055+00:00"
---

## Goal

AGENTS.md, PRODUCT.md and `docs/rebuild/story-model.md` still say that the typed story model is the product's core and that Structure first is the current mission. Agents read these files first, so they would build on a bet that decision worldcrafter-03rp ended.

## Done when

- AGENTS.md names Notes first (`docs/strategies/notes-first.md`) as the current mission.
- PRODUCT.md no longer says the story lives in a typed model that the app checks. It states the current approach in a few sentences (plain notes, with aids under blind test) and links decision worldcrafter-03rp. It adds no positioning that results haven't earned yet.
- `docs/rebuild/story-model.md` opens with a note that it no longer sets the product's direction, linking that decision.
- `.agents/skills/story-sketch/SKILL.md`, whose description still triggers on sketching or reworking a story and steers agents to the typed CLI, says at the top and in its description that the typed tool is frozen and isn't the current approach, linking decision worldcrafter-03rp. `craft.md` beside it stays as it is, since worldcrafter-efis reuses it.
- `grep -n 'structure-first\|typed model' AGENTS.md PRODUCT.md .agents/skills/story-sketch/SKILL.md` finds only references that are plainly historical.
- The change is independently reviewed.

## Scope

Docs only. Don't touch code, and don't remove the typed-model CLI or skill, which stay until the new mission shows whether anything reuses them. Leave the product name (worldcrafter-cogw) alone.
