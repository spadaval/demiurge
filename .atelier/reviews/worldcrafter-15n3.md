---
schema: atelier.review
schema_version: 1
id: worldcrafter-15n3
title: finding on worldcrafter-ql1d @a77639c1
target: worldcrafter-ql1d
identity: rubric-reviewer
commit: a77639c1685a42e56e67438a90a279635051a8df
created_at: 2026-11-05T07:39:09.448252776Z
event:
  event: finding
  recommendation: fix_now
---

low: app/scripts/judging/scenes.ts:95 concurrencyFor(gib) compares fractional MemAvailable GiB (> 5), but Sumeet's rule is four at once only if 'free -g shows more than 5 GB', and free -g prints whole GiB, rounded down. With 5.0-5.99 GiB available, free -g shows 5 and the rule says fewer than four, but the runner starts four judges on a host that also serves the live T3 server. Fix: compare Math.floor(gib) (> 5 for four, likewise for the 3 GiB step); update the concurrency test and README:124 to match.
