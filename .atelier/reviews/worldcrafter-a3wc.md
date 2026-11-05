---
schema: atelier.review
schema_version: 1
id: worldcrafter-a3wc
title: finding on worldcrafter-i2uz @ba1230c5
target: worldcrafter-i2uz
identity: code-reviewer
commit: ba1230c5302a25e35ec56fca128ca194088b0f1f
created_at: 2026-11-05T00:54:59.210305806Z
event:
  event: finding
  recommendation: fix_now
---

Part 2 (planning), medium: .atelier/issues/worldcrafter-hqgq.md:48 calls the verdict 'a standalone validation', but worldcrafter-iu6l is listed as a child of hqgq (hqgq.md:17-18), the shape o8b7's decision note reversed for i2uz (verdict as a standalone validation blocked by the increment, so reviewed code isn't held off master waiting on the panel). An orchestrator must guess which is meant; as a child, hqgq can't close until the panel and its procedure review finish. Fix: either make iu6l standalone (remove from children, blocked_by hqgq or ac45, advances z9qs) or reword hqgq Done when to say it is a child and why.
