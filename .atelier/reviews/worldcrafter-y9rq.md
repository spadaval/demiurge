---
schema: atelier.review
schema_version: 1
id: worldcrafter-y9rq
title: finding on worldcrafter-79m3 @837a7378
target: worldcrafter-79m3
identity: round1-fix-reviewer
commit: 837a7378c215785fc0614c61a8079b01d014cde0
created_at: 2026-11-05T14:41:28.552749253Z
event:
  event: finding
  recommendation: defer
---

low: app/src/story/calendar.ts describeWhen (0u90). Covers o0s0 (with g0qy) and 0u90. A whole-year moment stored by an older file ([1103, 1103]) and a newly placed year span ([1103, 1104)) both print 'year 1103', but order differently: the author's own surprise (agathe-bound, old 1103, contradicts a vow at the new 1103 until re-placed). A writer reworking an old file sees two identical-looking positions and a contradiction with no visible cause. Rounds start from fresh files, so defer; if old files get reworked, print a stored whole-year moment as 'the start of 1103' (or note 'set-position again to make it the year') so the difference shows.
