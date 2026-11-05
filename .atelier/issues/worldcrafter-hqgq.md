---
created_at: "2026-11-05T00:49:57.932390386+00:00"
id: "worldcrafter-hqgq"
issue_type: "feature"
labels:
- "story-model"
priority: "P1"
relationships:
  blocks: []
  children:
  - kind: "issue"
    id: "worldcrafter-ac45"
  - kind: "issue"
    id: "worldcrafter-fax9"
  - kind: "issue"
    id: "worldcrafter-h1be"
  - kind: "issue"
    id: "worldcrafter-iu6l"
  - kind: "issue"
    id: "worldcrafter-iyt9"
  - kind: "issue"
    id: "worldcrafter-qgom"
  - kind: "issue"
    id: "worldcrafter-xgxp"
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-i2uz"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-z9qs"
    type: "advances"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Change the tool from the verdict, then compare again on a fresh premise"
updated_at: "2026-11-05T00:50:24.573100166+00:00"
---

## Goal

The panel's verdict on the first comparison was change (worldcrafter-i2uz): every judge preferred plain notes in all four pairs, and named what to change before building on the tool. Make those changes, then compare again against plain notes on a fresh held-back premise, so the next verdict can say whether the changed tool is at least as good as notes. This is still the mission's biggest bet; if the changed tool doesn't reach at least an even result on the fresh premise, the judges' expectation is drop.

## Done when

- The children deliver the judges' changes in their order of priority: the readable form stops charging for structure; events can cause events; a change can reach what free text mentions; answers keep their history and a gap can be marked deliberate. Each child's proof passes and each is independently reviewed.
- The second comparison runs on the changed tool, frozen, with the same harness and the same `craft.md`, on Thukker (tuned-on) and a fresh held-back premise chosen by an agent that builds nothing here and sealed until the freeze.
- Its verdict is worldcrafter-i2uz's successor, a standalone validation decided by a judging panel (strategy, Verdicts), which the mission's next increment waits on.

## Unknowns

- Whether the render's word budget explains the loss, or the model itself does. The judges couldn't separate the two; this increment changes the render first so the second comparison can.
- Whether cause links and mention-finding help in practice, or only add records to keep.
- Whether a fresh premise behaves like the held-back one.

## Background

Verdict and reports: `docs/verdicts/comparison/` (verdict change: opus change, sonnet change, fable drop). What to change first, agreed by all three: the render's cost (wants quoted under every relation, constraints printed, settled questions and rejected candidates printed, so sessions deleted true structure to fit about 1,500 words), then a chain of causes, then reaching what text mentions, then history and the gap reports. Model-gaps logs: `/home/supadava/projects/demiurge-comparison/key/model-gaps/`. Keep specification light; the logs are the requirements' source.
