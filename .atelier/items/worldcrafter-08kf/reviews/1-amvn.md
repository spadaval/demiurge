---
schema: atelier.review
schema_version: 3
round: 1
commit: 0261587578dc1b97c8f72807cf547f234e417231
reviewers:
- 01a20667-fc2a-7921-8fda-a0ad58c75d9b
model: grok-4.6
verdict: approve
created_at: 2026-11-23T03:16:55.366383377Z
---

## Summary

- Complexity: low. The tests switch from elapsed time to process CPU time and widen hang guards; the plugin change is a 14-line carry-over of an index that already existed.
- Value: high. `bun run check` was failing on host load on branches that do not touch generate, so the gate needs this.
- Risk of merging it: low. A bad CPU limit fails the suite in the open. The index carry-over is limited to `insert_text`, `remove_text` and `set_selection`, which do not change element IDs, and nested operations still drop the index.

The value warrants the change. The test metric is the smaller change that meets the Goal; the index carry-over is a related cut in the code's own cost, not extra scope that should be stripped.

Reviewed `git diff master...0261587578dc1b97c8f72807cf547f234e417231`. The Done when line holds: the six "streaming 50 KB ... stays fast" cases (memory and IndexedDB) measure `process.cpuUsage()` against per-case CPU limits (5 s, 5 s, 30 s) with a 180 s hang timeout. Bun 1.4.5 `process.cpuUsage()` returns microseconds; dividing by 1000 is milliseconds (busy-looped 200 ms, got 200004 µs). `bun test` runs files in isolated workers and this file does not use `test.concurrent`, so the measurement is this test's process during `generator.send`, which is the generate path including the in-process stub server.

`setDefaultTimeout(60_000)` in `scripts/story.test.ts` is documented on `setDefaultTimeout` as the current file only. The `--help` case is 3.7 s idle against Bun's 5 s default, so that timeout was a hang guard that load could trip; 60 s is the right kind of fix.

`BlockIdPlugin` snapshots a current index before `apply` and rebinds it to the new `editor.children` only when no nested operation ran. `insert_node` still patches or invalidates as before. Streamed generate applies raw `insert_text` then `insert_node` (`ai-segment.ts`), which is the path the carry-over is for. `block-id.test.ts` still enforces the ID invariant.

Ran in `app/` at load 1.29 (15-minute 12.42): Biome on the three source files, `tsc --noEmit`, the six stays-fast tests (0.08–1.1 s elapsed, well under the CPU limits), `block-id.test.ts` (22 pass), `story.test.ts` (30 pass, `--help` 3752 ms), and full `bun test` (1154 pass, 0 fail, 54 files). Independently, re-parsing all accumulated text on every 4-character push of 50 KB took 17.3 s, 31.9 s and 32.0 s of CPU for the three cases, each over its limit, so a parser that does that still fails; the generate test also pays for rendering, which the Report's 22–56 s figures include.

Did not put a load burner on this host (the Report already records a `pkill -f "bun test"` that may have hit other threads). Did not apply the author's scratchpad parser diff; the re-parse-all measurement above stands in for it. Two other elapsed-time checks remain (`generated-text` 500 ms, timeline `perCommand` 50 ms / `queryTime` 5 s) and have more headroom than the old 10 s generate cap; they were green in this full run.
