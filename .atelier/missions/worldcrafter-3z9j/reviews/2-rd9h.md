---
schema: atelier.review
schema_version: 3
round: 2
commit: 16597c05b81461f878ec4e956a8f4817e19df8c0
reviewers:
- thread:delegated-task:command%3Amcp%3Af5bb1f7e-1300-43e3-aeec-a7cb0f0b7a66%3Adelegate-task%3Ad2dc2b41-73a0-4d34-b7db-120176105678
model: claude-opus-5-5
verdict: changes
created_at: 2026-11-22T23:17:15.135420943Z
---

## Summary

I read the diff from a7c274f to 16597c0 for the mission and its eight items, then checked each change against the sibling items it now names and the code on this tree. I confirmed every new blocker exists and is open on its mission (`lgz8`, `667u`, `7r87`, `erje` on `worldcrafter-r7vd`; `w4mr`, `wqh0`, `hqca` on `worldcrafter-mtkn`). I confirmed `w4mr` names `app/src/generate/context-viewer.tsx` as the single shared viewer and `aq1r` as its consumer, and that `lgz8` lists tombstones as Out. `app/src/generate/profile.ts` lines 9-15 do already ship a stable `name` and a changeable `label`, as the new `xodp` Goal says. `projectProse` (`app/src/content/projections.ts` line 264) is the only prose projection and `app/src/context/builder.ts` line 441 calls it. `atelier status` lists `v61k` under "Waiting on a human" now, not under "Can start now".

Nine of the eleven carried findings are fixed. Two stand in narrowed form. Finding 4 stays open because `wknl` got a note but no re-plan, and nothing ties its fix to the `667u` packet that `aq1r` will feed. Finding 10 stays open because the LWW rule has no clock-skew test and no guard against one device's whole Plate document silently replacing the other's. Both are one-paragraph edits.

I could not check `667u`'s packet code or `lgz8`'s schema, because neither exists yet. I ran no tests, since this is a plan review.

## Finding 1: Items that need r7vd and mtkn have empty blocked_by
Recommendation: fix now
Was: 1-fa66.1
Now: fixed
`aq1r` is now blocked by `lgz8`, `667u` and `w4mr`. `o7to` is blocked by `lgz8`, `7r87`, `wqh0` and `hqca`. `4t98` is blocked by `lgz8`, and `ji5d` waits on `4t98`, so it waits on `lgz8` as well. None of them can start on the current store.

## Finding 2: aq1r overlaps 667u's context packet and xodp's pins
Recommendation: fix now
Was: 1-fa66.2
Now: fixed
`aq1r` now consumes `667u`'s packet and says it must not duplicate it. Pin and exclude of bible sections belong to `aq1r`. `xodp` keeps shortcuts, stale-pin clearing, missing-anchor recovery and the retarget fixes. Finding 12 has a small ordering note on the stale pin.

## Finding 3: v61k is a startable success criterion that must not change until the domain is bought
Recommendation: fix now
Was: 1-fa66.3
Now: fixed
`v61k` now has `mission: null` and the `needs-human` label, and the mission lists it under Out. The success criteria no longer name it.

## Finding 4: xodp and wknl were moved in without re-planning against the code that exists
Recommendation: fix now
Was: 1-fa66.4
Now: kept
`xodp` is fixed. It has been re-planned into five numbered parts against current code, and it says which parts already shipped. I confirmed that claim in `profile.ts`.

`wknl` is not fixed. Its Goal and Done when are unchanged. They still offer the fix either in "the prose projection (or the context builder)", and the item is startable now with `blocked_by: []`. If an implementer fixes it in today's `app/src/context/builder.ts`, `aq1r` later replaces that assembly with `667u`'s packet, whose "nearby prose" may not pass through that fix, and the notes leak again. `aq1r` lists writer notes as Out and does not say it must exclude them. Finding 8's request to name the representation's subject (`[[ ]]` text in the scene Plate documents that `lgz8` links) is also still open.

The fix is either one of these:
- Make `wknl`'s Done when require the exclusion in `projectProse`, or in whatever `667u`'s packet uses for nearby prose, with a test that the `aq1r` path drops notes.
- Add `wknl` to `aq1r`'s `blocked_by`, and add a Done when line to `aq1r` saying its scenario test asserts that no `[[ ]]` note text reaches the request.

## Finding 5: Nothing stops this mission's items starting before r7vd and mtkn deliver what they build on
Recommendation: fix now
Was: 1-p0uo.1
Now: fixed
This is the same fix as Finding 1. `o7to` includes `hqca`, so its apparatus test clause has a blocker.

## Finding 6: Tombstones (4t98) and the story collections (lgz8) have no agreed order and both change the IndexedDB schema
Recommendation: fix now
Was: 1-p0uo.2
Now: fixed
`4t98` is blocked by `lgz8` and its Goal names the story-bible collections. Its migration test now upgrades from the version after `lgz8`'s migration, and its Context records the reason for the order. `lgz8` still lists tombstones as Out, which is consistent.

## Finding 7: aq1r builds a second scene context builder alongside 667u's, and overlaps xodp on pins
Recommendation: fix now
Was: 1-p0uo.3
Now: fixed
The packet owner (`667u`), the viewer owner (`w4mr`) and the pin owner (`aq1r`) are now stated. "Clear breakdown" is gone. The test still names "vermilion AI segment provenance", which S4 already shipped, but it now also checks the assembled bible context and the edited passthrough, so the test is checkable. That is acceptable.

## Finding 8: Moved items keep notes and evidence targets that contradict their new home
Recommendation: fix now
Was: 1-p0uo.4
Now: fixed
`4t98` no longer mentions S9 or `3otd`, and its deferral note is gone. `xodp`'s contradictory notes were replaced by a re-planned Goal, and the `.impeccable/` upkeep remains in it as a part it can drop on its own. `wknl` got a note that lifts the old backlog condition. Its remaining gap (no defined subject, no link to the `667u` path) is carried by Finding 4, so this finding is not kept a second time.

## Finding 9: v61k is a needs-human item that agents will be offered, and it gates the mission's close on a purchase
Recommendation: fix now
Was: 1-p0uo.5
Now: fixed
This is the same fix as Finding 3. The mission can now close without the purchase.

## Finding 10: ji5d has two purposes, no stated conflict rule, and an untestable "without data loss"
Recommendation: fix now
Was: 1-p0uo.6
Now: kept
These parts are fixed:
- The proxy is split out into `gs9g`.
- The rule is stated: last writer wins by `updatedAt`/`deletedAt`, with a device-ID tie-breaker.
- Four test cases are named.
- `wrangler.jsonc` is in scope and keeps the `worldcrafter` name.
- Deployment is Out.
- `gs9g` puts the keys in Worker secrets.

Two parts that a revert cannot undo are still missing from `ji5d`:
- **Clock skew.** The change time is the client's clock. A device whose clock runs ahead wins every conflict, even against later edits. None of cases (a) to (d) covers this. Either add a skew case, or state that the Worker stamps the change time (or uses a server sequence) so device clocks do not decide.
- **Whole Plate documents.** A scene's prose is one record, so case (a) on a document means one device's offline writing session is replaced wholesale. Snapshots are device-local and get thinned by `my9t`, so nothing in the plan guarantees the losing text survives. Add a Done when line: before a pulled record overwrites a local document that changed since the last sync, the client takes a snapshot of the local version (or keeps the loser in a conflict copy), with a test.

## Finding 11: Snapshot thinning deletes the writer's data, and the Authority doesn't reserve that decision
Recommendation: fix now
Was: 1-p0uo.7
Now: fixed
The Authority now reserves "Destructive snapshot thinning rules (`worldcrafter-my9t`)" for Sumeet, and the success criterion says the policy is "approved by Sumeet".

## Finding 12: xodp's stale-pin fix can land on world-card pins that aq1r then replaces
Recommendation: defer
`xodp` is startable now (`blocked_by: []`), and its part 2 clears a stale pin in today's `unknown_pin` path (`app/src/context/builder.ts`). `aq1r` later moves pinning onto bible sections through `667u`'s packet. If the new path does not keep the behaviour, the stale-pin bug comes back. This is not serious. Whoever implements `aq1r` should keep `xodp`'s stale-pin test passing, or port it. A one-line note in `aq1r`'s Scope would cover it.
