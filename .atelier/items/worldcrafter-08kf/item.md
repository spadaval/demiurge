---
schema: atelier.item
schema_version: 3
id: worldcrafter-08kf
title: Generate 'stays fast' timing tests fail under host load
status: building
mission: worldcrafter-k7uh
labels:
- bug
priority: low
blocked_by: []
implementers:
- thread:delegated-task:command%3Amcp%3A19a62698-b51c-422f-9aec-662edcca5fd6%3Adelegate-task%3A0630a43e-695b-4fc4-a018-bfd6293ec49a
ready: null
trivial: null
caused_by: null
created_at: 2026-11-05T04:08:57.268939988Z
---

## Goal

`bun run check` doesn't fail on machine load alone.

## Done when

- [x] - The generate 'streaming 50 KB ... stays fast' tests (memory and IndexedDB) measure the code's own cost, or a limit that holds when the host is busy, and still catch a real slowdown; shown by the suite passing repeatedly at load average 13+ and by a deliberately slowed parser failing it.

## Context

2026-11-04: with another mission's Android emulator holding the host at load 10-20, the full check failed on these tests in about half of runs (11-31 s against a 10 s limit) on branches that don't touch `app/src/generate`; run alone they pass at the same load. Evidence worldcrafter-ycr6, txw0, eton, 0x5i, dc3c.

## Notes

- 2026-11-05 [note] 2026-11-05: moved from worldcrafter-z9qs (superseded by decision worldcrafter-03rp) to the rebuild mission, since it is an app test bug.

## Report

`bun run check` now passes at load 20-24: four full `bun test` runs under a bounded burner (18-20 busy loops on this 12-thread host, killed afterwards) gave 1154 pass, 0 fail each. Before the change, the same load failed 2-24 tests per run.

Two causes, both in scope under the Goal (the lead widened it to every test that fails on load alone):

- Generate "streaming 50 KB ... stays fast" (memory and IndexedDB): it timed elapsed time, which under load is mostly waiting for a core. The markup case took 23-43 s elapsed for 8-18 s of CPU. The tests now measure `process.cpuUsage()` against a limit per case: prose 5 s, unclosed emphasis 5 s, markup 30 s. Under load the CPU times were at most 0.3 s, 0.5 s and 11.6 s, so each limit is at least 2.5 times that. The test timeout went from 30 s to 180 s, since it is now only a hang guard.
- Story CLI (`scripts/story.test.ts`): each test runs its commands as separate processes, over 80 in the `--help` test, which takes 3.6 s idle. Bun's 5 s default timed out nine of them at load 25. The timeout only guards against a hang, so the file sets `setDefaultTimeout(60_000)`, which is per-file in Bun 1.4.5 (checked).

The slowdown is still caught. A parser that re-parses all text on every push (the diff is in the thread's scratchpad, applied and reverted) took 22-25 s, 35 s and 54-56 s of CPU, and all six cases failed.

Separate commit 58238d2 fixes part of the code's own cost: `BlockIdPlugin` rebuilt its block-ID index with a pass over the whole document on every render, because each streamed `insert_text` replaced `editor.children`. The index now carries over text and selection operations. Rendering 100 KB of many-line output dropped from 3.4 s to 2.0 s. What is left grows with renders times segment size: Slate's normalization of the segment, `repairSegment`'s `findIndex`, and `insertChildren` copying. That is why the markup case costs 1-5 s, which is far more than parsing it does. Worth an item if long generations feel slow in the browser.

One mistake to report: at 21:37 I ran `pkill -f "bun test"` to stop my own run. It matches by command line, so it may have killed other threads' test runs on this host at that moment. After that I stopped processes by PID only.
