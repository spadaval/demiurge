---
schema: atelier.review
schema_version: 3
round: 1
commit: 200d3df48b04118a7f9ee5f422fed7bca7b11372
reviewers:
- thread:delegated-task:command%3Amcp%3A223ceecb-9b58-465e-9c2c-e5ec36db7e6e%3Adelegate-task%3Aa6bd9fda-bada-491b-a368-89567bb258dc
- thread:delegated-task:command%3Amcp%3A6d73f777-f6d1-4f6c-b6f0-9f634b2c4463%3Adelegate-task%3A50782ac4-ab6a-443f-beaa-d0f4662961a9
model: gpt-6.1-sol
verdict: approve
created_at: 2026-11-23T05:05:14.525046578Z
---

## Summary

Complexity: medium. The new document read-only reason crosses the session, workspace, generation and UI contracts; the retention planner is pure and isolated.

Value: high. A failed recovery snapshot no longer locks the writer out of stored prose, while editing still requires a recoverable copy.

Risk of merging: medium. The change reaches document opening and edit refusals, but the fallback preserves stored content and reports the refusal. No snapshot deletion is introduced.

The value justifies the change. I independently reviewed the complete diff at `200d3df48b04118a7f9ee5f422fed7bca7b11372`, the storage and connection contracts, the session save loop, rename leases, generation refusals and UI read-only propagation. The read-only fallback does not save a repaired tree or a title, and a document load failure still fails the open. Closing and reopening can create a fresh writable session once storage works again.

The destructive retention rule remains a proposal, not an approved decision. `planSnapshotThinning` has no runtime caller and returns IDs only; `SnapshotCollection` still has no delete operation. Its allowlist permits thinning only `periodic`, preserving AI-accept, repair and future non-periodic reasons. The documentation and follow-up `worldcrafter-ey04` require a distinct reason for sync pre-overwrite snapshots and leave enabling thinning, its trigger and the storage panel pending Sumeet's approval. This respects the mission's authority boundary; the mission's approved-retention outcome remains pending that follow-up.

Validation: `bun test src/storage/retention.test.ts src/workspace src/generate src/app/environment.test.ts` passed all 114 tests (15,057 assertions). `bun run check` then passed typechecking, lint and all 1,169 tests across 55 files (175,775 assertions). Lint reports three warnings in untouched `scripts/story.ts`. `git diff --check master...200d3df48b04118a7f9ee5f422fed7bca7b11372` passed. The reported CLI timeout did not reproduce in this run; I did not independently repeat it on master. I also reproduced the bucket issue below with a direct call to the planner. No browser or real disk-exhaustion checks were performed; quota errors are simulated through the storage adapter. No fix-now findings.

## Finding 1: Count the protected newest periodic snapshot in its retention bucket
Recommendation: defer
Dropped by thread:delegated-task:command%3Amcp%3A6d73f777-f6d1-4f6c-b6f0-9f634b2c4463%3Adelegate-task%3A8cbaf9e1-b5f0-41ca-a880-ad8e43deaf11: Taken into worldcrafter-ey04's Done when: the planner is unused until thinning is enabled there, and the bug keeps an extra copy rather than losing one.

`app/src/storage/retention.ts:74-84` excludes the newest snapshot of each document before calculating each bucket's newest periodic snapshot. When the document has not been edited for at least 14 days, this keeps both its newest periodic snapshot and the next periodic snapshot in the same day or week, rather than the documented one per bucket. For example, at `now = 1000 * 86400000`, IDs 1 and 2 for one document, both periodic and aged 30.9 and 30.5 days respectively, are both in UTC day 969. The planner returns `keep: [1, 2], remove: []`; ID 2 should fill that day's slot while remaining protected as the document's newest snapshot.

Include protected newest periodic snapshots when choosing bucket representatives, and test a dormant document whose last two snapshots share a daily or weekly bucket. This can be corrected with `worldcrafter-ey04` before enabling thinning: the planner is currently unused, and this issue preserves an extra copy rather than losing recovery data.
