---
schema: atelier.review
schema_version: 3
round: 4
commit: ec210fa334bc5850c993e265c9e1464dade65e86
reviewers:
- thread:delegated-task:command%3Amcp%3Af5bb1f7e-1300-43e3-aeec-a7cb0f0b7a66%3Adelegate-task%3Aab95ad85-d004-4e3b-9309-b6b6db95a3af
model: claude-opus-5-5
verdict: approve
created_at: 2026-11-22T23:07:31.449573563Z
---

## Summary

I read the round-3 to round-4 diff (`git diff fb40414 ec210fa`) of `mission.md` and `worldcrafter-lgz8`, and checked the new field lists against `Story` in `app/src/story/story.ts:397-424` and `Timeline` in `app/src/time/timeline.ts:174-190`. I also checked the docs line against the section headings of `docs/rebuild/story-model.md` ("Effect on the plan" at `:122`, "Records" at `:128`). I did not run `bun run check`; this is a plan review.

The carried finding is fixed. lgz8's first Done when line and the mission's unification rule both now say "every field of `Story`" and name all nine data fields of `Timeline`. lgz8's docs line now also covers "Effect on the plan", which clears round 3's deferred Finding 5 (the 2y4g paragraph at `story-model.md:126`). One small wording mismatch is left (Finding 2, no action).

## Finding 1: lgz8's new timeline list leaves out scene placements, reveals, follows and correspondences
Recommendation: fix now
Was: 3-1ugs.4
Now: fixed

lgz8's first Done when line now reads "every field of `Story` (including the full `Story.timeline` `Timeline`: `events`, `positions`, `constraints`, `placements`, `frames`, `correspondences`, `follows`, `reveals`, `worldUnit`; ...)". That matches `Timeline` at `app/src/time/timeline.ts:174-190` field for field; only `version` is unnamed, and "every field of `Story`" covers it. The non-timeline list also matches every other field of `Story` at `app/src/story/story.ts:397-424`. The mission's unification rule carries the same wording. Because the line leads with "every field of `Story`", the list can no longer be read as exhaustive, so the fixture line ("all story record kinds") is now judged against the whole type.

## Finding 2: The mission rule still says lgz8 updates only the Records section of `story-model.md`
Recommendation: no action

`mission.md` (unification rule, second bullet) says "`worldcrafter-lgz8` also updates `docs/rebuild/story-model.md` (Records)", while lgz8's Done when line now says "Effect on the plan and Records sections". The item is what the implementer ticks, and it says more, so nothing is lost. Whoever next edits the mission can bring the parenthetical in line.
