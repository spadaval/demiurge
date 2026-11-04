---
schema: atelier.review
schema_version: 1
id: worldcrafter-4zks
title: finding on worldcrafter-o8b7 @8ee08cdd
target: worldcrafter-o8b7
identity: code-reviewer
commit: 8ee08cddeab6d68787594388e15093aa0054ce81
created_at: 2026-11-04T21:54:16.028630628Z
event:
  event: finding
  recommendation: fix_now
---

medium: app/scripts/comparison/comparison.ts:49 TOOLS allows WebFetch and WebSearch for both arms, but 04z5 says each session sees only the prompt, craft.md, the skill and CLI path for tool runs, and what the run has saved. The repo is public (gh: spadaval/demiurge, PUBLIC), so any session can fetch the skill, craft.md, prompts.ts and the tracker records that describe the comparison, the arms and the held-back premise; the notes arm could fetch the tool's skill. Web use is reported but doesn't fail the step. Lore accuracy isn't graded (04z5 Context), so nothing is lost by removing them: drop WebFetch and WebSearch from TOOLS and update README.md.
