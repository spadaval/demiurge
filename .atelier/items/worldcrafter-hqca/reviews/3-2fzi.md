---
schema: atelier.review
schema_version: 3
round: 3
commit: 6b0c5f247db10ac84af8a48826934be132a1be09
reviewers:
- thread:delegated-task:command%3Amcp%3A5f222b3c-4e10-472c-93a6-086e284463e6%3Adelegate-task%3A1a9c2d7f-3916-4378-8ec9-db34b8fe2d50
model: gpt-6.1-sol
verdict: approve
created_at: 2026-11-23T07:33:40.774620Z
---

## Summary

Complexity: high. The whole change adds a reactive bible service, a storage contract for writers, passage matching, and scene-level gloss layout across several owners.
Value: high. The requested live Night Edition apparatus needs these computations, and sharing the service also keeps the World inspector current.
Risk of merging: high. Missing or incorrect authoritative story notes could silently mislead, although this change does not rewrite the prose or bible schema.

I reviewed the changes since round 2 at b94ba7c2dfec8d3e02313c9656fa3f48918a3c1a through 6b0c5f247db10ac84af8a48826934be132a1be09, distinguishing the incoming World inspector code from the merge's service consolidation. I traced the inspector, rail, scene apparatus, stamp, and generation storage to the single `services.bible`. The shared service preserves the inspector's last successful story on a failed read, exposes its error, and refreshes after successful bible writes. The old `services.story` references are gone. The new inspector component test verifies that a command updates both the open Cast & Drives sheet and its rail count without an explicit refresh. I found no new problems in the changes since round 2. The value warrants the implementation, and I found no substantially smaller change that provides the same outcome.

I rechecked each Done when line against the current code and tests. The stamp and requested record types remain covered; matching passages use `TextAnchor` with scene-level fallback; command and scripted-agent writes update the apparatus; and layer toggles preserve the prose. Both earlier findings remain fixed: bible anchoring reserves keyed source endpoints, and the gloss follows assigned key order past `z`. Their component regressions pass after the merge.

`cd app && bun run check` passed: typecheck, Biome, and 1,642 tests across 77 files. The four reported React act warnings appear in `generate.app.test.tsx`. I also ran a controlled inline service check: two writes during a gated refresh coalesce into one trailing read containing both changes; a subsequent failed refresh retains the exact last successful state and reports the error; and recovery clears the error. No implementation or test files were changed.

`bun run build` passed. `bun scripts/measure-layers.ts` measured nine toggles across six prose blocks and 57 line boxes, with 0 px movement, a slowest click-to-paint of 32.8 ms, and up to 14 visible notes. The Report's current behavior and validation claims hold. I did not perform a manual visual review or exercise a live model endpoint; the agent component test uses scripted completions.
