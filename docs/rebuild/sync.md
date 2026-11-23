# Sync between devices

One writer moves between a laptop and a phone. Each device keeps the whole
world in its own IndexedDB and works offline. Sync carries every change
through a Cloudflare Worker so that a device coming back online can't
overwrite newer work, and a document edit that loses is kept as a snapshot
instead of vanishing (`worldcrafter-ji5d`).

## Pieces

- `app/src/sync/protocol.ts`: the messages and their checks, shared by both
  sides.
- `app/src/worker/`: the Worker. `index.ts` routes requests and serves the
  static app; `access.ts` checks the Cloudflare Access token; `ledger.ts`
  keeps one world's records in its Durable Object's SQLite.
- `app/src/sync/client.ts`: `syncWorld`, one pull-then-push run over a
  `StorageAdapter`. `transport.ts` reaches the Worker with `fetch`;
  `state.ts` keeps the device ID and per-record sync state in localStorage.

## What syncs

Every `StorageAdapter` collection except snapshots, which are device-local
history. A record is matched across devices by collection and key
(`SYNC_FIELDS` in `storage/types.ts`), and a delete travels as the tombstone
`worldcrafter-4t98` added.

## Revisions, not clocks

The Worker numbers every accepted write or delete with the next value of one
counter per world, the record's `serverRev`, and stamps `syncedAt` by its own
clock. Device clocks order nothing, so a phone whose clock runs fast or slow
gets no advantage or penalty: `updatedAt` and `deletedAt` travel as data.

Because the counter is per world, the highest `serverRev` a device has pulled
is its cursor, and a pull is "every record whose newest revision is above my
cursor", 200 at a time.

## Pull, then push

1. **Pull** every change since the cursor, writing each one locally.
2. **Push** every local record whose content differs from what last synced,
   with `baseRev`, the revision it was edited from (0 if the server has never
   had it).

The Worker takes a push only when `baseRev` is the record's current revision,
in one SQLite transaction per push. Otherwise it answers `conflict` with what
it holds. So a stale device can never overwrite a newer edit or delete; at
worst its push is refused and it takes the newer revision.

A device knows a record is dirty by comparing a hash of its content with the
hash it recorded when the record last synced (`state.ts`). Saving and
deleting need no sync hook, and a record saved with the same content the
server already holds isn't a conflict.

## Who wins

The first device to sync a change wins. When the other device then pulls (or
has its push refused) and it had also changed the record:

- **Documents**: its content is saved as a `sync_conflict` snapshot, then the
  server's revision (or delete) replaces it. Retention never thins
  `sync_conflict` snapshots (`storage/retention.ts`).
- **Everything else**: the server's revision replaces it and the local edit
  is dropped, reported in `SyncReport.conflicts`.

A delete is a revision like any other. A record edited on one device after
another deleted it does not come back; saving it again after the delete has
synced recreates it, because that save's `baseRev` is the tombstone's
revision.

## Access

Cloudflare Access sits in front of the whole hostname, and the Worker also
checks Access's signed token itself (`Cf-Access-Jwt-Assertion`: RS256
signature against the team's keys, audience, issuer, expiry), so the
`*.workers.dev` URL can't be used to skip Access. Until `ACCESS_TEAM_DOMAIN`
and `ACCESS_AUD` are set in `wrangler.jsonc` (or as Worker variables) the sync
API refuses every request. One Durable Object per world ID holds its records;
any user Access lets in can read and write them, which suits one writer.

## Deploying (Sumeet)

Nothing here has been deployed. To turn it on:

1. Create an Access application for the Worker's hostname and note its AUD
   tag and the team domain.
2. Set `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` in `app/wrangler.jsonc`.
3. `cd app && bun run build && bunx wrangler deploy`. The first deploy
   creates the `SyncWorld` Durable Object namespace (migration `v1`).

## Not done yet

- **The app doesn't call `syncWorld` yet.** An open document session holds
  its content in memory and saves it over whatever sync wrote, which would
  push stale prose as a fresh edit. Wiring sync into the app needs the
  writer tab to run it, open sessions to flush before and reload after, and a
  sync control and status. That is its own item.
- Tombstones and sync state are never pruned.
- A ledger that is reset (a new Durable Object) is not detected: devices
  would keep their old cursors. Clearing a device's sync state
  (`worldcrafter:<world>:sync`) makes it pull everything again.
