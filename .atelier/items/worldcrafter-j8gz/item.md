---
schema: atelier.item
schema_version: 3
id: worldcrafter-j8gz
title: Update PRODUCT.md and README.md for unified typed-store and app-owned agent direction
status: building
mission: worldcrafter-k7uh
labels:
- docs
priority: medium
blocked_by:
- worldcrafter-2x5z
implementers:
- thread:delegated-task:command%3Amcp%3A19a62698-b51c-422f-9aec-662edcca5fd6%3Adelegate-task%3A6a269f68-df28-44df-98ca-437ff5d03132
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T22:38:58.499214173Z
---

## Goal

Update `PRODUCT.md` and `README.md` so they accurately reflect the post-Round-5 state and Sumeet's 2026-11-22 direction: a typed-store web application (`app/`) combining the battle-tested story bible (`app/src/story/`), a planned app-owned configurable story agent runtime (`worldcrafter-r7vd`), and the Night Edition UI (`DESIGN.md`). Keep `worldcrafter-03rp` and `worldcrafter-jeue` accurately recorded as history rather than erasing them.

## Done when

- [ ] `PRODUCT.md` preserves `worldcrafter-03rp` and `worldcrafter-jeue` as historical record, no longer lists `docs/strategies/notes-first.md` as the active approach, and states the 2026-11-22 typed-store + app-owned agent direction (distinguishing what is shipped in `app/` from what is planned in `worldcrafter-r7vd`/`mtkn`/`3z9j`).
- [ ] `README.md` describes `app/` (stack, commands, directory layout) accurately after `worldcrafter-2x5z` retires root `src/`, with no stale `src/`, TanStack Start, Legend State, or tRPC references.
- [ ] Every doc link in `PRODUCT.md` and `README.md` resolves to an existing file.

## Scope

In: `PRODUCT.md`, `README.md`.
Out: `AGENTS.md` (owned by `worldcrafter-2x5z`), historical strategy docs under `docs/strategies/` (kept as record), and code changes.
