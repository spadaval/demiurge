---
schema: atelier.item
schema_version: 3
id: worldcrafter-t163
title: Add app/ bun run check as an Atelier merge check
status: open
mission: worldcrafter-k7uh
labels:
- atelier
- ci
priority: medium
blocked_by:
- worldcrafter-08kf
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T22:38:58.577182196Z
---

## Goal

Configure `bun run check` in `app/` as an Atelier merge check in `.atelier/config.toml` (garden proposal P1 from `worldcrafter-gq2k`), once `worldcrafter-08kf` fixes the load-sensitive timing test flake.

## Done when

- [ ] `.atelier/config.toml` runs `bun run check` in `app/` as a merge check, and handles/verifies where `app/node_modules` is present in the merge worktree.
- [ ] `atelier check` passes and a test merge/check confirms `app/` typecheck, lint, and tests run automatically.
- [ ] Review whether the redundant Claude Code Stop hook `atelier check` can be removed, and record the outcome in the Report.

## Scope

In: `.atelier/config.toml` and optional cleanup of redundant stop-hook check.
Out: External CI services or changes to `app/` test code.
