---
schema: atelier.item
schema_version: 3
id: worldcrafter-ey04
title: Enable snapshot thinning and the storage panel, once Sumeet approves the rule
status: open
mission: worldcrafter-3z9j
labels:
- needs-human
- sync
priority: medium
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-23T02:34:36.364198251Z
---

## Goal

Snapshots are never removed, so a heavy writer's IndexedDB grows by a few hundred MB a year and never shrinks. worldcrafter-my9t proposed a thinning rule (`planSnapshotThinning` in `app/src/storage/retention.ts`, written up under "Snapshot retention" in `docs/rebuild/data-model-boundaries.md`) but deletes nothing: removing snapshots waits for Sumeet (mission worldcrafter-3z9j's Authority). Once he approves the rule, or changes its windows, wire it up and give the writer a way to see and reclaim the space.

Sumeet's answers needed first: are 14 days (keep all) and 90 days (one a day, then one a week) the right windows; should thinning run automatically at startup or only from a button; should a deleted document's history be thinned like a live one's.

## Done when

- [ ] Sumeet has approved the rule and its trigger, recorded in `docs/rebuild/data-model-boundaries.md`, and `needs-human` is removed.
- [ ] `SnapshotCollection` has a delete of many snapshots in one transaction, covered by the storage contract tests for both adapters.
- [ ] Thinning runs only in the writer tab, as approved, and tests show it never removes the newest snapshot of a document, an `accepted_ai_change`, `repaired_on_load` or sync pre-overwrite snapshot (worldcrafter-ji5d), or anything under the keep-all age.
- [ ] `planSnapshotThinning` counts a document's protected newest `periodic` snapshot as its day's or week's kept copy, so a document untouched for 14 days keeps one copy in that bucket, not two; tested with a dormant document whose last two snapshots share a bucket (review finding worldcrafter-my9t/1-igoh.1).
- [ ] Settings shows storage used against quota, snapshot count and size per document, and what thinning would free before it runs.

## Scope

In: snapshot delete in storage, the thinning trigger, snapshot size in metadata, the settings Storage section. Out: syncing snapshots, deleting a document's whole history.
