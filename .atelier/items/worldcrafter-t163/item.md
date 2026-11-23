---
schema: atelier.item
schema_version: 3
id: worldcrafter-t163
title: Add app/ bun run check as an Atelier merge check
status: in_review
mission: worldcrafter-k7uh
labels:
- atelier
- ci
priority: medium
blocked_by:
- worldcrafter-08kf
implementers:
- thread:delegated-task:command%3Amcp%3A19a62698-b51c-422f-9aec-662edcca5fd6%3Adelegate-task%3Af43fbdb7-6e0b-422d-8f9a-b46bc23427ac
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T22:38:58.577182196Z
---

## Goal

Configure `bun run check` in `app/` as an Atelier merge check in `.atelier/config.toml` (garden proposal P1 from `worldcrafter-gq2k`), once `worldcrafter-08kf` fixes the load-sensitive timing test flake.

## Done when

- [x] `.atelier/config.toml` runs `bun run check` in `app/` as a merge check, and handles/verifies where `app/node_modules` is present in the merge worktree.
- [x] `atelier check` passes and a test merge/check confirms `app/` typecheck, lint, and tests run automatically.
- [x] Review whether the redundant Claude Code Stop hook `atelier check` can be removed, and record the outcome in the Report.

## Scope

In: `.atelier/config.toml` and optional cleanup of redundant stop-hook check.
Out: External CI services or changes to `app/` test code.

## Report

`atelier merge` now runs the app's type check, lint and tests on the merged
tree, and refuses the merge when any fails. The check in
`.atelier/config.toml` is:

    cd app && bun install --frozen-lockfile > /dev/null && bun run check

**node_modules.** `merge` runs each check in a fresh detached checkout under
the Git directory (`atelier-merge-*`), so `app/node_modules` is never there.
The check installs from `bun.lock` first, which takes about 100 ms from
bun's cache. `--frozen-lockfile` makes a `package.json` that disagrees with
the lockfile fail the check instead of rewriting the lock. Install's package
list goes to `/dev/null` because `merge` prints only the last 20 lines of a
failing check, and the list filled them, hiding the error. Install errors go
to stderr and still show (tested with a changed `package.json`: "lockfile
had changes, but lockfile is frozen").

**Validation.**
- `cd app && bun run check` on the combined tree at 04055e3, before any
  change: 1309 pass, 0 fail, 3 Biome warnings.
- `atelier check`: every record valid.
- The command in a fresh detached worktree with no `node_modules`: exit 0,
  1309 pass, 55 s end to end.
- A real `atelier merge` in a throwaway local clone whose `master` held this
  config (removed after): a clean change merged with "Ran 1 merge check from
  master's config.toml on the merged tree; it passed." A change adding a
  type error was refused, exit 1, "Nothing changed", and the printed tail
  showed `src/zz-broken.ts(1,7): error TS2322`.
- `merge` reads the config from the base's tip, so this item's own merge
  does not yet run the new check; the next item's merge is the first.

**Note on ATELIER_SKIP.** One `ATELIER_SKIP` on `merge` passes every failing
rule and check of that run, not only the one it was meant for. In the
scratch clone, a skip given for the unticked Done when lines also let a
type error through. Anyone using it on a merge should know it skips this
check too.

**Stop hook.** Kept. The Claude Code Stop hook in `.claude/settings.json`
runs `atelier check`, which validates the `.atelier/` records and lists
uncommitted record changes at the end of each turn. It does not run the app
check, so it is not redundant with this merge check; it catches a broken
record in the session that wrote it, before a commit. The pre-commit hook
runs the same validation at commit time, so the Stop hook overlaps with it,
but it is `atelier-managed` and `atelier setup` would put it back, so
removing it here would not stick. Removing it, if wanted, belongs in
Atelier's setup, not this repository.
