---
schema: atelier.item
schema_version: 3
id: worldcrafter-s9lp
title: Point the files that still name the mission's moved strategy at its new place
status: draft
mission: null
labels: []
priority: medium
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-11T15:25:05.329120910Z
---

## Goal

The move to the new Atelier records, on 2026-11-11, took this repository's open mission's strategy out of `docs/strategies/` and put it in the mission's directory under `.atelier/missions/`. Tracked files outside `.atelier/` still name the old path, which no longer exists. Point each of them at the file's new place, so that a reader or a script that follows the reference finds it.

## Done when

- [ ] The conversion commit shows which file moved and where (`git log --diff-filter=R --stat -1 --format=%H -- .atelier/missions/`, or the commit titled "Convert Atelier records to the new layout"). The Report names the old and the new path.
- [ ] A search for the old path outside `.atelier/` finds nothing: the Report gives the `git grep` command and its output, before and after.
- [ ] Each reference that was changed resolves: a Markdown link opens the file, and a script that reads the path still runs, shown by running that script's own test or the script itself where it has no test.
- [ ] The change touches nothing else: `git diff --stat` against the base lists only the files that named the old path.

## Scope

The tracked files outside `.atelier/` that name the moved strategy's old path, and this item's record. Not the other strategy files still under `docs/strategies/`, which did not move, and no other edit to the files touched.

## Context

This is the first item to go through the new tool in this repository. `AGENTS.md` says how work starts and how the base reaches the remote: this repository configures no forge, so `atelier merge` merges locally and the base is then pushed with `git push`. If a command of the tool refuses or errors in a way its own output does not explain, say so in the Report with what it printed; that is as useful as the fix.
