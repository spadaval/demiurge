---
schema: atelier.review
schema_version: 3
round: 1
commit: 9ad203de343df2ef68479aa824be525d48425e60
reviewers:
- 01a20676-5aa8-7c91-a200-bcb27a917994
model: grok-4.6
verdict: approve
created_at: 2026-11-23T03:32:36.251407300Z
---

## Summary

- Complexity: low. One `[[merge_check]]` command in `.atelier/config.toml`; merge already runs those on a detached checkout.
- Value: high. Garden P1 (`worldcrafter-gq2k`): merges had no type check, lint or tests, and the repository has no CI.
- Risk of merging it: low. A failing check refuses the merge in the open; removing the stanza undoes it.

The value warrants the change. This is the smaller change that meets the Goal; keeping the Stop hook is right.

Reviewed `git diff master...9ad203de343df2ef68479aa824be525d48425e60` (config.toml plus this item's record). Done when lines hold:

- `.atelier/config.toml` runs `cd app && bun install --frozen-lockfile > /dev/null && bun run check`. Atelier 0.7.0 `merge` runs each `run` via `sh -c` in a detached `git worktree add` of the merge commit under the Git directory (`atelier-merge-*`), so `app/node_modules` is never in that tree. `app/.gitignore` and the root gitignore both ignore `node_modules`. Always installing from `app/bun.lock` with `--frozen-lockfile` is the handling for that tree, and is also safe if `node_modules` is already there.
- `atelier check`: every record valid. Independently, in a detached worktree of `9ad203d` with no `app/node_modules`, the exact merge-check command exited 0: frozen install 75 ms from bun's cache, then `tsc --noEmit && biome check && bun test` (the `check` script in `app/package.json`), 1309 pass, 0 fail, 3 Biome warnings, 55.7 s end to end. `worldcrafter-08kf` is done on master (`04055e3`); this branch starts there.
- Stop hook kept, with the reason in the Report. `.claude/settings.json` runs `atelier check || exit 1 # atelier-managed:Stop`. That validates records; it does not run the app check. The pre-commit hook is `atelier check --hook pre-commit`. `atelier setup` rewrites the Stop hook from the `atelier-managed` marker (confirmed in Atelier's `setup.rs`), so deleting it here would not stick.

Failure output: a planted `src/zz-broken.ts` (`const x: number = "no"`) through the same command exited 2 and the last 20 lines were `src/zz-broken.ts(1,7): error TS2322`, matching the Report. Adding `left-pad` to a copy of `app/package.json` made `bun install --frozen-lockfile` exit 1 with `error: lockfile had changes, but lockfile is frozen` on stderr; stdout is only the `bun install` banner, so `> /dev/null` keeps that error in merge's tail. A fresh install without the redirect is ~27 lines, last 20 still include the two-line tsc error; the redirect still earns its keep by making the tail the check, not the `+ package@version` list.

`merge` reads config from the base tip, so this item's own merge does not run the new check; that is Atelier's rule, stated in the Report. One `ATELIER_SKIP` on `merge` passes every failing rule and check (`Skip::refuse`); also stated.

Did not re-run a full `atelier merge` of a dummy item in a throwaway clone; the author's clone test was not independently reproduced. The command merge would run, and the Atelier 0.7.0 path that runs it, were. Did not put a load burner on this host.

No findings.
