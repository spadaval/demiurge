---
schema: atelier.review
schema_version: 3
round: 3
commit: 2e9afb1440d7e7e0c32bf7d9a71f2270a7cfc195
reviewers:
- thread:delegated-task:command%3Amcp%3A769370b8-68ef-45da-9e71-ed58aed1e608%3Adelegate-task%3Ad60f211c-ec52-4ab8-8387-89b692e81702
model: gpt-6.1-sol
verdict: approve
created_at: 2026-11-23T05:41:44.487626320Z
---

## Summary

- Complexity: high. The whole change adds a Durable Object, a shared protocol, local revision metadata, and conflict adoption across persistent collections.
- Value: high. Revision checks and preservation of losing drafts are necessary for laptop-and-phone sync.
- Risk of merging it: high. The subsystem replaces persistent records and must preserve prose through conflicts and interrupted runs.

The value justifies the subsystem. The revision-only conflict response is a small fix at the cause of the remaining memory problem, and the client obtains the records through the existing bounded pull path. I found no remaining fix-now finding or substantially smaller way to supply the required guarantees.

I checked the commits since round 2 (`git diff 0a30af91b8506a63e651d03adee199e45b34edc4 2e9afb1440d7e7e0c32bf7d9a71f2270a7cfc195`), the ledger's revision lookup and bounded paging, protocol validation, client state persistence and snapshot-before-adoption, changed tests, documentation, and Report. The Done when scenarios remain covered on memory and IndexedDB storage. `cd app && bun run check` passed: TypeScript, Biome, and 1,560 tests with zero failures. The documented 8 MB SQLite row limit now distinguishes the platform limit from the 1.9 MB application limit.

I rebuilt the temporary local test entry against this commit and reran the previous review's finite Miniflare/workerd script. Eighty approximately 1 MB documents uploaded successfully; catch-up returned every revision across 12 pages, with at most 7,000,735 bytes of record JSON per page. A 16,328-byte stale push returned 80 conflicts in 6,314 bytes, instead of the previous approximately 80 MB response. The script also checked rejection of an oversized UTF-8 record and successful pull of a legal multibyte record. The runtime was disposed after the script finished. This check requires no dev/watch command; the Report's claim that workerd testing requires `wrangler dev` remains too strong, but the review now supplies that runtime validation.

An additional stdin-only two-device check through the real handler and fetch transport raced the laptop's sync between the phone's pull and push. It combined twelve approximately 1 MB documents, a server tombstone against a phone edit, and a phone tombstone against a newer server document. All 14 pushes conflicted; the client adopted all 14 revisions across two follow-up pull pages, preserved all 13 losing local drafts as snapshots, adopted the server tombstone, and restored the newer server record over the stale local tombstone. The push response was 1,118 bytes, the largest pull response was 7,001,562 bytes, and the next sync reported no changes or conflicts.

I did not test live Access configuration, production memory enforcement, deployment, or app integration. App integration remains explicitly outside this backend item and tracked in `worldcrafter-zvj0`. No remote push, deployment, dev/watch command, or Cloudflare resource creation occurred.

## Finding 1: Bound push conflict responses before collecting every server record
Recommendation: fix now
Was: 2-gmrn.2
Response: fixed in 93879c5
Now: fixed

`app/src/worker/ledger.ts` now selects only `rev` when checking a push and returns a conflict's collection, key, and revision without reading or parsing the held record. The protocol validator accepts that bounded response, and `app/src/sync/client.ts` follows any conflicts with a pull from the existing cursor. Accepted push revisions remain in local sync state, so those records are not adopted again; conflicted documents still pass through snapshot-before-adoption. The new ledger and integration regressions, the workerd response-size check, and the mixed multi-page conflict check above confirm that the original response-memory problem is fixed without losing drafts or skipping revisions.
