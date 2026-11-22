---
schema: atelier.review
schema_version: 3
round: 1
commit: d07569c619a6e3b3b76c11b2ffc2787868362f14
reviewers:
- 01a20570-9943-77d0-86bf-d4630d0d8bec
model: grok-4.6
verdict: changes
created_at: 2026-11-22T22:46:42.749053690Z
---

## Summary

Complexity: medium. Six items, two kinds of work (repo cleanup and Round 5 story-model bugs), and a new merge-check contract.
Value: high. Root `src/`, stale PRODUCT.md/README.md/AGENTS.md, and two live `span`/viewpoint defects sit in front of `worldcrafter-r7vd`.
Risk of merging the plan: medium. The bugs and the merge check are well evidenced; retiring `src/` and rewriting PRODUCT.md as written can drop keep-list code or erase settled history.

Checked the mission, all six items, and this branch's diffs (`a28b1b6`, `63ad07e`, `d07569c`) against the tree at `d07569c`: root `src/` vs `app/`, `PRODUCT.md`, `README.md`, `AGENTS.md`, `package.json`, `.atelier/config.toml`, `app/src/story/calendar.ts:423`, `app/src/story/calendar.test.ts`, `app/src/story/learning.ts` (`shownFrom`), `app/src/generate/generate.test.ts` (the `stays fast` cases), `docs/rounds/round-5/reading.md`, `docs/strategies/notes-first.md`, `docs/rebuild/story-model.md`, 3otd's remaining plan, and garden `worldcrafter-gq2k` P1 on branch `worldcrafter-gq2k`. The Round 5 span and viewpoint defects are still in the code; the timing tests still use a 10s wall-clock bound.

Could not re-tally Rounds 2–5 `span` counts, reproduce the load-13+ flake, or run `app/` `bun run check` on this host. Sumeet's 2026-11-22 direction is recorded only in this mission's Why.

## Finding 1: AGENTS.md and README are assigned to two items at once
Recommendation: fix now
Mission success criteria (`.atelier/missions/worldcrafter-k7uh/mission.md` line 26) say `AGENTS.md`, `PRODUCT.md` and `README.md` are updated by `worldcrafter-j8gz`. `worldcrafter-j8gz` Scope is only `PRODUCT.md` and `README.md` (item lines 31–32); AGENTS.md is not in its Done when. `worldcrafter-2x5z` Goal still says "Update AGENTS.md and README to describe the new app" (item lines 21–23), and its Done when has no doc checkbox, only "Delivers S8". Two implementers will both edit README.md; AGENTS.md has no Done when that matches the mission criterion. Give AGENTS.md to one item, README.md to one item, and make those files appear in that item's Done when.

## Finding 2: worldcrafter-2x5z was moved onto this mission without being rewritten
Recommendation: fix now
The item still reads as a 3otd leftover. Unknowns (item line 32) still ask whether root `src/` can go; the mission Outcome already decides it can (`mission.md` line 22). Done when (item line 28) still says "Delivers S8" of 3otd, with no list of paths. Outcome's "app/ only" is easy to over-read: root still holds `.atelier/`, `docs/`, `PRODUCT.md`, `DESIGN.md`, `AGENTS.md`, and `app/`. Spell out what is deleted (`src/`, root Vite/TanStack Start/tRPC/Legend State/transformers/tiptap and their dependencies) and what stays. Notes still dump `app/` leftovers (`app/src/smoke.test.ts`, two `Provenance` types in `world/facts.ts` vs `generate/provenance.ts`, two `JsonValue` types in `llm/types.ts` vs `storage/types.ts`) into this item with no Done when line; either add them or move them out. `entity-suppression.ts` still exists only under `src/lib/` and is on 3otd's keep-list (`.atelier/missions/worldcrafter-3otd/design.md`); 2x5z's Goal says to remove `entity-*` modules. Name that drop in the item, because 3otd Authority required Sumeet for dropping a keep-list item and this mission's Authority does not.

## Finding 3: j8gz Done when tells PRODUCT.md to deny decision worldcrafter-03rp
Recommendation: fix now
Done when (`.atelier/items/worldcrafter-j8gz/item.md` line 25) requires PRODUCT.md "no longer claiming the typed model ended under `worldcrafter-03rp`". That ending is historical: `docs/strategies/structure-first.md` and `docs/verdicts/` record it. `docs/strategies/notes-first.md` is already superseded (2026-11-05, decision `worldcrafter-jeue`); `docs/rebuild/story-model.md` already says the model is back as the author's bible. PRODUCT.md is stale against jeue and the 2026-11-22 direction, not against a reversal of 03rp. Rewrite the Done when: 03rp stays as history, notes-first is named as superseded, and the current direction is a typed-store web app with Night Edition UI and an app-owned agent runtime still to be built (`worldcrafter-r7vd`). The Goal already says "direction"; the Done when must not be read as claiming that runtime ships in this mission.

## Finding 4: j8gz and 2x5z both edit README.md with no order
Recommendation: fix now
`worldcrafter-j8gz` Done when line 26 rewrites README.md for `app/`. `worldcrafter-2x5z` Goal still updates README as it deletes `src/`. Neither `blocked_by` the other. Put README on one item, or block j8gz on 2x5z so the structure change lands first.

## Finding 5: 08kf still names the old generate path and a host-load proof this machine may not offer
Recommendation: defer
Context (`.atelier/items/worldcrafter-08kf/item.md` line 29) talks about "branches that don't touch src/generate". The tests live at `app/src/generate/generate.test.ts:1010` and still assert `elapsed < 10_000`. Done when requires the suite to pass repeatedly at load average 13+. Keep the deliberately slowed parser as the portable proof; treat the load-13+ rerun as extra evidence, not the only one.

## Finding 6: Garden P2 (caused_by on 08kf and yxfp) is still unset
Recommendation: defer
`worldcrafter-gq2k` P2 asked to set `caused_by` on these two bugs or drop them. This plan opens both and leaves `caused_by: null`. It does not block the mission. Set it when someone next touches the items, or take P2 as a follow-up.
