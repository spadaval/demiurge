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
updated_at: "2026-11-05T00:56:08.754732967+00:00"
---

## Goal

The panel's verdict on the first comparison was change (worldcrafter-i2uz): every judge preferred plain notes in all four pairs, and named what to change before building on the tool. Make those changes, then compare again against plain notes on a fresh held-back premise, so the next verdict can say whether the changed tool is at least as good as notes. This is still the mission's biggest bet; if the changed tool doesn't reach at least an even result on the fresh premise, the judges' expectation is drop.

## Done when

- The children deliver the judges' changes in their order of priority: the readable form stops charging for structure; events can cause events; a change can reach what free text mentions; answers keep their history and a gap can be marked deliberate. Each child's proof passes and each is independently reviewed.
- The second comparison runs on the changed tool, frozen, with the same harness and the same `craft.md`, on Thukker (tuned-on) and a fresh held-back premise chosen by an agent that builds nothing here and sealed until the freeze.
- Its verdict is worldcrafter-iu6l, a standalone validation that follows this increment, decided by a judging panel (strategy, Verdicts); the mission's next increment waits on it. As with worldcrafter-i2uz, it isn't a child, so this increment's reviewed code can merge before the panel runs.

## Unknowns

- Whether the render's word budget explains the loss, or the model itself does. The judges couldn't separate the two; this increment changes the render first so the second comparison can.
- Whether cause links and mention-finding help in practice, or only add records to keep.
- Whether a fresh premise behaves like the held-back one.

## Background

Verdict and reports: `docs/verdicts/comparison/` (verdict change: opus change, sonnet change, fable drop). What to change first, in the order Opus and Fable give (Sonnet puts cause links first and the render third): the render's cost (wants quoted under every relation, constraints printed, settled questions and rejected candidates printed, so sessions deleted true structure to fit about 1,500 words), then a chain of causes, then reaching what text mentions, then history and the gap reports. Model-gaps logs: `/home/supadava/projects/demiurge-comparison/key/model-gaps/`. Keep specification light; the logs are the requirements' source.

## Notes

- 2026-11-04 [decision] Deferred from the judges' asks, not in this increment: finer-than-year time units, flagging constraints whose gap went to zero after a move, and new types (plant and payoff, mirrors, drive outcomes, intended ambiguity, between-scene events)
  Reason: Review finding worldcrafter-x2pm. The increment takes the judges' top priorities only, so the second comparison tests them without more change; same-position cause and effect isn't reported (h1be), which removes the commonest false alarm. The rest is for the verdict after this one to choose.
