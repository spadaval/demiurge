---
schema: atelier.review
schema_version: 3
round: 1
commit: a7c274fcd260377ebda8966d8e6ca01384bde585
reviewers:
- thread:delegated-task:command%3Amcp%3Af5bb1f7e-1300-43e3-aeec-a7cb0f0b7a66%3Adelegate-task%3A33ec7ea8-d99f-4492-a784-1ee9ba51bb52
model: claude-opus-5-5
verdict: changes
created_at: 2026-11-22T22:46:14.207267354Z
---

## Summary

I read the mission record and all eight items at a7c274f, and the diff against `master` (three commits: the mission, its items, and the planner stamp on `worldcrafter-3otd`). I checked the items' claims against the code: `app/src/story/commands.ts` (every command `worldcrafter-o7to` needs exists: `answerOpenQuestion`, `unanswerOpenQuestion`, `rejectCandidate`, `moveScene`, `setSceneViewpoint`, `setCount`, `markGapDeliberate`), `app/src/context/builder.ts` (the `unknown_pin` failure is still there), `app/src/generate/profile.ts` (profiles are still keyed by `name`, with `apiKey` stored on the profile), `app/wrangler.jsonc` (static assets only, Worker named `worldcrafter`) and `app/src/storage/`. I also read the sibling plan branches `worldcrafter-k7uh`, `worldcrafter-r7vd` and `worldcrafter-mtkn`, because this mission's Why says it starts once r7vd and mtkn work, and items there (`worldcrafter-lgz8`, `worldcrafter-667u`, `worldcrafter-wqh0`) overlap items here.

I could not check decisions `worldcrafter-gcox`, `worldcrafter-2y4g`, `worldcrafter-03rp` or `worldcrafter-p3k7`: none has a record under `.atelier/`, so I took the items' descriptions of them on trust. I did not run any code.

## Finding 1: Nothing stops this mission's items starting before r7vd and mtkn deliver what they build on
Recommendation: fix now
The Why says the mission begins "once the unified story store, app-owned agent runtime (`worldcrafter-r7vd`), and Night Edition inspector (`worldcrafter-mtkn`) are working", but only `worldcrafter-ji5d` has a blocker, and that one is inside the mission. `worldcrafter-aq1r` reads "the unified story bible", which `worldcrafter-lgz8` (r7vd) creates. `worldcrafter-o7to` adds controls "to the Night Edition bible inspector", which `worldcrafter-wqh0` (mtkn) builds, and it must "surface kept contradictions or `trace` suspects", which today's `applyStoryCommand` does not return; the structured result comes from `worldcrafter-7r87` (r7vd). Its tests also check "live inspector/apparatus views" (`worldcrafter-hqca`). As written, once this mission is agreed `atelier status` will offer aq1r and o7to as startable, and an implementer would have to build or stub the store and inspector themselves. Cross-mission blockers are already used (`worldcrafter-lhh3` is blocked by `worldcrafter-yx9v`). Set `blocked_by` on aq1r (lgz8, 667u) and o7to (lgz8, 7r87, wqh0, and hqca if its tests keep the apparatus clause).

## Finding 2: Tombstones (4t98) and the story collections (lgz8) have no agreed order and both change the IndexedDB schema
Recommendation: fix now
`worldcrafter-4t98` requires tombstones for "every keyed collection except snapshots" and says "New story collections, when the app stores the story model, are built on this". `worldcrafter-lgz8` on the r7vd branch adds 14 story collections to `StorageAdapter` and lists "Sync tombstones (`worldcrafter-4t98`)" as Out. Neither blocks the other. If 4t98 lands first, lgz8 adds collections without tombstones and nobody owns retrofitting them. If lgz8 lands first, 4t98's "every keyed collection" silently grows by 14 and its migration test ("writes records into every collection of a database at the old version") covers a schema it never planned for. Run in parallel, both bump `DB_VERSION` in `app/src/storage/indexeddb.ts` and collide. 4t98's own note (2026-10-30) says to "plan it again when the app's story storage is built", which points to the order: block 4t98 on lgz8 and name the story collections in its Done when. The other order works too if lgz8 is then told to build on tombstones. Either way, write the order down.

## Finding 3: aq1r builds a second scene context builder alongside 667u's, and overlaps xodp on pins
Recommendation: fix now
`worldcrafter-667u` (r7vd) already builds "a deterministic context packet assembled from the store (including `reader-order --before`, opening counts, viewpoint marks, and relevant records)", with a prose-finishing profile. `worldcrafter-aq1r` asks `app/src/context/builder.ts` to assemble the same scene context from the same bible for prose generation. Nothing says whether aq1r reuses 667u's packet or 667u reuses `builder.ts`, so two implementers will each write one and they will drift (different `--before` cut-offs or count snapshots for the same scene). Say which module owns scene context and make the other a consumer.

aq1r also asks that the writer can "pin, or exclude bible sections in the request slip", while `worldcrafter-xodp` owns "a way to pin or exclude world cards from the request slip (and to clear a stale pin, which currently fails the build with `unknown_pin`)". aq1r's Out names only xodp's shortcuts and profile retargeting. Assign pin and exclude to one of them.

Smaller points in aq1r: "with a clear breakdown in the Context Viewer" is not checkable, and "vermilion AI segment provenance" is behaviour S4 already shipped, so the test should say what is new (for example, that the stored request holds the bible sections as sent).

## Finding 4: Moved items keep notes and evidence targets that contradict their new home
Recommendation: fix now
Five items were changed from `draft` to `open` and given the new mission, with their bodies unchanged:
- `worldcrafter-4t98` Done when ends "Evidence recorded against S9", and Context points to "S9 in `.atelier/missions/worldcrafter-3otd/`". This mission has no S9. Its storage criterion is the third success criterion here, so point the evidence at that criterion. Its 2026-10-30 note still says it is deferred (decision `worldcrafter-2y4g`) without saying that the 2026-11-22 direction lifts the deferral.
- `worldcrafter-wknl`'s 2026-11-05 note says it "stays in the loose backlog ... and is re-planned only if the notes-first mission (`worldcrafter-p3k7`) shows the product needs an app". Its Context sends readers to `docs/rebuild/data-model-boundaries.md` and the superseded story-model era. Add a note recording that the 2026-11-22 direction meets that condition, and say whether writer notes are now `[[ ]]` text in scene Plate documents linked by lgz8, so the decision has a defined subject.
- `worldcrafter-xodp`'s 2026-10-18 note says "The stable profile ID item is being done in 2tz9", but `app/src/generate/profile.ts` still keys profiles by `name`. Its 2026-10-29 note says to re-plan it under `docs/rebuild/story-model.md`, and its 2026-10-30 note says it "stays with the rebuild (worldcrafter-3otd)". It is now in neither. Its Goal also bundles `.impeccable/design.json` and surface-brief upkeep that has nothing to do with generation ergonomics. Restate which of its parts are still open.

An implementer who reads these items in order gets instructions that conflict.

## Finding 5: v61k is a needs-human item that agents will be offered, and it gates the mission's close on a purchase
Recommendation: fix now
`worldcrafter-v61k` says "until then nothing here should change", and its Done when needs Sumeet to buy the domain and to decide about data at the old origin. It carries no `needs-human` label and no blocker, so `atelier status` already lists it under "Can start now". The fourth success criterion ("Once Sumeet acquires `demiurge.ink` ...") means the mission cannot be closed until a purchase with no date. Label v61k `needs-human` (as `worldcrafter-54d6` and `worldcrafter-lfyv` are), and either take it out of the mission or reword the criterion so the mission can close with the cutover recorded as waiting on Sumeet.

## Finding 6: ji5d has two purposes, no stated conflict rule, and an untestable "without data loss"
Recommendation: fix now
`worldcrafter-ji5d` holds a sync backend and an inference proxy. They share a Worker but have different risks, tests and reverts, so one merge can't be reverted without the other. Split the proxy into its own item.

For sync, the Done when says "conflict handling documented and tested" and "without data loss" but names no rule or scenarios. Data loss is the one failure here a revert can't undo, so the plan should fix the rule (for example, last writer wins per record by `updatedAt`, with a tombstone beating an older edit) and name the cases the tests cover: both devices edit the same record offline; one deletes while the other edits; the clocks are skewed; a device has been offline past any tombstone retention. Plate documents are large single records, so say whether a whole-document last-writer-wins is acceptable for prose or needs a guard such as keeping the losing version as a snapshot.

For the proxy, keys live today on the client profile (`apiKey` in `app/src/generate/profile.ts`). Say whether they move to Worker secrets, so that "without exposing provider API keys" has a concrete meaning.

ji5d also turns `app/wrangler.jsonc` from "Static assets only" into a Worker with routes and bindings, the file v61k renames, and its Cloudflare Access setup is a deploy step that the Authority reserves for Sumeet. Note both so the implementer stops at local tests.

## Finding 7: Snapshot thinning deletes the writer's data, and the Authority doesn't reserve that decision
Recommendation: fix now
`worldcrafter-my9t` ends in "a recorded decision on retention" and possibly code that removes snapshots. Revision snapshots are append-only by an earlier decision (`worldcrafter-js76`), and a thinning bug can't be reverted, because the deleted snapshots are gone. The mission's Authority lets agents choose "UI ergonomics, sync wire format, and Worker implementation details" and is silent on retention. Add that a retention policy which deletes snapshots needs Sumeet's yes, or have my9t's Done when require it.

## Finding 8: Minor wording
Recommendation: no action
`worldcrafter-o7to`'s Out says "all 12 story record types", but lgz8 lists 14 story collections. The mission's Why uses em dashes and "Codex → VS Code axis", which a reader without the 2026-11-22 conversation won't follow. Neither blocks the work.
