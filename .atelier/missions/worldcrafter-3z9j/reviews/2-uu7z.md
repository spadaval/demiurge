---
schema: atelier.review
schema_version: 3
round: 2
commit: 16597c05b81461f878ec4e956a8f4817e19df8c0
reviewers:
- 01a2058c-9edd-7ab3-9066-b1762db3707f
model: grok-4.6
verdict: changes
created_at: 2026-11-22T23:17:22.678272979Z
---

## Summary

- Complexity: high. The mission still adds a Cloudflare Worker sync backend, an inference proxy, bible-backed prose generation, and inspector click-controls, and it still depends on `worldcrafter-r7vd` and `worldcrafter-mtkn`.
- Value: high. Sumeet directed this next step on 2026-11-22, once the unified store and Night Edition inspector exist.
- Risk of merging it: medium. Sequencing now stops bible UI, tombstones, and sync from starting on today's `world/` + `outline/` store, and `v61k` no longer gates close. Agreeing it as written still lets `aq1r` ship a context packet that includes writer notes, and still leaves whole-document last-write-wins for Plate prose unspecified.

Checked `git diff a7c274f..16597c0` (mission.md plus `4t98`, `aq1r`, `gs9g`, `ji5d`, `o7to`, `v61k`, `wknl`, `xodp`). Read the mission, all eight mission items, `gs9g`, and the sibling items named as blockers (`lgz8`, `667u`, `w4mr`, `7r87`, `wqh0`, `hqca`, `erje`). Against this tree I read `app/src/context/builder.ts` (`unknown_pin` still at line 167), `app/src/generate/profile.ts` (stable `name` vs `label` already shipped; `apiKey` on the client profile), `app/src/storage/types.ts` (`CollectionName` still the pre-lgz8 set; `Collection.save` last-write-wins at line 164), `app/src/layers/model.ts` (`[[ notes ]]` still literal prose), `app/wrangler.jsonc` (static assets, Worker name `worldcrafter`). Ran `atelier list --proposed --mission worldcrafter-3z9j` and `atelier list --startable`. `worldcrafter-my9t` is unchanged from round 1.

Could not check a live Night Edition inspector or Worker. Did not run `bun run check`. Did not buy or resolve `demiurge.ink`.

The value is worth the work after writer-notes exclusion is sequenced and `ji5d` names the remaining LWW cases that can drop prose.

## Finding 1: Items that need r7vd and mtkn have empty blocked_by
Recommendation: fix now
Was: 1-fa66.1
Now: fixed

`worldcrafter-aq1r` is blocked by `lgz8`, `667u`, and `w4mr`. `worldcrafter-o7to` is blocked by `lgz8`, `7r87`, `wqh0`, and `hqca`. `worldcrafter-4t98` is blocked by `lgz8`. `worldcrafter-ji5d` stays blocked by `4t98`, so it cannot start until the story collections exist. `atelier list --proposed --mission worldcrafter-3z9j` reports those blockers as open.

## Finding 2: aq1r overlaps 667u's context packet and xodp's pins
Recommendation: fix now
Was: 1-fa66.2
Now: fixed

`worldcrafter-aq1r` Goal and first Done-when consume `667u`'s packet and the shared `context-viewer.tsx`. Pin/exclude of bible sections sits on `aq1r`. `worldcrafter-xodp` keeps shortcuts, stale-pin clearing, missing-anchor recovery, and retarget behaviour, and its Out names `aq1r`'s bible wiring.

## Finding 3: v61k is a startable success criterion that must not change until the domain is bought
Recommendation: fix now
Was: 1-fa66.3
Now: fixed

`worldcrafter-v61k` is `mission: null`, labelled `needs-human`, and listed under Scope Out. Success criteria no longer include the domain cutover. `ji5d` keeps the Worker name `worldcrafter` until `v61k`.

## Finding 4: xodp and wknl were moved in without re-planning against the code that exists
Recommendation: fix now
Was: 1-fa66.4
Now: kept

`worldcrafter-xodp` is replanned: Goal lists the remaining defects, notes that stable profile `name` and the retarget info notice already shipped in `app/src/generate/profile.ts`, and drops the 3otd notes.

`worldcrafter-wknl` is not. Goal and Done-when are still the 2026-10-18 manuscript wording (`[[ notes ]]` as literal prose, apparatus in the workspace). The 2026-11-22 note only says the old backlog notes are superseded and that the item is scheduled here. It does not rewrite the work for the unified bible and the shared Context Viewer.

`worldcrafter-aq1r` Out names writer-notes representation as `wknl`'s, and neither item says `aq1r` must exclude notes from the packet it consumes. `aq1r` is blocked by `lgz8` / `667u` / `w4mr` only. `app/src/layers/model.ts` lines 161–176 still treat `[[ notes ]]` as the writer's own text in the prose, so nearby prose in a `667u` packet will carry them. The mission success criterion already requires notes excluded (`wknl`). Either block `aq1r` on `wknl`, or say in `aq1r` that the consumed packet's nearby prose must drop writer notes even if representation stays later.

## Finding 5: Nothing stops this mission's items starting before r7vd and mtkn deliver what they build on
Recommendation: fix now
Was: 1-p0uo.1
Now: fixed

Same blockers as Finding 1. `atelier list --proposed --mission worldcrafter-3z9j` shows `aq1r` and `o7to` blocked by the r7vd/mtkn items named in round 1.

## Finding 6: Tombstones (4t98) and the story collections (lgz8) have no agreed order and both change the IndexedDB schema
Recommendation: fix now
Was: 1-p0uo.2
Now: fixed

`worldcrafter-4t98` is blocked by `worldcrafter-lgz8`. Goal and Done-when name the story-bible collections. Context records the order so `DB_VERSION` bumps do not collide and tombstones cover those collections. `lgz8` still lists tombstones as Out.

## Finding 7: aq1r builds a second scene context builder alongside 667u's, and overlaps xodp on pins
Recommendation: fix now
Was: 1-p0uo.3
Now: fixed

`aq1r` consumes `667u`'s packet rather than assembling a second one. Pin/exclude is on `aq1r`; `xodp` Out names that wiring. The leftover "clear breakdown" wording is gone. The still-shipped vermilion provenance clause is Finding 12.

## Finding 8: Moved items keep notes and evidence targets that contradict their new home
Recommendation: fix now
Was: 1-p0uo.4
Now: kept

`worldcrafter-4t98` no longer points evidence at S9 or says it is deferred. `worldcrafter-xodp` restates which of its parts are still open.

`worldcrafter-wknl` still does not. Context still sends the implementer to `.impeccable/surfaces/writing-workspace.md` and `docs/rebuild/data-model-boundaries.md`. The 2026-11-22 note does not say the subject is `[[ ]]` text in scene Plate documents linked by `lgz8`. An implementer who starts `wknl` still has to guess whether the decision is about today's manuscript documents or the post-`lgz8` scene documents.

## Finding 9: v61k is a needs-human item that agents will be offered, and it gates the mission's close on a purchase
Recommendation: fix now
Was: 1-p0uo.5
Now: fixed

`v61k` is labelled `needs-human`, outside this mission, and out of the success criteria. Close no longer waits on buying `demiurge.ink`.

## Finding 10: ji5d has two purposes, no stated conflict rule, and an untestable "without data loss"
Recommendation: fix now
Was: 1-p0uo.6
Now: kept

The proxy is split into `worldcrafter-gs9g` (keys in Worker secrets or unproxied request headers; Out of `ji5d`). `ji5d` states last-write-wins per record by `updatedAt` / `deletedAt` with a device-ID tie-breaker, keeps the Worker name `worldcrafter` until `v61k`, and Outs live deployment. Tests named: concurrent edit, edit vs. delete, recreate after tombstone, offline reconnect.

The cases that still drop data without a stated rule are missing. `ji5d` Goal (`.atelier/items/worldcrafter-ji5d/item.md` lines 23–28) does not name clock skew, and does not say what happens when two devices edit the same Plate document (a large single record; `Collection.save` is already last-write-wins in `app/src/storage/types.ts` line 164). Whole-document LWW silently drops the losing scene's prose; a revert cannot restore it. Say whether that is acceptable for one writer, or keep the losing version as a device-local snapshot. Name a clock-skew case in the tests, or record that wall-clock LWW with skew is the accepted rule. "Deterministic device-ID tie-breaker" also needs where that ID is minted and stored.

## Finding 11: Snapshot thinning deletes the writer's data, and the Authority doesn't reserve that decision
Recommendation: fix now
Was: 1-p0uo.7
Now: fixed

Mission Authority now reserves destructive snapshot thinning (`worldcrafter-my9t`) for Sumeet. Success criterion 3 requires a device-local retention policy approved by Sumeet.

## Finding 12: aq1r's provenance test restates shipped S4 behaviour
Recommendation: defer

`worldcrafter-aq1r` third Done-when (`.atelier/items/worldcrafter-aq1r/item.md` line 31) still requires tests to "verify assembled bible context, edited request passthrough, and vermilion AI segment provenance". Vermilion AI-segment provenance is already shipped with S4. When `aq1r` starts, the new check is that the stored request holds the bible sections as sent.
