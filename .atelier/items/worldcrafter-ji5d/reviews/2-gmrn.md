---
schema: atelier.review
schema_version: 3
round: 2
commit: 0a30af91b8506a63e651d03adee199e45b34edc4
reviewers:
- thread:delegated-task:command%3Amcp%3A769370b8-68ef-45da-9e71-ed58aed1e608%3Adelegate-task%3A16078e76-8b28-428c-b4ba-1d593c288c54
model: gpt-6.1-sol
verdict: changes
created_at: 2026-11-23T05:36:11.083597833Z
---

## Summary

- Complexity: high. The change adds a Durable Object, a wire protocol, local sync metadata, and conflict adoption across persistent collections.
- Value: high. Revision checks and preservation of losing document drafts are necessary for laptop-and-phone sync.
- Risk of merging it: high. Sync replaces persistent records, and valid batches can exhaust the Worker's memory before conflict handling completes.

The value justifies the subsystem. I found no substantially smaller implementation that supplies the required conflict guarantees. The earlier pull-page finding is fixed, but the same memory problem remains in push conflict responses and needs a bound before merge.

I checked every commit since round 1 (`git diff 090cb188dea1528a159aa638170fe497ff9a12b9 0a30af91b8506a63e651d03adee199e45b34edc4`), the current ledger and test adapter, the client and protocol, configuration, report, documentation, and required two-device tests. `cd app && bun run check` passed: TypeScript, Biome, and 1,557 tests with zero failures. The tests still cover the Done when conflict, tombstone, reconnect, and clock scenarios on memory and IndexedDB adapters.

I bundled a temporary entry importing the current `SyncWorld` and `handleRequest`, with an allow-all local test verifier, then used Miniflare/workerd directly from `/tmp/ji5d-review-runtime`. No dev/watch command was used. The script `round2.mjs` uploaded 80 documents of approximately one million ASCII characters each in six-record batches. Catch-up returned all 80 revisions in order across 12 pages; the largest page held 7,000,735 bytes of record JSON. A 2,250,112-byte multibyte record was rejected, and a legal approximately 1.8 MB multibyte record was accepted and pulled. The same script reproduced the oversized push response in Finding 2.

I did not test a live Access application, production memory enforcement, or app integration. The app still has no sync caller, and session-safe integration remains tracked in `worldcrafter-zvj0`. No remote push, deployment, or Cloudflare resource creation occurred. The report's claim that runtime testing requires `wrangler dev` does not hold: the bounded Miniflare test exits and disposes its runtime without any watch command. Its statement about the current SQLite row limit also needs the documentation correction in Finding 3.

## Finding 1: Bound pull pages by size before loading every record into memory
Recommendation: fix now
Was: 1-vant.1
Response: fixed in 4799884
Now: fixed

`ledger.ts:147` now consumes rows individually, stops before adding a row that exceeds the cumulative byte budget, and returns the last included revision with `more` set when another row remains. UTF-8 byte accounting replaces character accounting for both page and individual-record limits. The added tests and the workerd check described above confirm bounded paging without skipped revisions, multibyte rejection, and forward progress. This fixes the original pull finding.

## Finding 2: Bound push conflict responses before collecting every server record
Recommendation: fix now

`app/src/worker/ledger.ts:117–122` loads and parses the entire held record for each conflict. `ledger.ts:172–175` retains all those records in `changes.map`, and `app/src/worker/index.ts:125` passes the complete result to `Response.json`. `MAX_PUSH_CHANGES = 100` permits approximately 190 MB of record JSON in one response, before parsed objects and serialization overhead. That exceeds [Cloudflare's 128 MB isolate limit](https://developers.cloudflare.com/workers/platform/limits/#memory), which [also applies to Durable Objects](https://developers.cloudflare.com/durable-objects/platform/limits/).

The client bounds push batches using the outgoing records' sizes (`app/src/sync/client.ts:449–471`), which does not bound the sizes of newer server records. A batch of small offline edits or tombstones can conflict with much larger server documents written after its pull. This is the same supported pull/push race as the required stale-phone test, across several records. The revised pull bound does not protect this response.

In the local workerd test, after the legal uploads and successful bounded pulls, a 16,328-byte request containing 80 tiny stale edits returned 80 conflict results in an 80,023,174-byte response. All records and the request pass the existing validators. Raising those held records toward the accepted 1.9 MB limit takes this response above 128 MB; the local check establishes the absent bound, rather than reproducing production memory enforcement. A production resource failure returns an error instead of the conflict records the client needs to snapshot and adopt in that sync attempt.

Bound the worst-case push response before materializing all held records. A small server-enforced push count derived from `MAX_RECORD_BYTES`, with matching client batching, is one simple option; a byte-bounded conflict protocol is another. Preserve one result per submitted change and snapshot-before-adoption. Add a regression with individually legal large server records and many small stale edits/tombstones, and verify bounded responses plus completed conflict adoption.

This code predates round 2, but the finding blocks because a valid stale-push request can exceed the deployment runtime's memory limit and fail the required conflict path.

## Finding 3: Correct the documented SQLite row limit
Recommendation: defer
Taken: worldcrafter-w1q0 by mcp:7d857dc0-4a0b-4b45-94fa-b528d1f91a2b

`app/src/sync/protocol.ts:47–48`, `docs/rebuild/sync.md:38`, and the Report describe the Durable Object SQLite row limit as 2 MB. [Cloudflare's current limits](https://developers.cloudflare.com/durable-objects/platform/limits/#sql-storage-limits) specify an 8 MB maximum string, BLOB, or table row. Keeping `MAX_RECORD_BYTES = 1_900_000` is a safe application limit and need not change; the platform-limit explanation should distinguish it from Cloudflare's current limit. This is documentation accuracy and does not block the backend's behavior.
