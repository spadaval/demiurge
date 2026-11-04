---
schema: atelier.review
schema_version: 1
id: worldcrafter-ievd
title: finding on worldcrafter-o8b7 @8ee08cdd
target: worldcrafter-o8b7
identity: code-reviewer
commit: 8ee08cddeab6d68787594388e15093aa0054ce81
created_at: 2026-11-04T21:54:15.912940770Z
event:
  event: finding
  recommendation: fix_now
---

medium: app/scripts/comparison/transcript.ts:159-166 shellPaths drops a bare '/' (first segment empty) and glob-led paths, so the transcript check misses whole-disk reads. Probe through checkTranscript with run dir /tmp/story.abc: 'find / -name story.md', 'grep -rl Thukker /', 'ls /', 'cat /*/supadava/x' and 'cd / && cat home/supadava/projects/demiurge/AGENTS.md' are all unreported. Those reach this repo, ~/.claude and earlier runs' key/raw (the other arm's stories on the same premise), and the check is the stated backstop for isolation with no reruns. Fix: report a bare '/' and any path whose first segment has glob characters (false positives are fine, a reader judges), and add these cases to comparison.test.ts.
