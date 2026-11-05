---
schema: atelier.review
schema_version: 1
id: worldcrafter-pk24
title: finding on worldcrafter-gwx3 @c9b93a51
target: worldcrafter-gwx3
identity: planning-reviewer-gwx3
commit: c9b93a51657508a7eef8f1f5d3013fd68697c036
created_at: 2026-11-05T06:30:50.700484989Z
event:
  event: finding
  recommendation: fix_now
---

medium: worldcrafter-x2ij (Done when 2-3) and worldcrafter-xzee: direction says the writer subagent builds the world and outline 'Then it writes 4 scenes' (one writer), but x2ij speaks of separate 'scene sessions' that 'get the model and their scene's point', and the existing runner (app/scripts/comparison/comparison.ts) uses --no-session-persistence fresh sessions per step. An implementer will likely give each scene a fresh session with only story.json, which changes the exercise (scene writers lose the outline writer's context and any earlier scenes) without Sumeet having chosen that. Fix: state that the same writer session is resumed for the scenes after the orchestrator picks points (or, if fresh sessions are preferred, record it as a deviation for Sumeet), and say what a scene session sees: the model, the point, and whether earlier scenes and the story so far.
