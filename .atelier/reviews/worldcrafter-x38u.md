---
schema: atelier.review
schema_version: 1
id: worldcrafter-x38u
title: finding on worldcrafter-hqgq @152f480b
target: worldcrafter-hqgq
identity: code-reviewer
commit: 152f480bb097d11aa2828b8f52232b961e14fe02
created_at: 2026-11-05T01:09:43.737235843Z
event:
  event: finding
  recommendation: fix_now
---

medium: app/src/story/render.ts:340 satisfiedBy treats any two positions of equal span length as 'equal precision' and compares their starts, so multi-unit spans hide a gap the positions don't settle. Repro (CLI): war 1200 --end 1210, rebuilding 1220 --end 1230, constrain rebuilding after war --gap 20: render drops it, though the engine's own gap (end of earlier to start of later, timeline.ts:86) is 10 to 30; --gap 10, the reading that matches the engine's definition, is printed. Breaks Done when 'one that positions don't settle still is' and the decision note's 'two points, or two whole years'; a judge reading the render loses which of 10 or 20 years the writer meant. Fix: apply the start-difference rule only when both spans are at most one unit long (points or single years), else require every allowed gap to fit; add a test with two equal multi-year spans. Mutation 'return true' for this equality check leaves all render tests passing, so the branch is currently untested.
