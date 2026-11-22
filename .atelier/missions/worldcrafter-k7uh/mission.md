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

Started from Sumeet's direction on 2026-11-22: Demiurge is moving forward as a typed-store web application with an app-owned story agent loop and Night Edition UI. Before building the unified store and agent runtime (`worldcrafter-r7vd`), the repository needs to stop carrying three contradictory eras of code and docs, and the two concrete correctness bugs surfaced in Round 5 of `worldcrafter-gwx3` (`worldcrafter-yxfp`, `worldcrafter-0pt4`) should be fixed while the evidence is fresh.

## Outcome

A clean single-app repository (`app/` only, legacy root `src/` retired), accurate `PRODUCT.md` and `README.md`, `app/` `bun run check` enforced on every Atelier merge (with the load-sensitive timing flake fixed), and the Round 5 calendar day-count and viewpoint-mark defects fixed with regression tests.

## Success criteria

- Legacy root app `src/` and its unused dependencies are removed (`worldcrafter-2x5z`), and `AGENTS.md`, `PRODUCT.md` and `README.md` describe the current unified typed-store + app-owned agent direction (`worldcrafter-j8gz`).
- `span` day counts between whole-day events are exact, with Rounds 2–5 prose spans re-verified (`worldcrafter-yxfp`).
- Viewpoint marks handle secondary viewpoints, group presence, opening-of-scene timing, and unplaced scenes without false negatives/positives (`worldcrafter-0pt4`).
- `bun run check` in `app/` passes reliably under host load (`worldcrafter-08kf`) and runs as an Atelier merge check (`worldcrafter-t163`).

## Scope

In:
- Retiring legacy `src/` and updating root docs (`PRODUCT.md`, `README.md`, `AGENTS.md`).
- Fixing Round 5 defects (`worldcrafter-yxfp`, `worldcrafter-0pt4`) and flaky timing tests (`worldcrafter-08kf`).
- Adding `app/` `bun run check` as an Atelier merge check (`worldcrafter-t163`).

Out:
- Unifying `app/src/story/` into `StorageAdapter` or building the app-owned agent runtime (`worldcrafter-r7vd`).
- Merging the already-approved garden branch `worldcrafter-gq2k` (handled by its own merge) or settling `needs-human` decisions `worldcrafter-lfyv` and `worldcrafter-54d6` (waiting on Sumeet).

## Authority

Agents may choose implementation details, test structure, and doc wording within this scope. Pushing to remotes, deploying, or altering settled product decisions (`worldcrafter-cogw`, `worldcrafter-45an`) waits for Sumeet.

## Result
