---
schema: atelier.item
schema_version: 3
id: worldcrafter-w1q0
title: Sync docs call the Durable Object SQLite row limit 2 MB; Cloudflare's is 8 MB
status: open
mission: null
labels: []
priority: medium
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-23T08:06:15.173449053Z
---

## Goal

Taken from deferred finding worldcrafter-ji5d/2-gmrn.3, in .atelier/items/worldcrafter-ji5d/reviews/2-gmrn.md:

> Finding 3: Correct the documented SQLite row limit
> Recommendation: defer
>
> `app/src/sync/protocol.ts:47–48`, `docs/rebuild/sync.md:38`, and the Report describe the Durable Object SQLite row limit as 2 MB. [Cloudflare's current limits](https://developers.cloudflare.com/durable-objects/platform/limits/#sql-storage-limits) specify an 8 MB maximum string, BLOB, or table row. Keeping `MAX_RECORD_BYTES = 1_900_000` is a safe application limit and need not change; the platform-limit explanation should distinguish it from Cloudflare's current limit. This is documentation accuracy and does not block the backend's behavior.

## Done when

## Scope
