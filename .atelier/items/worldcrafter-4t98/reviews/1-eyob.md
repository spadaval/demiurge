---
schema: atelier.review
schema_version: 3
round: 1
commit: 996d0f31eeb3d9ab36330af6e224c0f16db10e8d
reviewers:
- thread:delegated-task:command%3Amcp%3Aaaf7f6cd-4ac3-4736-9d48-f2f68d43b2ee%3Adelegate-task%3A143dead0-0091-4098-bb39-2a368aee6318
model: gpt-6.1-sol
verdict: approve
created_at: 2026-11-23T05:11:52.885324053Z
---

## Summary

- Complexity: high. This adds durable deletion state and a storage contract across two adapters, batch writes, restore, and a schema migration.
- Value: high. The planned sync backend needs retained deletes to prevent another device from restoring deleted records.
- Risk of merging: medium. This changes persistent writes and the IndexedDB schema; the migration is additive, and record/tombstone updates share a transaction.

Reviewed `master...996d0f31eeb3d9ab36330af6e224c0f16db10e8d` against every Done when line and the Report. Checked all eight synced collections, tombstone ordering and separation, annotation/session indexes, resurrection through save/batch/restore, snapshot exclusion, connected storage including read-only access, and the compile-time key/change-time checks. The version 3 upgrade test preserves records in every collection, snapshot content, and indexes, then verifies a tombstone survives reopening.

`cd app && bun run check` passed: TypeScript, Biome, and 1,471 tests across 65 files. Additional in-memory checks against both adapters confirmed that uncloneable values in a save, batch, or restore leave existing tombstones intact; queued save/delete/save operations resolve to the last save; and save/delete operations on one story key within a batch honor their order.

The shared tombstone store keeps the change focused and avoids adding filtering to each record reader. The value warrants the added state and migration. No findings.

IndexedDB verification used fake-indexeddb, not a real browser or a power-loss test. No network sync behavior was tested; that belongs to the follow-up backend item.
