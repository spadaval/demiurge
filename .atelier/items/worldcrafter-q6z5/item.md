---
schema: atelier.item
schema_version: 3
id: worldcrafter-q6z5
title: Story CLI --help test times out at 5 s under host load
status: open
mission: null
labels:
- bug
priority: low
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-23T02:36:38.583561709Z
---

## Goal

`bun run check` doesn't fail on host load alone. `app/scripts/story.test.ts` "--help lists every command with an example, and every example runs" spawns the CLI once per example and hits bun's default 5 s test timeout when the host is busy.

## Done when

- [ ] The test passes repeatedly at load average 20+ while still running every example, for instance by running the examples in one process or giving the test a timeout sized to its work, and still fails when an example breaks.

## Scope

In: `app/scripts/story.test.ts`. Related: worldcrafter-08kf, the same problem in the generate timing tests.

## Context

2026-11-22, found while building worldcrafter-my9t: at load average 26-30 it failed in the full suite and alone, on that branch and on master (`code: null` after 5002 ms), with no change to the CLI.
