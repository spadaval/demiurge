---
schema: atelier.review
schema_version: 1
id: worldcrafter-otbw
title: finding on worldcrafter-3fqq @9afff1fd
target: worldcrafter-3fqq
identity: round1-fix-reviewer
commit: 9afff1fd99391e25a22b258c653c069bba59aa32
created_at: 2026-11-05T09:57:19.161019027Z
event:
  event: finding
  recommendation: fix_now
---

medium: app/src/story/calendar.ts:253 (used by app/src/story/contradictions.ts:46 timelineProblemMessage) Covers b0la only (397bde4/75a99e1/9afff1f; w2hx, te8t, 1h0r follow). describeYears' new fallback rounds to one decimal of the largest unit, so an inconsistent_duration message can hide the very discrepancy it reports. Repro at 75a99e1: set-position wreck 1954-01-01; set-position letter 1955-01-15; constrain c5 wreck before letter --gap 1y --tolerance 1d prints and contradictions lists 'constraint c5 puts 1 year give or take 1 day between wreck and letter, but their positions put 1 year to 1 year between them' (actual gap 1 year 14 days). Any year-scale gap off by under ~18 days (or ~6 months on a 10-year gap) reads as consistent, and min/max that differ collapse ('1.1 years to 1.1 years'). Before b0la the raw floats were noisy but decodable; now a kept contradiction is unreadable, which is the Round 1 failure mode (writer can't act on the warning). Fix: in timelineProblemMessage say stated, tolerance and between at a resolution fine enough to separate them, e.g. say all amounts in the tolerance's unit or a smaller one when the rounded texts would be equal (379 days vs 365 give or take 1 day), and print one value when the rounded min and max match; add a test with this repro.
