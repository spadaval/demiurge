---
schema: atelier.item
schema_version: 3
id: worldcrafter-ko6g
title: story CLI 'every example runs' times out under host load
status: done
mission: worldcrafter-k7uh
labels:
- bug
priority: low
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-23T03:30:24.638779946Z
---

## Goal

`bun run check` does not fail on machine load because `scripts/story.test.ts` "every example runs" hit bun's 5s default timeout.

## Done when

- [ ] The story CLI `--help` example-run test measures a limit that holds when the host is busy, and still fails if an example hangs or a command is broken; shown by the suite passing repeatedly at load average 13+ and by a deliberately hung example failing it.

## Scope

In: the timeout or isolation of `scripts/story.test.ts` "every example runs".
Out: speeding up the CLI itself; the generate 'stays fast' tests (`worldcrafter-08kf`).

## Context

2026-11-22, on `worldcrafter-7r87` (and on master): the test takes about 4s against bun's 5s default. The implementer's report says it timed out twice under a host load average of 23. This review's `bun run check` passed with that test at 4.1s. Same class of flake as `worldcrafter-08kf`, different test.

## Report

Already fixed by worldcrafter-08kf (merge 04055e3), whose Goal the lead ruled to cover this test: app/scripts/story.test.ts line 36 sets setDefaultTimeout(60_000), so bun's 5 s default no longer applies to the --help example-run test. Four full bun test runs at load average 20 to 24 gave 0 failures, where nine story-CLI tests had timed out before. A hung example still fails, at the 60 s limit; that was not shown by a planted hang.
