---
schema: atelier.item
schema_version: 3
id: worldcrafter-j8gz
title: Update PRODUCT.md and README.md for unified typed-store and app-owned agent direction
status: open
mission: worldcrafter-k7uh
labels:
- docs
priority: medium
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T22:38:58.499214173Z
---

## Goal

Update `PRODUCT.md` and `README.md` so they accurately reflect the post-Round-5 state and Sumeet's 2026-11-22 direction: a typed-store web application (`app/`) combining the battle-tested story bible (`app/src/story/`), an app-owned configurable story agent runtime, and the Night Edition UI (`DESIGN.md`). Remove stale `notes-first` framing from `PRODUCT.md` and legacy root `src/` tech-stack/structure references from `README.md`.

## Done when

- [ ] `PRODUCT.md` reflects the post-Round-5 typed-store + app-owned agent direction (no longer claiming the typed model ended under `worldcrafter-03rp` or pointing to `docs/strategies/notes-first.md` as active).
- [ ] `README.md` describes `app/` (stack, scripts, directory layout) and the Night Edition + story bible architecture accurately, with no stale `src/` or TanStack Start / Legend State / tRPC references.
- [ ] Every doc link in `PRODUCT.md` and `README.md` resolves to an existing file.

## Scope

In: `PRODUCT.md`, `README.md`.
Out: Historical strategy docs under `docs/strategies/` (kept as record) and code changes.
