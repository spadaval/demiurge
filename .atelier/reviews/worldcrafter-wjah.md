---
schema: atelier.review
schema_version: 1
id: worldcrafter-wjah
title: finding on worldcrafter-6m2v @14fac640
target: worldcrafter-6m2v
identity: round0-reviewer
commit: 14fac640fdd412ead073af5d1ba064dc40dada65
created_at: 2026-11-05T07:37:47.058713623Z
event:
  event: finding
  recommendation: fix_now
---

medium: app/scripts/story.ts (remove-event, remove-actor, remove-fact, remove-candidate specs) --help is no longer accurate (Done when, j8lb). withoutRefs (app/src/story/commands.ts:1286) now deletes whole version and knowledge records, cascading: remove-event wreck deleted both versions of it with their text, mara-fog (belief in a version) and mk (knowledge of that belief), and printed only 'Saved.'. But help still says 'Remove an event, its position and constraints, and links to it', 'Remove an actor. Their drives stay, held by nobody' (their knowledge is deleted), and 'Remove a fact' / 'Remove a candidate answer' (knowledge of them is deleted). A writer reworking the bible loses true story without being told, which runs against the advisory, never-delete direction. Fix: say in each remove summary that its versions and knowledge go too. Better still, cheaply, print the version and knowledge records that went with it.
