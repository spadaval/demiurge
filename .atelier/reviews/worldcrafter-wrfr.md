---
schema: atelier.review
schema_version: 1
id: worldcrafter-wrfr
title: finding on worldcrafter-o8b7 @8ee08cdd
target: worldcrafter-o8b7
identity: code-reviewer
commit: 8ee08cddeab6d68787594388e15093aa0054ce81
created_at: 2026-11-04T21:54:16.089556299Z
event:
  event: finding
  recommendation: fix_now
---

medium: app/scripts/comparison/comparison.ts:163-227,312 the frozen directory is writable and never integrity-checked. Tool sessions get --add-dir <frozen> with bypassPermissions, and transcript.ts counts the frozen dir as allowed for Edit/Write too, so a tool session that edits frozen/story-sketch/craft.md, SKILL.md or story.js is not reported; every later run of both arms reads craft.md from the frozen dir (line 312), so one session could change the other arm's prompt. loadFrozen checks only the repo sources against the commit (and git diff misses untracked files, unlike freeze's git status --porcelain). Fix: at freeze chmod -R a-w and record sha256 of story.js, SKILL.md and craft.md in FROZEN.json; verify them in loadFrozen and after every step (fail the step on change); report Edit/Write outside the run dir; use git status --porcelain in loadFrozen.
