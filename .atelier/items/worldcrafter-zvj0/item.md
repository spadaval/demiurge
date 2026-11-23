---
schema: atelier.item
schema_version: 3
id: worldcrafter-zvj0
title: Enable app sync without overwriting open documents
status: open
mission: null
labels: []
priority: medium
blocked_by:
- worldcrafter-ji5d
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-23T05:32:56.178374697Z
---

## Goal

Make the sync backend from `worldcrafter-ji5d` usable from the app so the writer can switch between laptop and phone without an open editor saving stale in-memory prose over a pulled revision. The backend item intentionally leaves `syncWorld` uncalled; `docs/rebuild/sync.md` describes this integration gap.

## Done when

- [ ] The world's writer tab can run sync with persistent device identity and per-world sync state, with a visible control and a status for success, offline, signed-out, conflicts and rejected records.
- [ ] Sync flushes open document sessions before pulling, coordinates with local mutations throughout the run, and reloads or replaces affected in-memory sessions before they can save again. Read-only tabs do not push, and overlapping sync runs are serialized.
- [ ] A test with a live document session shows that an offline local edit is snapshotted when a newer server revision wins and that later autosave cannot push stale prose over that revision. Another test covers editing or an agent write during sync without silently losing that edit.
- [ ] Offline and failed sync leave local work usable and report a recoverable error; `cd app && bun run check` passes.

## Scope

In: app and document-session integration of the existing sync client, writer-tab coordination, sync controls and status, and regression tests.

Out: live deployment, Cloudflare resources, domain cutover, and multi-user collaboration.
