---
schema: atelier.item
schema_version: 3
id: worldcrafter-hu3l
title: Story tool mutations read every scene document to trace stale text
status: open
mission: null
labels: []
priority: medium
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-23T04:13:38.349420704Z
---

## Goal

Taken from deferred finding worldcrafter-7r87/2-w96f.3, in .atelier/items/worldcrafter-7r87/reviews/2-w96f.md:

> Finding 3: Every mutation loads every scene document
> Recommendation: defer
> Was: 1-bkw1.3
> Now: kept
>
> `mutation()` still sets `readsProse: true` for all 68 commands (`tools.ts:285`). `runMutation` then always calls `storedProse` after the save (`tools.ts:1137-1143`), so `addActor` reads every linked document and will attach `proseNotRead` for an unrelated missing file. A `StorageFailure` from that load also turns a write that already landed into `err`. Load prose when `changedRef` can produce stale suspects, or treat a post-save prose failure as empty prose plus `proseNotRead` rather than failing the call.

## Done when

- [ ] A mutation reads scene prose only when its change can make text stale, with a test that `addActor` reads no scene document.
- [ ] A failure to read prose after the bible is saved does not turn the saved write into an error: the result is ok and reports the documents in `proseNotRead`.
- [ ] `cd app && bun run check` passes.

## Scope

In: `app/src/story/tools.ts`, `app/src/story/stored-prose.ts` and their tests.
Out: changing what `trace` reports.
