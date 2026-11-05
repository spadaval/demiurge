---
schema: atelier.review
schema_version: 1
id: worldcrafter-p33d
title: finding on worldcrafter-ql1d @936e93ec
target: worldcrafter-ql1d
identity: rubric-reviewer
commit: 936e93ec82fa0ae4c689c646938215f7333b0767
created_at: 2026-11-05T07:03:15.805579074Z
event:
  event: finding
  recommendation: fix_now
---

low: docs/verdicts/world-demo-rubric.md:156 'has other keys' is ambiguous for w716: it does not clearly say a block missing a key, or with extra fields inside an entry (e.g. evidence on overall), or a fenced vs unfenced block, fails. Fix: say the block must have exactly the template's keys at both levels, every score a whole number 1-10 and every string non-empty; fenced or not both accepted.
