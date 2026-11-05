---
schema: atelier.review
schema_version: 1
id: worldcrafter-g0qj
title: finding on worldcrafter-i2uz @5443d5b6
target: worldcrafter-i2uz
identity: code-reviewer
commit: 5443d5b689eff4a7657e23c585256c1d8e6c6ee3
created_at: 2026-11-05T00:47:09.678801802Z
event:
  event: finding
  recommendation: defer
---

low: app/scripts/judging/panel.ts verdict() always reads judging/<judge>/part2, but decision note d2401a0 counts sonnet/part2-failed-1, not the replacement in sonnet/part2. Running 'panel.ts verdict' now would count sonnet's drop and rewrite judging/verdict.md as drop, contradicting the recorded decision (change). Suggested: let verdict take which run counts per judge (e.g. --count sonnet=part2-failed-1, recorded in verdict.md), or at least warn when a <part>-failed-<n> beside part2 is ok after recheck. Until then, don't rerun 'verdict'; amend verdict.md by hand per the decision.
