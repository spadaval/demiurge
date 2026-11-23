---
schema: atelier.item
schema_version: 3
id: worldcrafter-2x5z
title: Retire the old app and its dependencies
status: in_review
mission: worldcrafter-k7uh
labels:
- rebuild
- feature
priority: medium
blocked_by: []
implementers:
- thread:delegated-task:command%3Amcp%3A19a62698-b51c-422f-9aec-662edcca5fd6%3Adelegate-task%3A238b3c3c-a85b-4e4e-b578-5089a11fc416
ready: null
trivial: null
caused_by: null
created_at: 2026-10-17T07:07:33.752717474Z
---

## Goal

Retire the legacy v1 root app and all of its root configs, dependencies, and v1-only docs so `app/` is the sole application in the repository, and rewrite `AGENTS.md` to describe `app/` only. Port keep-list `src/lib/entity-suppression.ts` (and its test) into `app/src/world/` before deleting `src/` so no keep-list module is lost.

**Remove:**
- Legacy root app & configs: `src/`, `public/`, `package.json`, `bun.lock`, `vite.config.ts`, `tailwind.config.mjs`, `components.json`, `openapi-ts.config.ts`, `tsconfig.json`, `biome.json`, `test-document.md`, `.prettierignore` (since `app/` is self-contained with its own `package.json`, `bun.lock`, `tsconfig.json`, `biome.json`, and `vite.config.ts`).
- Legacy v1 docs: `AI.md`, `BACKLOG.md`, `ENTITY_RECOGNITION_IMPROVEMENTS.md`, `docs/legend-state.md`, `docs/neverthrow.md`, `docs/DOCUMENT_OVERHAUL.md`, `docs/NER_OVERHAUL.md`, `docs/EDITOR_INTERNALS.md`, `docs/llama_openapi.json`, `docs/llama_server.md`, and `docs/editor/`.

**Explicitly keep (with reasons):**
- `app/` (the active application), `.atelier/` (work tracking), `.impeccable/` (design system metadata), agent/editor tool configs (`opencode.json`, `skills-lock.json`, `.agents/`, `.agent/`, `.claude/`, `.codex/`, `.gemini/`, `.qwen/`, `.vscode/`), top-level active docs (`AGENTS.md`, `PRODUCT.md`, `README.md`, `DESIGN.md`), and keep-list/active `docs/` (`docs/philosophy.md`, `docs/rebuild/`, `docs/rounds/`, `docs/strategies/`, `docs/verdicts/`).

## Done when

- [x] `src/lib/entity-suppression.ts` and `src/lib/entity-suppression.test.ts` are ported into `app/src/world/` (adapting `EntityType` to `app/src/world/kinds.ts`) and pass under `cd app && bun test`.
- [x] Every file and directory listed under **Remove** above is deleted (`src/`, `public/`, root `package.json`, `bun.lock`, `vite.config.ts`, `tailwind.config.mjs`, `components.json`, `openapi-ts.config.ts`, `tsconfig.json`, `biome.json`, `test-document.md`, `.prettierignore`, `AI.md`, `BACKLOG.md`, `ENTITY_RECOGNITION_IMPROVEMENTS.md`, and the listed legacy v1 `docs/` files), and every file listed under **Explicitly keep** remains intact.
- [x] Any links in `docs/rebuild/` or `AGENTS.md` that pointed to removed legacy v1 docs are updated or marked as historical so no broken local links remain.
- [x] `AGENTS.md` Architecture, Commands, and File Structure sections describe `app/` only (no `src/`, Legend State, TanStack Start, or tRPC). Note: merge approved garden branch `worldcrafter-gq2k` first (or reconcile its `AGENTS.md` edit cleanly).
- [x] `cd app && bun run check && bun run build` pass cleanly with no root `node_modules` or root `package.json` present.

## Scope

In: Removing legacy root app code/configs/deps/v1-docs, porting `entity-suppression.ts`, fixing any resulting broken links in `docs/rebuild/`, and rewriting `AGENTS.md`.
Out: Updating `PRODUCT.md` and `README.md` (owned by `worldcrafter-j8gz`), and unrelated `app/` internal refactors (`Provenance`/`JsonValue` deduplication, `smoke.test.ts`).

## Report

The legacy v1 root app is gone and `app/` is the only application. The repository root has no `package.json`, lockfile or `node_modules`.

- **Port:** `app/src/world/entity-suppression.ts` and its test. `EntityType` (`location | organization | person`) became `Kind` from `kinds.ts`, and the signature field is `kind`. One deliberate change from the original: the store is passed in as a `KeyValueStore` (localStorage in the browser) instead of read from a global `window`, as `app/src/workspace/tabs.ts` does. The tests use an in-memory store and need no global shim. Stored data is now checked entry by entry when read, because `noUncheckedIndexedAccess` and the app's rules don't allow trusting a cast. The storage key stays `entitySuppressionStore`. I added two tests, for case- and whitespace-insensitive matching and for unreadable stored data, and the cap test now asserts exactly 1000. There are 7 tests and all pass.
- **Removed:** every path under **Remove**. I also removed the untracked `.tanstack/` build cache and its `.gitignore` line, since only the old TanStack Start app wrote it. Every path under **Explicitly keep** is untouched.
- **Links:** `docs/rebuild/` had no markdown links to removed files. Its three plain-text references (`entity-pipeline.md`, `data-model-boundaries.md`, `talk-pages.md`) now say the files were removed with the old app and are in Git history. `entity-pipeline.md` points at the new suppression module.
- **AGENTS.md:** the gq2k edit was already in my base. Commands, Architecture and File Structure now describe `app/` only. The dev-server warning now covers any watch command, because `app/` has no `bun dev`.
- **Checks:** `cd app && bun run build` passes. `bun run check` passed everything except one test, `story CLI > --help lists every command…`, which timed out at 5s with load average around 25. That test spawns dozens of CLI processes, and this change doesn't touch it. With `--timeout 60000`, all 30 tests in `scripts/story.test.ts` pass. This is the same host-load flakiness as `worldcrafter-08kf`. I'll re-run the full check at merge.

