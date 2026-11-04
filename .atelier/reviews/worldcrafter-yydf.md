---
schema: atelier.review
schema_version: 1
id: worldcrafter-yydf
title: finding on worldcrafter-o8b7 @3cf4e84e
target: worldcrafter-o8b7
identity: code-reviewer
commit: 3cf4e84e3ec59acd06d22e1c12ddaae416ef3ef3
created_at: 2026-11-04T20:56:44.153427097Z
event:
  event: finding
  recommendation: fix_now
---

medium: app/src/story/touches.ts:304 a candidate's further applies only directLinks of each touched record, never the carry rules, so a candidate reaches less than its touched record does on its own. Probe: candidate touching only drive shut (actor ardelia in scene 2.1, 4.2 pressures shut) gives further {actor, event seal, scene 4.2} and misses 2.1, the walkthrough's key miss; candidate touching only event seal gives further {drive shut} and misses 4.2, which whatThisTouches(seal) reaches. Done when says 'one step on from each as above', and 'as above' names the carry rules; Fluidity says a candidate is weighed against the story before committing, and p4zf/04z5 use touches for exactly that. Fix: in the candidate case also add carriedLinks(story, touched) for each touched record (dedupe already happens), and add a test that a candidate touching drive shut in the Ninefold fixture reaches 2.1 and one touching seal reaches 4.2.
