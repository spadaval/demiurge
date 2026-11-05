---
schema: atelier.review
schema_version: 1
id: worldcrafter-s8hy
title: finding on worldcrafter-qmq0 @91e5ea09
target: worldcrafter-qmq0
identity: round1-fix-reviewer
commit: 91e5ea096a1934d163ac56f7b0e82838d5369d7c
created_at: 2026-11-05T17:13:40.010461356Z
event:
  event: finding
  recommendation: defer
---

low: app/scripts/round/round.ts runSession/soFar (7b2r, 5ce4e32). Covers 7b2r only. The round runner's handler is installed only around each spawnSandboxed call, so a signal between sessions takes the default action. No sandboxed session is running then, so nothing credentialed is orphaned, but: (1) between a story so far's first reply and its revise, the per-point temp home (session transcript with the outline, and the empty credentials mount point) and run dir are left in the temp dir, since soFar's finally never runs; (2) ensureToken runs before the handler is installed, so a SIGTERM to the runner during a host token refresh leaves the host 'claude -p' one-liner to finish on its own (not sandboxed, brief). Fix when convenient: install onTermination once per phase (outline, scenes, so-far loop) with the cleanup list, rather than per session; the stop logic already handles 'no children'.
