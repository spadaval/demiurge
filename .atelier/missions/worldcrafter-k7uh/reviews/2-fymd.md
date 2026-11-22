---
schema: atelier.review
schema_version: 3
round: 2
commit: bd690cd1701c7b9d57a3e278524ef9f3e39a798d
reviewers:
- thread:delegated-task:command%3Amcp%3Af5bb1f7e-1300-43e3-aeec-a7cb0f0b7a66%3Adelegate-task%3A4efb4ad1-f018-460b-b486-86a0c58a959a
model: claude-opus-5-5
verdict: changes
created_at: 2026-11-22T22:58:01.477194416Z
---

## Summary

I read the diff from d07569c to bd690cd for the mission and its five changed items, and checked each carried finding against the files. I checked the claims the new text rests on: `docs/rounds/round-5/reading.md:198-201` (a bystander's own knowledge record decides before presence, shown in s25 with `brannoc-knows-lampwick --since closing-bell`), `app/src/story/learning.ts:355-385`, the root tree and `package.json`, `app/biome.json` (`"root": true`) and the root `tsconfig.json` (excludes `app`), and `src/lib/entity-suppression.ts`'s imports. I did not run any code or tests; this is a plan review.

Seven of the eight carried findings are fixed. Doc ownership is now single (2x5z owns `AGENTS.md`, j8gz owns `PRODUCT.md` and `README.md`, j8gz is `blocked_by` 2x5z, and gq2k is to merge first). j8gz keeps 03rp and jeue as history. 0pt4 states its rule and why it doesn't pre-empt lfyv. 2x5z's Unknown and provisional line are gone, the `app/` refactors are scoped out, and `entity-suppression.ts` is ported rather than dropped.

One new blocker remains in the rewritten 2x5z (Finding 9): its Done when names only part of the root legacy app, so it could be ticked with most of that app still in the repository.

## Finding 1: The 2026-11-22 direction that j8gz writes into PRODUCT.md is recorded nowhere as a decision, and j8gz would erase settled history
Recommendation: fix now
Was: 1-21ws.1
Now: fixed
The mission's Why now records Sumeet's 2026-11-22 direction and says it supersedes 03rp and notes-first while keeping both as history, and 3otd's drop cites it. j8gz's Done when now preserves 03rp and jeue and separates what ships from what r7vd plans. A separate decision item would be tidier, but the mission is now the named record, and a docs change is easy to revert.

## Finding 2: AGENTS.md and README.md have two owners, or none, and nothing orders them against each other or against gq2k
Recommendation: fix now
Was: 1-21ws.2
Now: fixed
2x5z owns `AGENTS.md`, j8gz owns `PRODUCT.md` and `README.md`, and each item's Scope Out names the other's files. j8gz is `blocked_by` 2x5z. The mission's Out and 2x5z's `AGENTS.md` line both say to merge gq2k first.

## Finding 3: 2x5z's Done when is still "Provisional" and its Unknown is open, though the mission now commits to removing all of root `src/`
Recommendation: fix now
Was: 1-21ws.3
Now: fixed
The Unknown and the provisional line are gone, the `app/` refactors are moved to the mission's Out, and the Done when lines can be checked. The new list is incomplete, which Finding 9 covers.

## Finding 4: 0pt4 drops the viewpoint-secret exception while how knowledge reaches people waits on Sumeet (lfyv)
Recommendation: fix now
Was: 1-21ws.4
Now: fixed
The rebuttal holds. `reading.md:201` shows that a bystander's own knowledge record already decides before presence is consulted (Brannoc in s25), so the reading's fix doesn't need the lfyv rule. 0pt4 now says this, and its Done when keeps the whispered-secret case as a guard.

## Finding 5: AGENTS.md and README are assigned to two items at once
Recommendation: fix now
Was: 1-klyn.1
Now: fixed
Same as Finding 2. Each file now has one owner, and that owner's Done when names it.

## Finding 6: worldcrafter-2x5z was moved onto this mission without being rewritten
Recommendation: fix now
Was: 1-klyn.2
Now: fixed
2x5z is rewritten: it no longer says "Delivers S8", the Unknown is gone, the deleted paths are listed, the `app/` refactors are out of scope, and `entity-suppression.ts` is ported, so no keep-list module is dropped. The path list is incomplete, which Finding 9 covers.

## Finding 7: j8gz Done when tells PRODUCT.md to deny decision worldcrafter-03rp
Recommendation: fix now
Was: 1-klyn.3
Now: fixed
j8gz's Done when now keeps 03rp and jeue as history, retires notes-first as the active approach, and separates shipped `app/` from planned r7vd, mtkn and 3z9j.

## Finding 8: j8gz and 2x5z both edit README.md with no order
Recommendation: fix now
Was: 1-klyn.4
Now: fixed
j8gz is `blocked_by` 2x5z, and 2x5z's Scope Out gives `README.md` to j8gz.

## Finding 9: 2x5z's Done when names only part of the root legacy app, so it could pass with most of that app left behind
Recommendation: fix now
The mission's Outcome and first criterion retire root `src/` "and its unused root dependencies/configs". `app/` is self-contained: `app/biome.json` is `"root": true`, `app/tsconfig.json` doesn't extend the root one, and the root `tsconfig.json` excludes `app` and maps `~/*` to `./src/*`. So every root config belongs to the legacy app. 2x5z's removal line (`.atelier/items/worldcrafter-2x5z/item.md`, Done when line 2) still leaves out several of them:
- `tsconfig.json`. The Goal names it, but no Done when line does.
- `biome.json`, `bun.lock`, `opencode.json` and `skills-lock.json`. Each should be removed or kept with a reason.
- Root `package.json`. The line removes only seven packages. Root `package.json` would keep about 100 legacy dependencies (`@ai-sdk/*`, `ai`, all of `@platejs/*`, `platejs`, `@tanstack/react-query`, `@tanstack/react-router*`, `@tanstack/devtools-vite`, and more), plus `dev`, `build` and `start` scripts that point at the deleted `vite.config.ts`.
- The old app's root docs: `AI.md`, `BACKLOG.md`, `ENTITY_RECOGNITION_IMPROVEMENTS.md`, and in `docs/`, `legend-state.md`, `neverthrow.md`, `NER_OVERHAUL.md`, `DOCUMENT_OVERHAUL.md`, `EDITOR_INTERNALS.md`, `llama_*` and `editor/`. The current `AGENTS.md` sends agents to `docs/legend-state.md` and `docs/neverthrow.md`. `docs/rebuild/data-model-boundaries.md` and `docs/rebuild/entity-pipeline.md` link some of them, so links break if they go.

The `rg` line checks only three package names, in `package.json`, `app/package.json` and `app/src`. It can't catch any of the above.
Fix: say what happens to root `package.json`: remove it, or cut it to an empty or workspace-only manifest with no app scripts. Add `tsconfig.json`, `biome.json` and `bun.lock` to the removal line. Add a line that each other root-level file and each legacy `docs/` file is removed or kept with a reason, and that no remaining doc links to a removed file. That last part could also go on j8gz.

## Finding 10: The `entity-suppression.ts` port depends on a root type, and nothing in `app/` uses the module yet
Recommendation: no action
`src/lib/entity-suppression.ts:1` imports `EntityType` from `~/lib/entity-types`, which lives in root `src/` and is about to be deleted. The port will have to use `app/`'s own kind type (`app/src/world/kinds.ts`) or carry the type across. Nothing in `app/` would call the ported module, so the port keeps the module for recognition work later (`worldcrafter-eh1z`). That fits the keep-list intent. This note is for the implementer and needs no plan change.

