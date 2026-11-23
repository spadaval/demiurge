---
schema: atelier.item
schema_version: 3
id: worldcrafter-j8gz
title: Update PRODUCT.md and README.md for unified typed-store and app-owned agent direction
status: approved
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

- [x] `PRODUCT.md` preserves `worldcrafter-03rp` and `worldcrafter-jeue` as historical record, no longer lists `docs/strategies/notes-first.md` as the active approach, and states the 2026-11-22 typed-store + app-owned agent direction (distinguishing what is shipped in `app/` from what is planned in `worldcrafter-r7vd`/`mtkn`/`3z9j`).
- [x] `README.md` describes `app/` (stack, commands, directory layout) accurately after `worldcrafter-2x5z` retires root `src/`, with no stale `src/`, TanStack Start, Legend State, or tRPC references.
- [x] Every doc link in `PRODUCT.md` and `README.md` resolves to an existing file.

## Scope

In: `PRODUCT.md`, `README.md`.
Out: `AGENTS.md` (owned by `worldcrafter-2x5z`), historical strategy docs under `docs/strategies/` (kept as record), and code changes.

## Report

`PRODUCT.md` and `README.md` now describe the 2026-11-22 direction and the `app/`-only repository (commit 0c19240).

- `PRODUCT.md`: Stack names `app/`, plain CSS to the Night Edition `DESIGN.md` (no longer "styling undecided"), and puts sync under `worldcrafter-3z9j`. Product Purpose states the typed-store + app-owned agent direction (recorded in mission `worldcrafter-k7uh`), then a history list: Structure first ended (`worldcrafter-03rp`), Notes first superseded, World first (`worldcrafter-jeue`) and its five rounds, and the 2026-11-22 move into the app. It then separates what ships in `app/` today from what `worldcrafter-r7vd`, `mtkn` and `3z9j` plan. `notes-first.md` appears only as history. Positioning, Operating Context, Undecided, Evidence on Hand and principle 6 drop the "plain notes / headless" framing; 03rp and jeue are cited as history in principle 6.
- One finding outside the item's framing: `PRODUCT.md` was stale twice over. Notes first had already been superseded by `worldcrafter-jeue` on 2026-11-05, which the old text never mentioned; the history list now covers it.
- `README.md`: Tech Stack, Commands and Project Structure describe `app/` (React 19, Vite, TanStack Router on hash history, Plate, plain CSS, `StorageAdapter`, neverthrow, Biome, bun test, Worker static hosting). No root `src/`, Legend State, Tailwind, OpenAPI client, TanStack Start or tRPC remain, and `bun dev` is replaced by a note that there is no dev script. The intro says the bible was tested headless and is moving into the app.
- Links: every file path and Markdown link in both files was checked with a script and exists. The only two that are not files are `app/dist/` (build output) and `https://bun.sh/`.
- No code changed, so `bun run check` was not needed for this item.

### Responses

1-pjd9.1: fixed in d4baba8
