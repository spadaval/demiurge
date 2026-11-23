---
schema: atelier.review
schema_version: 3
round: 1
commit: 82c0cca29e9134dc369052db09f71482a7ec34f4
reviewers:
- 01a20649-cc1b-7a53-b88a-cc2d849fd20b
model: grok-4.6
verdict: changes
created_at: 2026-11-23T02:43:53.607218822Z
---

## Summary

Complexity: low. Two markdown files, no new moving part.
Value: high. PRODUCT.md and README.md are what agents and humans read for the current direction, and they were a full strategy behind.
Risk of merging it: low. Docs only, cheap to undo; the remaining defect is a wrong mission name on one Undecided line.

Checked `git diff master...82c0cca` (PRODUCT.md, README.md, this item). Read both files in full and walked every Markdown link and backtick path: all named files exist; the only non-files are `https://bun.sh/` and `app/dist/` as build output. Grep of PRODUCT.md and README.md found no `TanStack Start`, Legend State, tRPC, `bun dev` as a script, Tailwind, or root `src/`. `notes-first.md` appears only as history.

Against the tree: no root `package.json` or `src/`; `app/package.json` scripts match the README commands; `bun scripts/story.ts --help` from `app/` runs and describes a JSON-file bible; `app/src/app/router.tsx` uses `createHashHistory`; `StorageAdapter` is the interface in `app/src/storage/types.ts` and has no story-bible collection; `app/src/llm/` is SSE over OpenAI-compatible backends (`llamacpp` / `openrouter` / `generic`) with no tool-calling; `app/src/app/rail.tsx` has Manuscript / World / Topics; `app/src/layers/model.ts` and `styles.css` are paint-only Night Edition; `DESIGN.md` is Night Edition; `app/wrangler.jsonc` hosts `./dist`. Read missions `worldcrafter-k7uh`, `r7vd`, `mtkn`, `3z9j`, dropped `3otd`, `docs/strategies/{structure-first,notes-first,world-demo}.md`, and `docs/rounds/README.md` for the history and planned-work claims.

Did not run `cd app && bun run check` (no code change). Did not fetch `https://bun.sh/`. Did not audit every DESIGN.md token against `styles.css` beyond the shared colour and type tokens at the top of both files.

The Done when lines hold except for the Undecided mis-assignment below. 03rp and jeue stay as history; notes-first is not the active approach; shipped `app/` is listed separately from r7vd / mtkn / 3z9j; README stack, commands and layout match the post-2x5z tree.

## Finding 1: Undecided assigns the non-actor entry-document question to r7vd, which defers it
Recommendation: fix now
`PRODUCT.md` line 68: "whether non-actor world kinds (places, cultures, magic systems and the like) need their own entry documents beside the bible, settled during the UI migration in mission worldcrafter-r7vd."

`worldcrafter-r7vd`'s unification rule (`.atelier/missions/worldcrafter-r7vd/mission.md` line 26) keeps those kinds as world facts and existing `worldEntries` "until the UI migration settles whether a dedicated entry-document link is needed." That same mission (line 25 and Scope Out) leaves `app/src/world/`, `outline/` and `time/` intact "until UI consumers migrate in `worldcrafter-mtkn` and `worldcrafter-3z9j`." r7vd does not settle this question; it defers it. The item's first Done when line is specifically the shipped-vs-planned split across those three missions, so naming r7vd here sends later work to the wrong owner.

Fix: say the question waits on the UI migration in `worldcrafter-mtkn` / `worldcrafter-3z9j`, or drop the mission name and leave it as undecided.
