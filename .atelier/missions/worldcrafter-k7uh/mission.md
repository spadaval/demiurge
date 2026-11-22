---
schema: atelier.mission
schema_version: 3
id: worldcrafter-k7uh
title: Clean up repo and fix Round 5 story-model defects
status: open
labels:
- cleanup
- story-model
lead: null
planners:
- ace64553-eec2-406a-84c3-c6360b8f5131
created_at: 2026-11-22T22:38:25.931618779Z
---

## Why

Started from Sumeet's direction on 2026-11-22: Demiurge is moving forward as a typed-store web application (`app/`) combining the battle-tested story bible (`app/src/story/`), an app-owned configurable story agent runtime, and the Night Edition UI (`DESIGN.md`). This direction supersedes `worldcrafter-03rp` and `docs/strategies/notes-first.md` (keeping both in the record as history) and replaces the dropped rebuild mission `worldcrafter-3otd`. Before building the unified store and agent runtime (`worldcrafter-r7vd`), the repository needs to retire the legacy root `src/` app, align its docs, enforce `app/` checks on merge, and fix the two concrete correctness bugs surfaced in Round 5 of `worldcrafter-gwx3` (`worldcrafter-yxfp`, `worldcrafter-0pt4`).

## Outcome

A clean repository with legacy root `src/` retired (and keep-list `entity-suppression.ts` preserved in `app/`), accurate `AGENTS.md`, `PRODUCT.md`, and `README.md`, `app/` `bun run check` enforced on every Atelier merge (with the load-sensitive timing flake fixed), and the Round 5 calendar day-count and viewpoint-mark defects fixed with regression tests.

## Success criteria

- Legacy root app `src/`, its unused root dependencies/configs, and its description in `AGENTS.md` are retired, with keep-list `entity-suppression.ts` ported into `app/` (`worldcrafter-2x5z`).
- `PRODUCT.md` and `README.md` reflect the 2026-11-22 direction while preserving `worldcrafter-03rp` and `worldcrafter-jeue` as history (`worldcrafter-j8gz`, after `worldcrafter-2x5z`).
- `span` day counts between whole-day events are exact, with Rounds 2–5 prose spans re-verified (`worldcrafter-yxfp`).
- Viewpoint marks handle secondary viewpoints, group presence, opening-of-scene timing, and unplaced scenes without false negatives/positives (`worldcrafter-0pt4`).
- `bun run check` in `app/` passes reliably under host load (`worldcrafter-08kf`) and runs as an Atelier merge check (`worldcrafter-t163`).

## Scope

In:
- Retiring legacy root `src/` and rewriting `AGENTS.md` (`worldcrafter-2x5z`), then updating `PRODUCT.md` and `README.md` (`worldcrafter-j8gz`).
- Fixing Round 5 defects (`worldcrafter-yxfp`, `worldcrafter-0pt4`) and flaky timing tests (`worldcrafter-08kf`).
- Adding `app/` `bun run check` as an Atelier merge check (`worldcrafter-t163`).

Out:
- Unifying `app/src/story/` into `StorageAdapter` or building the app-owned agent runtime (`worldcrafter-r7vd`).
- Unrelated `app/` internal refactors (`Provenance` / `JsonValue` deduplication, `smoke.test.ts`).
- Merging the already-approved garden branch `worldcrafter-gq2k` (note: merge `gq2k` before starting `2x5z` to avoid an `AGENTS.md` conflict) or settling `needs-human` decisions `worldcrafter-lfyv` and `worldcrafter-54d6`.

## Authority

Agents may choose implementation details, test structure, and doc wording within this scope. Pushing to remotes, deploying, or altering settled product decisions (`worldcrafter-cogw`, `worldcrafter-45an`) waits for Sumeet.

## Result
