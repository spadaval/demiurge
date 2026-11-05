---
schema: atelier.review
schema_version: 1
id: worldcrafter-ipia
title: finding on worldcrafter-lxmj @7ee3052d
target: worldcrafter-lxmj
identity: round-log-reviewer
commit: 7ee3052da62e74bf3dbe503ea8b84a5a437f961d
created_at: 2026-11-05T14:16:42.202397943Z
event:
  event: finding
  recommendation: fix_now
---

medium: .atelier/issues/worldcrafter-lsu3.md Done when (point rule) 'the two chosen turns are not adjacent to each other or to a likely random range, and at least one point falls in the last fifth of the arc if the rule allows' can't be applied as written. Every beat lies in one of the two random ranges (1..floor(n/2), floor(n/2)+1..n), so 'not adjacent to a likely random range' has no clear meaning. Random points are drawn after the chosen ones, so the orchestrator can't keep them non-adjacent by choice. 'Last fifth' and 'if the rule allows' leave open which point (chosen or random) and what counts (Round 3's beat 29 of 35 is already past 0.8n=28). Round 4's orchestrator would have to interpret it after seeing the outline, the thing the recorded-before-draw rule exists to prevent. Fix: state it exactly, e.g. 'chosen turns at least 3 beats apart; at least one chosen turn in beats ceil(0.8n)..n when the outline has a reveal, reversal or cost there; random draws as before' (or, if random points must avoid neighbours of chosen ones, say so and add an exclude option to choose-random, as te8t did for --range).
