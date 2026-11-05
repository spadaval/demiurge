---
schema: atelier.review
schema_version: 1
id: worldcrafter-w4pl
title: approval on worldcrafter-qmq0 @91e5ea09
target: worldcrafter-qmq0
identity: round1-fix-reviewer
commit: 91e5ea096a1934d163ac56f7b0e82838d5369d7c
created_at: 2026-11-05T17:13:40.151269136Z
event:
  event: approval
---

Covers worldcrafter-7b2r only (5ce4e32, 91e5ea0). bun run check in a detached checkout at 91e5ea0: 1148 pass, 0 fail, exit 0. terminate.ts: on SIGTERM/SIGINT/SIGHUP each child timeout gets SIGTERM (it forwards to bwrap; bwrap's --die-with-parent and the pid namespace take the --new-session inner process with it), any still alive after 15 s gets SIGKILL to its group and itself; zombies count as gone; only the runner's own children are signalled, and they are the session timeouts at handler time (the runners' other children run under spawnSync, which blocks handlers until they return), so nothing unrelated is killed. My own run of the handler with a timeout'd child that ignores SIGTERM: SIGTERM, a second SIGTERM 2 s later and SIGINT 1 s after that recorded once, the runner exited 143 at 15 s, and nothing of the child's group was left. The manual run (/home/supadava/projects/demiurge-world/sigterm-run.txt) shows timeout, bwrap and inner bwrap before, runner exit 143, none after, record.json and run.json marked SIGTERM, temp dirs removed. Startup check: outline, scenes, so-far, judgeRound and runPart refuse while a 'bwrap --args 3 claude|grok' runs; it can't be met by the T3 server's or other claude processes (none run under bwrap --args 3). No change touches the credential mounts: ~/.claude/.credentials.json and ~/.grok/auth.json stay read-only binds. Two low defer findings (handler gaps between sessions and in panel probe; other users' sessions would count). No fix_now.
