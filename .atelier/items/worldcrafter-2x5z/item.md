---
schema: atelier.item
schema_version: 3
id: worldcrafter-2x5z
title: Retire the old app and its dependencies
status: building
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

- [ ] `src/lib/entity-suppression.ts` and `src/lib/entity-suppression.test.ts` are ported into `app/src/world/` (adapting `EntityType` to `app/src/world/kinds.ts`) and pass under `cd app && bun test`.
- [ ] Every file and directory listed under **Remove** above is deleted (`src/`, `public/`, root `package.json`, `bun.lock`, `vite.config.ts`, `tailwind.config.mjs`, `components.json`, `openapi-ts.config.ts`, `tsconfig.json`, `biome.json`, `test-document.md`, `.prettierignore`, `AI.md`, `BACKLOG.md`, `ENTITY_RECOGNITION_IMPROVEMENTS.md`, and the listed legacy v1 `docs/` files), and every file listed under **Explicitly keep** remains intact.
- [ ] Any links in `docs/rebuild/` or `AGENTS.md` that pointed to removed legacy v1 docs are updated or marked as historical so no broken local links remain.
- [ ] `AGENTS.md` Architecture, Commands, and File Structure sections describe `app/` only (no `src/`, Legend State, TanStack Start, or tRPC). Note: merge approved garden branch `worldcrafter-gq2k` first (or reconcile its `AGENTS.md` edit cleanly).
- [ ] `cd app && bun run check && bun run build` pass cleanly with no root `node_modules` or root `package.json` present.

## Scope

In: Removing legacy root app code/configs/deps/v1-docs, porting `entity-suppression.ts`, fixing any resulting broken links in `docs/rebuild/`, and rewriting `AGENTS.md`.
Out: Updating `PRODUCT.md` and `README.md` (owned by `worldcrafter-j8gz`), and unrelated `app/` internal refactors (`Provenance`/`JsonValue` deduplication, `smoke.test.ts`).
