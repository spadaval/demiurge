---
schema: atelier.review
schema_version: 1
id: worldcrafter-0aol
title: finding on worldcrafter-03rp @e9db738c
target: worldcrafter-03rp
identity: planning-reviewer
commit: e9db738ce72f889cc01ae6da80c82063ff299986
created_at: 2026-11-05T05:41:40.899354055Z
event:
  event: finding
  recommendation: defer
---

R7 low: worldcrafter-5xig misses .agents/skills/story-sketch/SKILL.md, whose description still triggers on 'sketch, develop, outline or rework a story' and steers an agent in this repo to the typed CLI, the exact path 03rp ended. 5xig's grep covers only AGENTS.md and PRODUCT.md. Fix: add to 5xig a line in SKILL.md (or its description) saying the typed tool is frozen and not the current approach, linking 03rp; keep craft.md, which efis reuses.
