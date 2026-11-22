---
schema: atelier.item
schema_version: 3
id: worldcrafter-ji5d
title: Cloudflare Worker sync backend for laptop and phone
status: open
mission: worldcrafter-3z9j
labels:
- sync
- worker
priority: medium
blocked_by:
- worldcrafter-4t98
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T22:39:04.598196939Z
---

## Goal

Build the Cloudflare Worker sync backend (behind Cloudflare Access, per `worldcrafter-gcox`) over `worldcrafter-4t98`'s sync-ready tombstones and change timestamps so one writer can switch between laptop and phone. Uses **last-write-wins (LWW)** per record by `updatedAt` / `deletedAt` timestamp with a deterministic device-ID tie-breaker, and updates `app/wrangler.jsonc` from static-assets-only to Worker + static assets.

## Done when

- [ ] Worker sync endpoints push and pull changed records and tombstones across all synced `StorageAdapter` collections (excluding device-local snapshots) behind Cloudflare Access auth headers.
- [ ] Conflict resolution implements LWW by `updatedAt` / `deletedAt` with deterministic device-ID tie-breaking, and automated tests cover: (a) concurrent edit of the same record on two devices, (b) edit vs. delete tombstone, (c) recreate after tombstone, and (d) offline reconnect catch-up.
- [ ] `app/wrangler.jsonc` is updated to serve both the Worker sync routes and `./dist` static assets (keeping the Worker name `worldcrafter` until `worldcrafter-v61k`).
- [ ] Contract and integration tests pass locally; `cd app && bun run check` passes.

## Scope

In: Cloudflare Worker sync endpoints, client sync adapter, `app/wrangler.jsonc` Worker+assets config, and conflict/reconnect tests.
Out: Optional inference proxy (`worldcrafter-gs9g`), multi-user collaboration, and live deployment or domain cutover (`worldcrafter-v61k`, waits for Sumeet).
