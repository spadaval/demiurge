---
schema: atelier.review
schema_version: 1
id: worldcrafter-x2pm
title: finding on worldcrafter-i2uz @ba1230c5
target: worldcrafter-i2uz
identity: code-reviewer
commit: ba1230c5302a25e35ec56fca128ca194088b0f1f
created_at: 2026-11-05T00:54:59.665247126Z
event:
  event: finding
  recommendation: defer
---

Part 2 (planning), low: named changes the plan leaves out without saying so. Fable (fable-part2.md s7.5) says the contradictions check fired spuriously in all four runs on same-year events with an ordering constraint, and Sonnet (s7.4) that fractional-year hacks caused spurious contradictions; all three ask to flag constraints whose gap went to zero after a move. xgxp.md:27 hides satisfied constraints, which also hides that case, and h1be.md:30 ('an effect positioned before its cause') doesn't say whether equal positions report, so it may reproduce the same noise. Types (plant/payoff, echoes) and finer time are lower priority for all three. Fix: a decision note on hqgq listing which named changes are deferred and why, and say in h1be that equal years don't report.
