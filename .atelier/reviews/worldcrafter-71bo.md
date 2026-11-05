---
schema: atelier.review
schema_version: 1
id: worldcrafter-71bo
title: finding on worldcrafter-5pks @48598a49
target: worldcrafter-5pks
identity: round-log-reviewer
commit: 48598a49e94108247fa93fb81b24d7e4ecaf555b
created_at: 2026-11-05T11:35:59.441485985Z
event:
  event: finding
  recommendation: fix_now
---

medium: .atelier/issues/worldcrafter-zevg.md:29 zevg changes the judge prompt (app/scripts/judging/scenes.ts) to demand verbatim, commentary-free evidence. That reverses Round 1's recorded choice (round-1.md: 'Sonnet's evidence format is left as is; quote checks are reported, not enforced') and changes the judging instrument between rounds, yet neither round-2.md:140-148 nor ulpg/zevg gives a reason, and nothing tells the Round 3 log to report it. A change in Sonnet's behaviour (it was 25 of 26 failed quotes) could then shift its scores and be read as a tool effect. Fix: record why (e.g. quotes unusable as evidence) in zevg and the log's Fixes section, and add to lxmj's Done when that the Round 3 log notes the judge-prompt change when comparing scores; or drop that half of zevg.
