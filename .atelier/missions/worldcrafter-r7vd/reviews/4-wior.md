---
schema: atelier.review
schema_version: 3
round: 4
commit: ec210fa334bc5850c993e265c9e1464dade65e86
reviewers:
- 01a20583-bafc-71d0-9d28-e641ab69e02e
model: grok-4.6
verdict: approve
created_at: 2026-11-22T23:07:37.864957164Z
---

## Summary

Complexity: high. The mission still adds a persisted bible, a tool registry, multi-turn LLM transport, and an agent runner, beside the live `world/` + `outline/` + `time/` stores.

Value: high. The typed store and app-owned agent are still the outcome this direction needs.

Risk of merging it: medium. Full `Story.timeline` is now named, so a silent drop of scene placements or reveals is much less likely. A failure in persistence or export shows in contract tests and can be undone.

Checked `git diff fb40414..ec210fa` on `mission.md` and `worldcrafter-lgz8`, then the current mission and all five items. Checked the new lists against `Story` in `app/src/story/story.ts:397-424` (including nested drive `turns`/`relations` and open-question `candidates`) and `Timeline` in `app/src/time/timeline.ts:174-190`. Checked the docs line against `docs/rebuild/story-model.md:122-136` (Effect on the plan, including the 2y4g paragraph at `:126`, and Records). Read Round 3 reviews so Finding 4 and the deferred docs paragraph were judged against this round's text. Did not run `bun run check`; this is a plan review.

The carried fix-now finding is addressed. No new serious defect in the changed text.

## Finding 1: lgz8's new timeline list leaves out scene placements, reveals, follows and correspondences
Recommendation: fix now
Was: 3-1ugs.4
Now: fixed

lgz8's first Done when line and the mission unification rule now lead with "every field of `Story`" and name the full `Story.timeline` (`events`, `positions`, `constraints`, `placements`, `frames`, `correspondences`, `follows`, `reveals`, `worldUnit`). That matches `Timeline` at `app/src/time/timeline.ts:174-190` (the type's `version` field is the only omission, and Round 3's suggested wording omitted it too). An implementer cannot tick the line while dropping `placements` or `reveals`.

## Finding 2: Mission still names only the Records section of story-model.md
Recommendation: no action

lgz8's docs Done when now names both "Effect on the plan and Records sections", which covers the 2y4g paragraph at `docs/rebuild/story-model.md:126` that Round 3 deferred. The mission's second unification bullet still says `docs/rebuild/story-model.md` (Records). Implementers tick lgz8, which is the fuller line, so the plan needs no further change.
