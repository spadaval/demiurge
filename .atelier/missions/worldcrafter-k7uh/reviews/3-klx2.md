---
schema: atelier.review
schema_version: 3
round: 3
commit: bf60c66c1e84e8c416e0543318085dd7220c8faa
reviewers:
- 01a20582-02c9-72e3-92c1-1632940b6e1e
model: grok-4.6
verdict: approve
created_at: 2026-11-22T23:05:45.067525539Z
---

## Summary

Complexity: medium. Six items, repo cleanup plus Round 5 story-model bugs, and a new merge-check contract.
Value: high. Root `src/` and two live `span`/viewpoint defects sit in front of `worldcrafter-r7vd`.
Risk of merging the plan: low. 2x5z now names the leftover configs and v1 docs that Round 2 left unclassified, so ticking Done when cannot leave a root app whose scripts point at deleted files.

Checked `git diff bd690cd..bf60c66` on `.atelier/items/worldcrafter-2x5z/item.md`, then the item at bf60c66 against the tree: root `package.json` (scripts `dev`/`build`/`start` and the leftover dep tree), `biome.json` (`src/**/*`), `tsconfig.json`, `bun.lock`, `opencode.json`, `skills-lock.json`, `.prettierignore`, `.gitignore`, tracked `.tanstack/tmp`, `AGENTS.md` references to `docs/legend-state.md` and `docs/neverthrow.md`, and `docs/rebuild/data-model-boundaries.md` / `entity-pipeline.md` links to `docs/NER_OVERHAUL.md`. Walked every tracked top-level path and every `docs/` path against the new Remove and Explicitly keep lists. Did not re-review unchanged items, re-tally Rounds 2–5 spans, or run `app/` `bun run check`.

Both carried Round 2 findings are fixed. No new fix-now defect.

## Finding 1: 2x5z still does not say which leftover root files and v1 docs go
Recommendation: fix now
Was: 2-33q8.9
Now: fixed
Goal and Done when now share one list. Goal Remove names root `package.json` (the file, so leftover Vite scripts and the unused dep tree go with it), `bun.lock`, `tsconfig.json`, `biome.json`, `.prettierignore`, and each leftover v1 doc Round 2 named (`AI.md`, `BACKLOG.md`, `ENTITY_RECOGNITION_IMPROVEMENTS.md`, `docs/legend-state.md`, `docs/neverthrow.md`, `docs/NER_OVERHAUL.md`, `docs/DOCUMENT_OVERHAUL.md`, `docs/EDITOR_INTERNALS.md`, `docs/llama_*`, `docs/editor/`). Explicitly keep names `opencode.json` and `skills-lock.json` as agent/editor tool configs, and keep-list `docs/philosophy.md` plus `docs/rebuild/`, `docs/rounds/`, `docs/strategies/`, `docs/verdicts/`. Done when line 34 requires every Remove path deleted and every keep path intact. The incomplete `rg` is gone; Done when line 38 requires `cd app && bun run check && bun run build` with no root `package.json` or `node_modules`.

## Finding 2: 2x5z's Done when names only part of the root legacy app, so it could pass with most of that app left behind
Recommendation: fix now
Was: 2-fymd.9
Now: fixed
Root `package.json` is removed, not trimmed to seven packages. `tsconfig.json`, `biome.json`, and `bun.lock` are on the Remove line. `opencode.json` and `skills-lock.json` are kept with a reason. Done when line 36 requires links in `docs/rebuild/` and `AGENTS.md` that pointed at removed v1 docs to be updated or marked historical. An implementer who ticks today's checkboxes cannot leave the Vite scripts, the unused dep tree, or the unnamed v1 docs in place.
