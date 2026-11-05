---
schema: atelier.review
schema_version: 1
id: worldcrafter-3kqg
title: finding on worldcrafter-i2uz @ba1230c5
target: worldcrafter-i2uz
identity: code-reviewer
commit: ba1230c5302a25e35ec56fca128ca194088b0f1f
created_at: 2026-11-05T00:54:59.475357359Z
event:
  event: finding
  recommendation: fix_now
---

Part 2 (planning), medium: .atelier/issues/worldcrafter-qgom.md:29 matches an event only 'by its year as written in the story', but the goal's own example (qgom.md:25, 'twenty years ago') and the judges' cases ('three years dead', 'spring', 'months', 'sixteen years'; opus-part2.md s7.3, fable-part2.md s7.2) are relative durations a year match cannot find. The Done when tests ('a stale year') can pass with a literal-year fixture while missing the motivating failure. Fix: either test a relative mention found some other way (e.g. Fable's suggestion that summaries refer to an event's position), or narrow the goal and put relative durations in Unknowns so the second verdict isn't read as testing them.
