---
schema: atelier.item
schema_version: 3
id: worldcrafter-ji5d
title: Cloudflare Worker sync backend for laptop and phone
status: building
mission: worldcrafter-3z9j
labels:
- sync
- worker
priority: medium
blocked_by:
- worldcrafter-4t98
implementers:
- thread:delegated-task:command%3Amcp%3A6d73f777-f6d1-4f6c-b6f0-9f634b2c4463%3Adelegate-task%3A92879e3a-9e0a-4502-9bbf-4994df0ae044
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T22:39:04.598196939Z
---

## Goal

Build the Cloudflare Worker sync backend (behind Cloudflare Access, per `worldcrafter-gcox`) over `worldcrafter-4t98`'s sync-ready tombstones and change timestamps so one writer can switch between laptop and phone without losing offline edits.

**Sync & conflict protocol:**
- Each browser profile mints a persistent `deviceId` (random UUID in `localStorage`) and keeps device-local sync metadata (last pulled cursor and per-record `{ serverRev, dirty }` state, outside synced world records).
- The Worker assigns a monotonic per-record `serverRev` (and `syncedAt` receipt timestamp) on every accepted write or tombstone.
- Sync runs **pull-then-push**; every pushed record or tombstone carries its `baseRev` (the last `serverRev` this client pulled, or `0` for new records).
- **Optimistic concurrency:** if `baseRev` matches the Worker's current `serverRev`, the Worker accepts the push and increments `serverRev`. If `baseRev` is stale (another device pushed a newer edit or tombstone first), the Worker rejects that item with `conflict` + the server's current record/tombstone rather than letting a stale offline device overwrite newer work.
- **Conflict resolution on the client:**
  - For **Plate `Document` records**, the client snapshots its losing local draft into device-local snapshots (reusing `document-session`'s snapshot mechanism) before adopting the server's newer revision—so neither device's prose is ever silently lost.
  - For **non-document records** (bible records, annotations, requests), the server's newer revision wins cleanly (and a stale edit against a newer tombstone does **not** resurrect the deleted record; an explicit new save after pulling the tombstone recreates it with the tombstone's `serverRev` as `baseRev`).
- Updates `app/wrangler.jsonc` from static-assets-only to Worker + static assets.

## Done when

- [ ] Worker sync endpoints implement pull-then-push with monotonic per-record `serverRev`, Worker-stamped `syncedAt`, and optimistic `baseRev` conflict checks across all synced `StorageAdapter` collections (excluding device-local snapshots) behind Cloudflare Access auth headers, with `deviceId` and per-record sync state stored locally per browser profile.
- [ ] On a `Document` conflict (stale `baseRev` rejected by Worker, or pulled revision overwriting a locally dirty document), the client records a device-local snapshot of the losing local prose before adopting the server revision.
- [ ] Automated tests cover: (a) concurrent edit of the same record on two devices, (b) stale offline reconnect (phone offline with small edit, laptop writes & syncs long passage, phone reconnects and pushes → phone's stale push is rejected, laptop's passage survives, phone's edit is preserved in a local snapshot), (c) stale edit vs. newer delete tombstone (does not resurrect), (d) explicit recreate after pulling a tombstone, (e) offline reconnect catch-up, and (f) skewed client clock (ahead/behind) not winning unfairly.
- [ ] `app/wrangler.jsonc` is updated to serve both the Worker sync routes and `./dist` static assets (keeping the Worker name `worldcrafter` until `worldcrafter-v61k`).
- [ ] Contract and integration tests pass locally; `cd app && bun run check` passes.

## Scope

In: Cloudflare Worker sync endpoints, client sync adapter, `app/wrangler.jsonc` Worker+assets config, and conflict/reconnect tests.
Out: Optional inference proxy (`worldcrafter-gs9g`), multi-user collaboration, and live deployment or domain cutover (`worldcrafter-v61k`, waits for Sumeet).
