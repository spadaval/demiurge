---
schema: atelier.review
schema_version: 1
id: worldcrafter-ii8m
title: finding on worldcrafter-r26d @3fd9f95e
target: worldcrafter-r26d
identity: round0-reviewer
commit: 3fd9f95eb994896342131860f80ec11f8027bf56
created_at: 2026-11-05T07:00:16.893338913Z
event:
  event: finding
  recommendation: defer
---

low: app/src/story/story.ts:733 when a question is re-answered, a scene that reveals the old (now superseded) candidate keeps that link silently: the state drops to 'decided, not revealed yet' and render shows the scene revealing the old answer next to a different Decided answer, with no gap, contradiction or notice. Repro: answer who a; set-scene-links s2 reveals candidate:who/a; answer-open-question who k. The scene's prose now tells the reader an answer the bible has replaced. Suggested follow-up in s2mz (change tracing): after answering, list scenes that reveal a superseded candidate.
