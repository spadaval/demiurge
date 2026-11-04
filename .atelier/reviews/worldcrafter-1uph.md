---
schema: atelier.review
schema_version: 1
id: worldcrafter-1uph
title: finding on worldcrafter-o8b7 @3cf4e84e
target: worldcrafter-o8b7
identity: code-reviewer
commit: 3cf4e84e3ec59acd06d22e1c12ddaae416ef3ef3
created_at: 2026-11-04T20:56:44.234141178Z
event:
  event: finding
  recommendation: defer
---

low: app/src/story/gaps.ts:149,170 the 'referred to' halves of event_unreferenced and fact_unconnected are untested: mutating !refersToEvent(held, id) to true, or the held.some(...) fact check to false, leaves all 194 story tests passing. Code reads correct. Add planted cases: an event referred to only by a fact or open question, and a fact about nothing that another fact or candidate refers to, each giving no gap.
