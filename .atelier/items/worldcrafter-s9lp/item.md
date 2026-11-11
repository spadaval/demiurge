---
schema: atelier.item
schema_version: 3
id: worldcrafter-s9lp
title: Point the files that still name the mission's moved strategy at its new place
status: approved
mission: null
labels: []
priority: medium
blocked_by: []
implementers:
- thread:delegated-task:command%3Amcp%3A2074a88e-920b-49f9-bd17-caf5903cc60f%3Adelegate-task%3A484ff27f-40b9-413e-b59f-ae79d6a20f57
ready:
  by: sumeet
  at: 2026-11-11T15:43:39.460143747Z
trivial: null
caused_by: null
created_at: 2026-11-11T15:25:05.329120910Z
---

## Goal

The move to the new Atelier records, on 2026-11-11, took this repository's open mission's strategy out of `docs/strategies/` and put it in the mission's directory under `.atelier/missions/`. Tracked files outside `.atelier/` still name the old path, which no longer exists. Point each of them at the file's new place, so that a reader or a script that follows the reference finds it.

## Done when

- [x] The conversion commit shows which file moved and where (`git log --diff-filter=R --stat -1 --format=%H -- .atelier/missions/`, or the commit titled "Convert Atelier records to the new layout"). The Report names the old and the new path.
- [x] A search for the old path outside `.atelier/` finds nothing: the Report gives the `git grep` command and its output, before and after.
- [x] Each reference that was changed resolves: a Markdown link opens the file, and a script that reads the path still runs, shown by running that script's own test or the script itself where it has no test.
- [x] The change touches nothing else: `git diff --stat` against the base lists only the files that named the old path.

## Scope

The tracked files outside `.atelier/` that name the moved strategy's old path, and this item's record. Not the other strategy files still under `docs/strategies/`, which did not move, and no other edit to the files touched.

## Context

This is the first item to go through the new tool in this repository. `AGENTS.md` says how work starts and how the base reaches the remote: this repository configures no forge, so `atelier merge` merges locally and the base is then pushed with `git push`. If a command of the tool refuses or errors in a way its own output does not explain, say so in the Report with what it printed; that is as useful as the fix.

## Report

The rebuild strategy moved from `docs/strategies/rebuild.md` to `.atelier/missions/worldcrafter-3otd/mission.md`. The conversion commit a98590b ("Convert Atelier records to the new layout, by the cutover runbook") records it as a rename: `git show --name-status -M a98590b | grep '^R'` prints `R057 docs/strategies/rebuild.md .atelier/missions/worldcrafter-3otd/mission.md`.

The command the Done when line suggests, `git log --diff-filter=R --stat -1 --format=%H -- .atelier/missions/`, prints nothing here. With a pathspec, git only sees the destination side of the rename, so the commit shows as an add and `--diff-filter=R` drops it. Finding the commit by its title works.

Search, before the change (`git grep -n 'strategies/rebuild' -- ':!.atelier/'`):

```
docs/rebuild/story-model.md:124:... The rebuild mission (`docs/strategies/rebuild.md`) was narrowed ...
docs/strategies/notes-first.md:61:  until a verdict asks for it. The rebuilt app (`docs/strategies/rebuild.md`)
docs/strategies/structure-first.md:22:The rebuild (`docs/strategies/rebuild.md`) gave Demiurge a sound
docs/strategies/structure-first.md:163:  control, stable IDs and story time are as in `docs/strategies/rebuild.md`.
```

After: the same command prints nothing and exits 1. `git grep -n 'rebuild\.md' -- ':!.atelier/'` also prints nothing, so no relative form remains.

All four references are inline code paths from the repository root, not Markdown links, and no script reads the path. Each now names `.atelier/missions/worldcrafter-3otd/mission.md`, and `test -f` on it succeeds. I replaced only the path text. The two wrapped lines in the strategy files are now 82 to 87 characters wide; I did not rewrap them, to keep the edit to the path.

`git diff --stat master -- . ':!.atelier/items/worldcrafter-s9lp'` lists only the three files:

```
 docs/rebuild/story-model.md        | 2 +-
 docs/strategies/notes-first.md     | 2 +-
 docs/strategies/structure-first.md | 4 ++--
 3 files changed, 4 insertions(+), 4 deletions(-)
```

`atelier start` ran cleanly and printed what to do next.
