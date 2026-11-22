---
schema: atelier.review
schema_version: 3
round: 3
commit: fa5122f8fe25abc4345be1d05cf11848fb7f9713
reviewers:
- thread:delegated-task:command%3Amcp%3Af5bb1f7e-1300-43e3-aeec-a7cb0f0b7a66%3Adelegate-task%3A7febca17-c0e6-4f0c-b7ba-8d705c92b522
model: claude-opus-5-5
verdict: changes
created_at: 2026-11-22T23:23:40.356657559Z
---

## Summary

I read the Round 2 to Round 3 diff of `wknl`, `aq1r` and `ji5d`, and the full text of those items plus `667u` and `4t98`. I checked these claims against the tree at fa5122f:
- `projectProse` is at `app/src/content/projections.ts:264`.
- Its only production caller is `app/src/context/builder.ts:441`, so stripping notes there changes no export path.
- `app/src/layers/model.ts:162` treats `[[ ]]` as writer notes.
- Both Context files that `wknl` cites still exist.
- `StorageAdapter` has a `documents` collection and device-local `snapshots` (`app/src/storage/types.ts:209-214`).

I did not run `bun run check`, because this change touches only the plan. I could not check how `667u` will build "nearby prose", because that code is not written yet.

The `wknl`/`aq1r` findings are fixed. `ji5d` now addresses both Round 2 asks (clock skew and whole-document overwrite). The way it fixes skew opens a new data-loss path, which is Finding 6.

## Finding 1: xodp and wknl were moved in without re-planning against the code that exists
Recommendation: fix now
Was: 2-rd9h.4
Now: fixed
`wknl` now names its subject as `[[ ... ]]` notes in scene Plate documents. It places the exclusion in `projectProse`, and its Done when requires unit tests for multi-word, multiple and unclosed notes. `aq1r` has `worldcrafter-wknl` in `blocked_by`, and its scenario test asserts that no `[[ ... ]]` note reaches the request. Both of the Round 2 options were taken. The end-to-end test in `aq1r` catches a leak even if `667u`'s nearby prose does not go through `projectProse`.

## Finding 2: ji5d has two purposes, no stated conflict rule, and an untestable "without data loss"
Recommendation: fix now
Was: 2-rd9h.10
Now: fixed
Both Round 2 asks are met. The Worker stamps `syncedAt`, so device clocks do not decide, and test (e) covers skew. A pulled `Document` that overwrites a locally modified document is snapshotted first, and test (f) covers it. The `deviceId` is minted once per browser profile in `localStorage`. The receipt-order rule this adds has its own defect, which is Finding 6.

## Finding 3: xodp and wknl were moved in without re-planning against the code that exists
Recommendation: fix now
Was: 2-uu7z.4
Now: fixed
Same as Finding 1. `wknl`'s Goal and Done when are rewritten for scene Plate documents and `projectProse`. `aq1r` is blocked on `wknl` and tests that notes are excluded.

## Finding 4: Moved items keep notes and evidence targets that contradict their new home
Recommendation: fix now
Was: 2-uu7z.8
Now: fixed
`wknl`'s Goal now defines the subject as scene Plate documents. `projectProse` works on any content document, so the fix covers documents both before and after `lgz8`. The Context links that are left (`writing-workspace.md`, and Boundary 1 of `data-model-boundaries.md`) exist and still apply. The 2026-11-22 note records that the old backlog notes are superseded. `4t98` and `xodp` were already fixed in Round 2.

## Finding 5: ji5d has two purposes, no stated conflict rule, and an untestable "without data loss"
Recommendation: fix now
Was: 2-uu7z.10
Now: fixed
Same as Finding 2. Skew is handled by the server stamp and covered by test (e), and the Plate overwrite guard is covered by test (f). The `deviceId` origin is stated. The proxy split and the keys in Worker secrets were already fixed in Round 2.

## Finding 6: Receipt-order LWW lets a stale device that reconnects overwrite newer prose with no snapshot
Recommendation: fix now
`ji5d` Goal and Done when (`.atelier/items/worldcrafter-ji5d/item.md`, lines 23-29) now order writes by Worker receipt time (`syncedAt`). That makes the last device to sync the winner, not the last device to edit. The snapshot guard only fires on the pulling side, and only when the local document "changed since the last sync". Here is the case it misses:

1. The phone goes offline holding an older version of scene X and makes a small edit.
2. The laptop then writes a long passage in X and syncs it.
3. The phone reconnects and pushes. Its version has the later `syncedAt`, so it wins at the Worker.
4. The laptop pulls. Its copy of X has not changed since its last sync, so no snapshot is taken, and the laptop's newer passage is silently replaced.

The newer text now exists on no device, and a revert cannot bring it back. The same rule lets the stale device's edit bring back a record that the other device deleted later. That may be acceptable, but the plan does not say so. The plan also does not say whether a client pulls before it pushes, and it does not name the per-record "modified since last sync" marker that the guard depends on.

How I know: the rule and the guard as written in the item, traced through this sequence. None of tests (a) to (f) fixes which side wins when the stale device syncs last.

Fix: give each push a base version, the `syncedAt` of the server copy the client last pulled for that record. The Worker rejects or flags a push whose base is older than the current server version. The client then keeps the losing local `Document` as a device-local snapshot or conflict copy before it accepts the server version. Name where the dirty and base markers live. State the rule for non-document records and for edit-after-delete. Add a test: a stale offline device edits X, the other device edits and syncs X later, the stale device reconnects, and both versions of the prose can still be recovered.
