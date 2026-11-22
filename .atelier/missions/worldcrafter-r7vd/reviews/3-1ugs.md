---
schema: atelier.review
schema_version: 3
round: 3
commit: fb40414c1a44f577724a4ab5c3133bae0e5814b7
reviewers:
- thread:delegated-task:command%3Amcp%3Af5bb1f7e-1300-43e3-aeec-a7cb0f0b7a66%3Adelegate-task%3A40047548-82e8-41eb-ab19-2a0968109659
model: claude-opus-5-5
verdict: changes
created_at: 2026-11-22T23:04:42.376175343Z
---

## Summary

I read the round-2 to round-3 diff of `mission.md`, `worldcrafter-lgz8` and `worldcrafter-qizl`, and judged the three carried findings against it. I checked the new collection list against `CollectionName` in `app/src/storage/types.ts:17-24`, the new lgz8 bible list against `Story` in `app/src/story/story.ts:397-424` and `Timeline` in `app/src/time/timeline.ts:174-190`, and the docs update against `docs/rebuild/story-model.md:122-136`.

I could not check that Sumeet gave the approval the mission now cites. No decision record for 2026-11-22 exists in `.atelier/`, so I take the mission's statement as the record, as round 2's fix allowed.

Two of the three carried findings are fixed and the third is fixed except for a doc paragraph (Finding 5, defer). The round-2 fix to lgz8 adds a timeline list that leaves out half of `Timeline`, including scene placements and reveals (Finding 4, fix now).

## Finding 1: The plan doesn't say which model wins where `app/src/story/` and `app/src/world/` + `app/src/time/` disagree, and that is a core-primitive call
Recommendation: fix now
Was: 2-528x.1
Now: fixed

The mission's unification rule now says Sumeet approved it on 2026-11-22 and that it supersedes `worldcrafter-ddha`'s entry-document split and `worldcrafter-2y4g`'s single-file format. That covers the new `Scene` fields, since the rule names `documentId` and `book`/`chapter`. lgz8 gained a Done when line to update the Records section of `docs/rebuild/story-model.md`, which is where the ddha mapping (`:130-136`) lives. The 2y4g paragraph at `:126` sits outside Records and is not named; see Finding 5.

## Finding 2: qizl's round-trip check leaves out the legacy collections, so "lossless whole world" can pass while user data drops
Recommendation: fix now
Was: 2-528x.13
Now: fixed

qizl's Goal and first Done when line now name all seven current collections (`documents`, `worldEntries`, `annotations`, `requests`, `snapshots`, `outlines`, `timelines`), which match `app/src/storage/types.ts:17-24`, plus the bible collections from lgz8. The fixture must populate every one.

## Finding 3: lgz8 and qizl both own JSON round-trip, and the public export is unspecified
Recommendation: fix now
Was: 2-sake.8
Now: fixed

The round-2 remainder was that the contract did not name the records. It now does, on qizl only, and lgz8 keeps export out of scope.

## Finding 4: lgz8's new timeline list leaves out scene placements, reveals, follows and correspondences
Recommendation: fix now

The round-3 change to lgz8's first Done when line lists "timeline `positions`, `constraints`, and frames" among what the bible must persist. The mission's unification rule repeats "timeline positions/constraints/frames". But `Story.timeline` is the full `Timeline` from `app/src/time/timeline.ts:174-190`, which also holds `worldUnit`, `events`, `placements`, `correspondences`, `follows` and `reveals`.

The list reads as exhaustive, so an implementer can tick it while dropping `placements` (the only place a scene gets a position in story time) and `reveals` (what `reader-order --before` and 667u's scene context packets need). The fixture line ("all story record kinds") would not catch it, because "record kinds" is judged against the same list.

Fix: in lgz8 and the mission rule, say "the whole `timeline` (`Timeline` in `app/src/time/timeline.ts`: events, positions, constraints, placements, frames, correspondences, follows, reveals and `worldUnit`)", or simply "every field of `Story`".

## Finding 5: `story-model.md:126` still says the first version is headless over one readable file
Recommendation: defer

lgz8 now updates the Records section, but the 2y4g paragraph at `docs/rebuild/story-model.md:126` is under "Effect on the plan" and still describes the CLI-over-one-file version as the plan. The mission says the unification rule supersedes 2y4g. Whoever does lgz8's docs line should update that paragraph too; it doesn't block the mission because it changes no code or contract.
