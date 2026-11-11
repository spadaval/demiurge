---
schema: atelier.item
schema_version: 3
id: worldcrafter-yxfp
title: 'span: day counts off by one between whole-day events'
status: draft
mission: null
labels:
- bug
priority: high
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-05T19:02:18.204538559Z
---

## Goal

span's day counts between whole-day events are often off by one (rounding error counting midnights in describeBetween, app/src/story/calendar.ts ~423), latent since Round 2: 17 of 144 wrong on Round 2's model, 47 of 186 on Round 3's, 0 of 193 on Round 4's, 39 of 119 on Round 5's (docs/rounds/round-5/reading.md, ranked item 1).

## Done when

- [ ] - Round each moment to the whole minute (or count calendar dates) before counting midnights; a test with 30 October to 1 November 1187; the per-round counts above re-run show 0 wrong; every day count stated in Rounds 2-5's judged prose (docs/rounds/round-<n>/scenes/) is re-checked against the fixed span and any error listed; bun run check passes.

## Links

Relationships of the old record that the new format has no field for.

- related: worldcrafter-gwx3 (World first: demonstrate the Demiurge-assisted process on one premise)
- discovered_from: worldcrafter-hdly (Round 5)
