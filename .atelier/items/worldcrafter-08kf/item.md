---
schema: atelier.item
schema_version: 3
id: worldcrafter-08kf
title: Generate 'stays fast' timing tests fail under host load
status: draft
mission: worldcrafter-3otd
labels:
- bug
priority: low
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-05T04:08:57.268939988Z
---

## Goal

`bun run check` doesn't fail on machine load alone.

## Done when

- [ ] - The generate 'streaming 50 KB ... stays fast' tests (memory and IndexedDB) measure the code's own cost, or a limit that holds when the host is busy, and still catch a real slowdown; shown by the suite passing repeatedly at load average 13+ and by a deliberately slowed parser failing it.

## Context

2026-11-04: with another mission's Android emulator holding the host at load 10-20, the full check failed on these tests in about half of runs (11-31 s against a 10 s limit) on branches that don't touch src/generate; run alone they pass at the same load. Evidence worldcrafter-ycr6, txw0, eton, 0x5i, dc3c.

## Notes

- 2026-11-05 [note] 2026-11-05: moved from worldcrafter-z9qs (superseded by decision worldcrafter-03rp) to the rebuild mission, since it is an app test bug.
