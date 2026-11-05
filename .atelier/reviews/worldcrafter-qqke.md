---
schema: atelier.review
schema_version: 1
id: worldcrafter-qqke
title: finding on worldcrafter-79m3 @837a7378
target: worldcrafter-79m3
identity: round1-fix-reviewer
commit: 837a7378c215785fc0614c61a8079b01d014cde0
created_at: 2026-11-05T14:41:28.457212Z
event:
  event: finding
  recommendation: fix_now
---

medium: app/src/story/calendar.ts parseWhen/--end handling and describeWhen (0u90, a0269c5). Covers o0s0 (with g0qy) and 0u90. With a year now a span, '--end <year>' still stops at that year's start while '--end <date>' runs to the date's end, and the output says the range inclusively, so the natural reading gives a false contradiction. Repro: set-position war 1950 --end 1960; set-position battle 1960; constrain c1 battle during war prints 'Events battle, war cannot be ordered ...', while show event:war says 'year 1950 to 1960'. The same with days works: d1 1954-10-12 --end 1954-10-14, d2 1954-10-14, constrain d2 during d1 is fine and shows '12 to 14 October 1954'. Before 0u90 the battle was a moment at 1960.0 and fitted; now it is the year 1960 and doesn't, so this is new with the change, and it is the reading's issue 5 (a year treated as a point) coming back at range ends. --help documents '1950 --end 1960 is ten years', but the output contradicts it. Fix: make --end <year> run to that year's end (1950 --end 1960 = [1950, 1961)), as a date end does, and print a whole-year range by its last year ('year 1950 to 1960' for [1950, 1961)). That reading is also faithful for old files: an old [1950, 1960] covers 1950 to 1959, so its display becoming 'year 1950 to 1959' states the same interval more accurately, and no stored position or ordering changes. Update the help and the test. g0qy itself is fixed: my repro (Mara takes part in the wreck and is the viewpoint of the scene showing it, but believes version:fog) now marks 'doesn't know, believes version:fog', and an --until on the belief clears it.
