---
schema: atelier.item
schema_version: 3
id: worldcrafter-ji5d
title: Cloudflare Worker sync backend for laptop and phone
status: approved
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

- [x] Worker sync endpoints implement pull-then-push with monotonic per-record `serverRev`, Worker-stamped `syncedAt`, and optimistic `baseRev` conflict checks across all synced `StorageAdapter` collections (excluding device-local snapshots) behind Cloudflare Access auth headers, with `deviceId` and per-record sync state stored locally per browser profile.
- [x] On a `Document` conflict (stale `baseRev` rejected by Worker, or pulled revision overwriting a locally dirty document), the client records a device-local snapshot of the losing local prose before adopting the server revision.
- [x] Automated tests cover: (a) concurrent edit of the same record on two devices, (b) stale offline reconnect (phone offline with small edit, laptop writes & syncs long passage, phone reconnects and pushes → phone's stale push is rejected, laptop's passage survives, phone's edit is preserved in a local snapshot), (c) stale edit vs. newer delete tombstone (does not resurrect), (d) explicit recreate after pulling a tombstone, (e) offline reconnect catch-up, and (f) skewed client clock (ahead/behind) not winning unfairly.
- [x] `app/wrangler.jsonc` is updated to serve both the Worker sync routes and `./dist` static assets (keeping the Worker name `worldcrafter` until `worldcrafter-v61k`).
- [x] Contract and integration tests pass locally; `cd app && bun run check` passes.

## Scope

In: Cloudflare Worker sync endpoints, client sync adapter, `app/wrangler.jsonc` Worker+assets config, and conflict/reconnect tests.
Out: Optional inference proxy (`worldcrafter-gs9g`), multi-user collaboration, and live deployment or domain cutover (`worldcrafter-v61k`, waits for Sumeet).

## Report

Laptop and phone can now sync one world through a Cloudflare Worker, and a device that was offline can't overwrite newer work: its stale push is refused, and its losing document prose is kept as a snapshot. Commit `4ac6d77`. **Nothing calls it from the app yet** (see the first point under "Not done"), and nothing was deployed.

**Worker** (`app/src/worker/`). `index.ts` routes `/api/sync/<world>/pull|push` and serves `./dist` for everything else. Each world is one SQLite-backed Durable Object (`SyncWorld`); `ledger.ts` keeps one row per `(collection, key)` with the newest record or tombstone. `serverRev` is one counter per world, so it only grows per record and doubles as the pull cursor. A push is accepted only when its `baseRev` equals the row's current revision, all in one `transactionSync`; otherwise the answer is `conflict` with the revision it holds, and no record, so a push's response stays small (review round 2); the client then pulls again to get that revision. `syncedAt` is the Worker's clock; client `updatedAt`/`deletedAt` are data and order nothing. Records over 1.9 MB of UTF-8 JSON (below the DO row limit of 8 MB, so any record fits a pull page) are answered `rejected` instead of failing the push. A pull page stops at 200 records or 8 MB of record JSON, whichever comes first, reading rows one at a time, so a page of large records never sits in a 128 MB isolate whole (review round 1). `access.ts` checks the `Cf-Access-Jwt-Assertion` token itself (RS256 against the team's certs, audience, issuer, expiry), so the `workers.dev` URL can't bypass Access; until `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` are set, every sync call gets 503.

**Client** (`app/src/sync/`). `syncWorld` pulls every page since the cursor, then pushes every local record or tombstone whose content hash differs from what last synced. `state.ts` keeps the `deviceId` (`worldcrafter:device-id`) and per world (`worldcrafter:<world>:sync`) the cursor and, per record, `{ rev, hash }`. Dirty means "content hash differs from the synced hash", rather than a stored `dirty` flag, so saves and deletes need no sync hook and a record that already matches the server is never a conflict. On a conflict (pulled, or a push refused and then pulled again), a document edited here is saved as a `sync_conflict` snapshot in the same batch as the server's revision is written (snapshot first, then delete, when the server deleted it); any other record takes the server's revision, and the dropped edit is listed in `SyncReport.conflicts`. Records from the server go through `checkStoredRecord` (newly exported from `world-file.ts`) before they are stored. `SnapshotReason` gains `sync_conflict`, which retention already never thins.

**Config.** `app/wrangler.jsonc` now has `main`, `assets` with `run_worker_first: ["/api/*"]`, the `SYNC_WORLDS` Durable Object binding with a `new_sqlite_classes` migration, and empty Access vars. The name stays `worldcrafter`. `bunx wrangler deploy --dry-run` bundles it and lists the bindings; nothing was deployed and no Cloudflare resource was created. Deploy steps for Sumeet are in `docs/rebuild/sync.md`.

**Tests** (`bun run check` passes, 1560 tests). `src/sync/client.test.ts` runs two devices through the real Worker handler and ledger (in-process, `bun:sqlite` standing in for the DO's SQLite) over the fetch transport, each scenario on both memory and IndexedDB storage: (a) the same document and story record edited on both devices; (b) stale offline reconnect, with the laptop's sync forced between the phone's pull and push, so the Worker refuses the phone's push, the laptop's passage survives on both, and the phone's edit is in a `sync_conflict` snapshot (plus the same without the race, and twelve ~320 KB passages refused at once in one push); (c) a stale edit against a newer delete, pulled and as a refused push, doesn't resurrect; (d) a save after pulling the tombstone recreates the record everywhere; (e) catch-up across 280 changes with paging and deletes while the phone's own new record goes out; (f) a fast clock's stale edit still loses and a slow clock's current edit still wins. Also: ledger tests (revisions, conflicts, tombstones, paging by count and by size with no skipped revisions, size rejection in UTF-8 bytes, reopen), Access tests with a generated RSA key (valid, wrong audience, issuer, expiry, forged signature, tampered payload, unknown kid), routing tests (assets, 503, 403, 404, 405, 400, worlds kept apart), transport tests (Access redirect or sign-in page reads as `signed_out`), and state tests.

**Not done, and why.**
- **The app doesn't call `syncWorld`.** An open document session holds its content in memory and saves over whatever sync writes, which would then push stale prose as a fresh edit with a current `baseRev` and overwrite the other device's work. Wiring sync in needs the writer tab to run it, open sessions to flush before and reload after, and a sync control and status. That is outside this item's scope ("Worker sync endpoints, client sync adapter, wrangler config, tests"); the round 1 reviewer filed it as `worldcrafter-zvj0`.
- Not run in `workerd`: that needs `wrangler dev`, a watch command this repo forbids. The ledger's SQL is plain SQLite (`UPDATE ... RETURNING`, `ON CONFLICT DO UPDATE`), and the DO-facing surface (`ctx.storage.sql.exec`, `transactionSync`) is typed by hand in `index.ts` rather than from `@cloudflare/workers-types`, to avoid a new dependency.
- Tombstones and sync state are never pruned.
- A reset ledger isn't detected (devices keep old cursors).

**Choices a reviewer may question.**
- The server keys data by world ID only, not by Access user: any identity Access admits can read and write every world. Fine for one writer; multi-user is out of scope.
- A push with a nonzero `baseRev` for a key the ledger doesn't hold is accepted (only a reset ledger produces that, and refusing would strand the edit).
- A local delete of a key the server never had is not pushed.
- Pull looks up a key's tombstone by listing the collection's tombstones, once per pulled change. Fine at this app's sizes; a cache would be the fix if it shows.


### Responses

1-vant.1: fixed in 4799884
2-gmrn.2: fixed in 93879c5
2-gmrn.3: fixed in 93879c5
