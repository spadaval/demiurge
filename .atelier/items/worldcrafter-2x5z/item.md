---
schema: atelier.item
schema_version: 3
id: worldcrafter-2x5z
title: Retire the old app and its dependencies
status: open
mission: worldcrafter-k7uh
labels:
- rebuild
- feature
priority: medium
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-10-17T07:07:33.752717474Z
---

## Goal

Retire the legacy v1 root app (`src/`), its legacy root config files (`vite.config.ts`, `tailwind.config.mjs`, `components.json`, `openapi-ts.config.ts`, `tsconfig.json`, `public/`, `test-document.md`, and root `package.json` legacy app dependencies), and rewrite `AGENTS.md` so it describes `app/` only. Port keep-list `src/lib/entity-suppression.ts` (and its test) into `app/src/world/` before deleting `src/` so no keep-list module is lost.

## Done when

- [ ] `src/lib/entity-suppression.ts` and `src/lib/entity-suppression.test.ts` are ported into `app/src/world/` and pass under `cd app && bun test`.
- [ ] Root `src/`, `public/`, `vite.config.ts`, `tailwind.config.mjs`, `components.json`, `openapi-ts.config.ts`, `test-document.md`, and legacy v1 dependencies (`@huggingface/transformers`, `@tiptap/*`, `@legendapp/state`, `@openrouter/sdk`, `daisyui`, `shadcn`, `@tanstack/react-start`) are removed.
- [ ] `rg "@huggingface/transformers|@tiptap|@legendapp/state|distilbert" package.json app/package.json app/src` returns no matches.
- [ ] `AGENTS.md` Architecture, Commands, and File Structure sections describe `app/` only (no `src/`, Legend State, TanStack Start, or tRPC). Note: merge approved garden branch `worldcrafter-gq2k` first (or reconcile its `AGENTS.md` edit cleanly).
- [ ] `cd app && bun run check && bun run build` pass cleanly.

## Scope

In: Removing legacy root app code/configs/deps, porting `entity-suppression.ts`, and rewriting `AGENTS.md`.
Out: Updating `PRODUCT.md` and `README.md` (owned by `worldcrafter-j8gz`), and unrelated `app/` internal refactors (`Provenance`/`JsonValue` deduplication, `smoke.test.ts`).
