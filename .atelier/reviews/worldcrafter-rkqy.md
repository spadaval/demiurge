---
schema: atelier.review
schema_version: 1
id: worldcrafter-rkqy
title: finding on worldcrafter-ql1d @3597c62e
target: worldcrafter-ql1d
identity: rubric-reviewer
commit: 3597c62e68ccfc4e2a67159e3cb7d8a173e97256
created_at: 2026-11-05T08:28:30.580448905Z
event:
  event: finding
  recommendation: defer
---

low: app/scripts/round/round.ts:103 sandboxedGitLog collects the sandboxed git's stdout with Bun.spawnSync and no size cap. A writer-planted gpg.program or textconv runs in the sandbox, as intended, and its output flows into git log's stdout. Probed: gpg.program's output appears in git-log.txt, so one that does 'cat /dev/zero' would stream into host memory for the full 120 s timeout, on the host that serves the live T3 server. Only a hostile writer can do this, and nothing escapes, so it is resource exhaustion only. Fix: bound the output (spawn with a pipe and stop reading after a few MB, or pipe through 'head -c' inside the sandbox) and mark git-log.txt truncated.
