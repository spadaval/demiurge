---
schema: atelier.review
schema_version: 1
id: worldcrafter-24pb
title: finding on worldcrafter-qmq0 @91e5ea09
target: worldcrafter-qmq0
identity: round1-fix-reviewer
commit: 91e5ea096a1934d163ac56f7b0e82838d5369d7c
created_at: 2026-11-05T17:13:40.080697974Z
event:
  event: finding
  recommendation: defer
---

low: app/scripts/judging/panel.ts probe() and app/scripts/judging/terminate.ts sandboxedSessions (7b2r). Covers 7b2r only. (1) panel probe() starts one sandboxed session per judge in parallel with neither onTermination nor refuseIfSessionsRunning, so a signal during it leaves those sessions running until their 300 s timeout (credentialed, trivial prompt). Wrap it like runPart. (2) sandboxedSessions counts every user's processes from /proc, so another account running this harness on the host would block a run; filter on the process's uid (/proc/<pid>/status Uid) being this user's. It also lists each session twice (the timeout and bwrap), cosmetic. Checked and fine: the T3 server's and this agent's own claude processes don't match (no 'bwrap --args 3'); no bwrap process runs on the host now and sandboxedSessions returns []; a command line that merely mentions bwrap in one argv string doesn't match.
