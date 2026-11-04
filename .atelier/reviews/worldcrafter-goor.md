---
schema: atelier.review
schema_version: 1
id: worldcrafter-goor
title: finding on worldcrafter-o8b7 @33cea9b2
target: worldcrafter-o8b7
identity: code-reviewer
commit: 33cea9b283a42c6f2a2936e52a59fa60d341a5d1
created_at: 2026-11-04T22:20:16.346282564Z
event:
  event: finding
  recommendation: no_action
---

low: app/scripts/comparison/sandbox.ts:60-117 PID 1 inside the sandbox is bwrap, and its argv shows the host layout. 'ps aux' under sandboxArgs shows --ro-bind <host frozen dir>/tool /opt/story-tool (in phase B that path is /home/supadava/projects/demiurge-comparison/frozen/tool), /home/supadava/.claude/.credentials.json and the whole prompt. 'cat /proc/1/cmdline' is reported, but 'ps aux' isn't. It brings back a little of worldcrafter-pe4t, for a session that goes looking. Optional fix: pass bwrap its arguments with --args <fd>, so the command line stays short, or report ps and pgrep in the transcript check.
