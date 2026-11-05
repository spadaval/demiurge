---
schema: atelier.review
schema_version: 1
id: worldcrafter-ufe6
title: approval on worldcrafter-hqgq @2fb7ea42
target: worldcrafter-hqgq
identity: code-reviewer
commit: 2fb7ea42eddf4e4387fdfdf348107831e52afd7e
created_at: 2026-11-05T02:00:00.134731162Z
event:
  event: approval
---

Re-review 765f93c1..2fb7ea42. pzpi fixed (926d2c0): whatMentions ranks direct, then holder, then near; Mara repro (12 holder scenes, fact stating old want) now prints the fact first, then 4 holder lines, '...and 8 more (13 in all)'; update-actor --kind no-op prints nothing; mutant dropping the match ranking fails 5 tests. mac4 fixed (660ef4e): Primitives sentence matches deliberateGaps (top-level list, ref or whole story, reason). bun run check: first run 956 pass 1 fail under host load ~15 (failing test name not captured), rerun 957 pass 0 fail. Earlier fixes x7z7, 9cto, 9ocs verified at 765f93c1. No fix_now outstanding.
