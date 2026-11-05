---
schema: atelier.review
schema_version: 1
id: worldcrafter-ardm
title: finding on worldcrafter-gwx3 @c9b93a51
target: worldcrafter-gwx3
identity: planning-reviewer-gwx3
commit: c9b93a51657508a7eef8f1f5d3013fd68697c036
created_at: 2026-11-05T06:30:50.987324442Z
event:
  event: finding
  recommendation: fix_now
---

low: worldcrafter-w716 Done when 2: the Grok fallback through T3 delegate_task says only 'with the same inputs'. A delegated task runs in a T3 project/worktree that can read the repo (AGENTS.md, docs naming Demiurge and the mission), breaking 'judges aren't told about Demiurge' and the transcript check. Fix: require the fallback to run in a directory holding only the scene, story so far and judge-facing rubric, and to save and check its transcript (or record in the round log what could not be checked).
