---
schema: atelier.review
schema_version: 1
id: worldcrafter-5b6m
title: finding on worldcrafter-3fqq @456a2561
target: worldcrafter-3fqq
identity: round1-fix-reviewer
commit: 456a2561f5981ddd1b681559c219e4dfd3f2f9d4
created_at: 2026-11-05T10:17:25.417674162Z
event:
  event: finding
  recommendation: defer
---

low: app/src/story/calendar.ts describeMismatch (otbw fix 1ac11f6; covers b0la's otbw fix and w2hx). The fix is correct: every mismatch now stays visible (1y give or take 1 day vs 379 days now reads '365.2 days give or take 1 day ... 379 days'). The readability cost falls on the common case, because the unit is capped at the tolerance's unit and the default tolerance is half the gap's unit, so the unit drops one step below what the writer typed: --gap 3d against 5 days prints '72 hours give or take 12 hours ... 120 hours'; --gap 1y against 3 years prints '12 months give or take 6 months ... 36 months'; mdk6's case prints '14 days give or take 3.5 days ... -0.1 days to 0.9 days' (was '-3 hours to 21 hours'). All are still readable and correct, so defer. If a round shows writers misreading these, try the amount's own unit first (say it whole: '3 days give or take 12 hours ... 5 days') and drop to a finer unit only for a value that would otherwise round to the stated range.
