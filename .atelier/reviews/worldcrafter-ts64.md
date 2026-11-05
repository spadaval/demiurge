---
schema: atelier.review
schema_version: 1
id: worldcrafter-ts64
title: finding on worldcrafter-ql1d @108f50b0
target: worldcrafter-ql1d
identity: rubric-reviewer
commit: 108f50b0c5a759fd02fa9443d123fca3b6ffe209
created_at: 2026-11-05T08:21:20.895967478Z
event:
  event: finding
  recommendation: defer
---

low: app/scripts/round/round.ts:445 The vocabulary check's ref pattern hard-codes the record kinds (actor, drive, fact, reader-question, event, scene, open-question, candidate, version, knowledge, constraint). It matches today's CLI output (checked against gaps/render/touches on the smoke story), but a kind added by a later Round 0 or between-round fix (e.g. objects) would slip through unnoticed. Fix: build the pattern from REF_KINDS in app/src/story/story.ts (kebab-cased, plus candidate), with a test that every RefKind is covered.
