---
schema: atelier.review
schema_version: 3
round: 1
commit: d07569c619a6e3b3b76c11b2ffc2787868362f14
reviewers:
- 01a20570-9943-77d0-86bf-d4630d0d8bec
model: grok-4.6
verdict: changes
created_at: 2026-11-22T22:48:04.519531419Z
---

## Summary

Complexity: high. A long-running rebuild mission whose body still describes the whole foundation, while this commit and sibling same-day branches each peel items off it.
Value: medium. The leftover S1 export/import and S9 tombstone work still matters; agreeing the 2026-10 rebuild as written does not.
Risk of merging the plan: high. S8 would be this mission's criterion and `worldcrafter-k7uh`'s job at once, and the Why still points at a superseded strategy.

Checked `.atelier/missions/worldcrafter-3otd/{mission.md,design.md,notes.md}` at `d07569c` (the only 3otd edit on this commit is `planners:` in the front matter), remaining items `worldcrafter-4t98`, `worldcrafter-my9t`, `worldcrafter-qizl`, `worldcrafter-xodp`, the k7uh moves of `worldcrafter-08kf` and `worldcrafter-2x5z`, and app evidence for shipped criteria: `app/src/editor/block-id.test.ts` (S2), `app/src/generate/generate.test.ts` (S4), `app/src/time/s10-frames.test.ts` (S10), `app/src/story/commands.test.ts` / `app/src/time/commands.ts` (S7), `app/src/test/storage-boundary.test.ts` (S9 adapter boundary). `docs/strategies/structure-first.md` is superseded. Sibling branches `worldcrafter-3z9j` and `worldcrafter-r7vd` also edit this mission; I did not treat their item moves as part of this commit.

Could not read decisions `worldcrafter-ok5a` / `worldcrafter-03rp` as Atelier records (they live in docs). Did not run the rebuild test suites.

## Finding 1: Outcome, S8, and Scope still require retiring the old app after 2x5z left
Recommendation: fix now
This commit sets `worldcrafter-2x5z` and `worldcrafter-08kf` to mission `worldcrafter-k7uh` and only adds `planners:` to `.atelier/missions/worldcrafter-3otd/mission.md`. The body is unchanged: Why (line 36) still says this mission finishes "retiring the old app"; Outcome (line 47) still says "The old app is gone, and the checks pass"; Success criteria S8 (lines 71–73) still require distilbert-NER, tiptap, global chat and unused dependencies gone with clean typecheck/lint/test/build on `master`; Scope In (line 91) still lists "removing the old app". None of the remaining items (`4t98`, `my9t`, `qizl`, `xodp`) deliver S8. `worldcrafter-k7uh` now owns that work. Drop S8, the Outcome sentence, and that Scope line, or close this mission; do not leave the same criterion on two missions.

`design.md` keep-list still names `entity-suppression.ts`, which exists only under root `src/lib/` and which `worldcrafter-2x5z` will delete with the old app. If S8 leaves, say so in the Shape.

## Finding 2: Why still cites a superseded strategy, and shipped criteria are listed as if undone
Recommendation: fix now
Why (mission.md lines 35–39) says the story model (decision `worldcrafter-ok5a`) makes the app structure-first and "continues in `docs/strategies/structure-first.md`". That file is superseded (front matter: decision `worldcrafter-03rp`, then notes-first). Scope Out still carves the story model out as if this were 2026-10. S2, S4, S10 and S7 already have tests in `app/` as named above; S9's adapter and "no IndexedDB outside storage" parts exist (`storage-boundary.test.ts`), with tombstones left on `worldcrafter-4t98`; S1 remains `worldcrafter-qizl`. A reader agreeing this mission would think those criteria still need building. Mark what is already met, keep only the leftover S-criteria, and send a Why/Scope rewrite back to Sumeet under Authority ("reopening … the rebuild approach").

## Finding 3: Remaining items do not match a coherent leftover plan
Recommendation: fix now
On this commit the mission still holds `worldcrafter-qizl` (revised S1), `worldcrafter-4t98` (S9 tombstones), `worldcrafter-my9t` (snapshot retention, not an S-criterion), and `worldcrafter-xodp` (generation ergonomics; its 2026-10-29 note moved it out, 2026-10-30 put it back). Those last two are follow-ups, not foundation. Same-day branches `worldcrafter-3z9j` and `worldcrafter-r7vd` move 4t98/my9t/xodp and qizl respectively, so agreeing 3otd from this commit fights those plans. Either rewrite this mission's remaining work to the items this branch actually leaves, or stop proposing it for agreement and close it with a `## Result` that names which criteria were met here and which moved to k7uh, r7vd and 3z9j. Authority says changing success criteria comes back to Sumeet.

## Finding 4: Remaining 3otd items are still `status: draft`
Recommendation: defer
k7uh flipped the moved items to `open`. `4t98`, `my9t`, `qizl` and `xodp` stay `draft`. If this mission is agreed rather than closed, those records need to be opened (or dropped) so they can start. Not the first edit if Finding 1–3 close the mission.

## Finding 5: Four branches stamp the same planners front matter
Recommendation: no action
k7uh, r7vd, 3z9j and mtkn each replace `ready: null` with the same `planners:` list. The bodies they leave behind differ. The front-matter edits should merge; the bodies will not. Whoever merges second needs to read the result.
