---
schema: atelier.review
schema_version: 3
round: 1
commit: 090cb188dea1528a159aa638170fe497ff9a12b9
reviewers:
- thread:delegated-task:command%3Amcp%3A769370b8-68ef-45da-9e71-ed58aed1e608%3Adelegate-task%3A98c8a696-e828-4dd4-8f7f-a97fc03655d9
model: gpt-6.1-sol
verdict: changes
created_at: 2026-11-23T05:28:02.303536414Z
---

## Summary

- Complexity: high. This introduces a Durable Object, a shared wire contract, device-local sync metadata, and the client conflict-resolution path.
- Value: high. The laptop-and-phone outcome needs a server revision check and preservation of losing document drafts.
- Risk of merging it: high. Sync replaces and deletes persistent records; an error can silently lose prose or strand a device's catch-up.

The value justifies the subsystem. I found no substantially smaller implementation that supplies its concurrency and offline guarantees, but pull pages need a size bound before merge.

I read `git diff master...090cb188dea1528a159aa638170fe497ff9a12b9`, the item, the sync documentation, and the existing storage and document-session contracts. I checked collection coverage, revision and cursor handling, tombstone recreation, snapshot-before-overwrite, Access verification, request validation, and Worker configuration against the Done when lines. `cd app && bun run check` passed: typecheck, Biome, 1,554 tests, zero failures. The tests exercise the required two-device cases on both memory and IndexedDB adapters.

I also bundled a temporary entry that calls the real `handleRequest` with a local test verifier and ran it through Miniflare/workerd with a SQLite-backed `SyncWorld`. New writes, stale-revision rejection, and pulls worked. Uploading 80 records of about one million ASCII characters in client-sized batches succeeded; the following pull returned 80,013,456 characters in one response. A separate 750,104-character record with 2,250,104 UTF-8 bytes was accepted. These were bounded local tests in `/tmp/ji5d-review-runtime`, disposed after completion; no dev/watch command, deployment, remote push, or Cloudflare resource creation was used.

I did not exercise a live Access application, real browser storage, or Cloudflare's production memory enforcement. The production failure in Finding 1 follows from the accepted page sizes and the published memory limit, rather than a local out-of-memory reproduction. The report is candid that app integration is absent; that falls outside this item's backend/client-adapter scope and is tracked in Finding 2.

## Finding 1: Bound pull pages by size before loading every record into memory
Recommendation: fix now

`app/src/worker/ledger.ts:146–155` spreads every selected SQLite row into an array, then parses all its record JSON; `app/src/worker/index.ts:121` serializes the whole result with `Response.json`. Only the row count bounds this work. `MAX_PULL_CHANGES = 200` and `MAX_RECORD_LENGTH = 1_900_000` (`app/src/sync/protocol.ts:43–49`) allow roughly 380 million ASCII characters in a single page, before the row objects, parsed copies, and response encoding. This exceeds [Cloudflare's 128 MB memory limit per isolate](https://developers.cloudflare.com/workers/platform/limits/#memory), which [also applies to Durable Objects](https://developers.cloudflare.com/durable-objects/platform/limits/). Multi-byte text can increase the encoded page size further.

This can happen with entirely valid records accepted in the client's small push batches. An offline or new device must then pull the oversized page before it can push anything; the failed pull leaves its cursor unchanged and offers no smaller-page option, so repeating sync does not get it past that page. The local 80-record test above establishes that the current implementation does not impose a cumulative size bound; the existing pagination test uses tiny records and does not cover this case.

Bound the cumulative page size with room for parsing and serialization overhead, without first materializing the full 200-row payload. Keep the cursor on the last included change and set `more` when records remain. Add a test that uploads individually legal large records across multiple pushes and catches up through several bounded pulls, checking that no revisions are skipped and that one legal record still makes progress.

## Finding 2: Track session-safe app integration before claiming usable device sync
Recommendation: defer
Dropped by mcp:7d857dc0-4a0b-4b45-94fa-b528d1f91a2b: Already tracked: worldcrafter-zvj0 covers wiring sync into the app without overwriting open documents.

`syncWorld` has no app caller, as the report and `docs/rebuild/sync.md:87–94` acknowledge. `app/src/workspace/document-session.ts:262–305` saves its in-memory editor value without observing a sync write, so simply wiring an online/startup callback would let stale in-memory prose become a fresh accepted edit after a pull. A writer-tab check alone also does not serialize local edits, agent writes, or overlapping sync runs with adoption of server records.

This need not block the scoped backend item, but it needs its own tracked delivery before the feature is enabled. I filed `worldcrafter-zvj0`, "Enable app sync without overwriting open documents", blocked by this item, with session flushing/reloading, coordination throughout sync, UI status, and regression tests in its Done when lines. Nothing was enabled or deployed by this review.
