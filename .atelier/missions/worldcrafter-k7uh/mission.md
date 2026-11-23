---
schema: atelier.mission
schema_version: 3
id: worldcrafter-k7uh
title: Clean up repo and fix Round 5 story-model defects
status: open
labels:
- cleanup
- story-model
lead: mcp:b66be996-8cb2-4d67-a57b-cacf9ea7bc65
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

## Result

All six planned items merged into `master` on 2026-11-22, each reviewed by a thread that did not write it, and every success criterion is met with the exceptions named below.

- `worldcrafter-2x5z` (33ad0c4): the root `src/` app, its configs, dependencies and v1 docs are gone, `entity-suppression.ts` and its test live in `app/src/world/`, and `AGENTS.md` describes `app/` only. The approved garden branch `worldcrafter-gq2k` merged first (a152057), taken over by the lead because its thread had left it unmerged since 2026-11-11.
- `worldcrafter-j8gz` (328d06e): `PRODUCT.md` and `README.md` state the 2026-11-22 direction and keep `worldcrafter-03rp` and `worldcrafter-jeue` as history.
- `worldcrafter-yxfp` (4dd625e): `span` and `reader-order` day counts between whole-day events are exact. The wrong counts on Rounds 2 to 5 (17, 47, 0 and 39) are all 0, and all 30 day counts stated in the rounds' prose match.
- `worldcrafter-0pt4` (de8ebda): the five viewpoint-mark defects are fixed with unit tests in `app/src/story/viewpoint.test.ts`.
- `worldcrafter-08kf` (04055e3): `bun run check` passed four full runs at load average 20 to 24. The generate "stays fast" tests now measure CPU time, and a parser slowed on purpose fails them.
- `worldcrafter-t163` (276bcad): `atelier merge` runs `cd app && bun install --frozen-lockfile > /dev/null && bun run check` on the merged tree and refuses on failure. The combined tree passed it at 04055e3 with 1309 tests. The Claude Code Stop hook stays: it validates `.atelier/` records, not the app.

Not done, and why:

- Three false viewpoint marks remain on Round 5's snapshots: Silt's `tender` and `corvin-pact`, and Brannoc's `tender`. None of the five defects causes them. They wait on the human decision `worldcrafter-lfyv`.
- `worldcrafter-ko6g`, filed into this mission by another item's review, was closed without a branch: `worldcrafter-08kf` had already fixed it, after the lead ruled the story-CLI timeout in scope under that item's Goal. A planted hung example was not run against it.

Departures from the plan:

- Reviews ran on Grok 4.6 at `xhigh`, not GPT-6.1 Sol: the ChatGPT allowance was exhausted until 2026-11-23 00:04. Implementers were Claude Opus 5.5, so each review still came from another lab.
- Nothing was pushed to `origin`, on the instruction of the thread that started the lead.

Found on the way and left unfiled, for a planner:

- Round 5 scene 3's prose says "twelve days out of Saltcombe", but the journey event starts 10 days before the scene. This is a doubt about the prose or the model, not about `span`.
- Streaming long generations costs 1 to 5 s of CPU in the markup case, mostly Slate normalization, `repairSegment`'s `findIndex` and `insertChildren` copying (`worldcrafter-08kf`'s Report).
- One `ATELIER_SKIP` on `atelier merge` passes every failing rule and check in that run, so a skip meant for one rule also lets a failing `bun run check` through (`worldcrafter-t163`'s Report). This belongs to Atelier, not this repository.
- On 2026-11-22 at 21:37 an implementer ran `pkill -f "bun test"`, which may have killed other threads' test runs on the host.
