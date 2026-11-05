---
schema: atelier.review
schema_version: 1
id: worldcrafter-f9l3
title: finding on worldcrafter-ql1d @108f50b0
target: worldcrafter-ql1d
identity: rubric-reviewer
commit: 108f50b0c5a759fd02fa9443d123fca3b6ffe209
created_at: 2026-11-05T08:21:20.813181582Z
event:
  event: finding
  recommendation: fix_now
---

medium: app/scripts/round/round.ts:775 snapshot() runs 'git log --stat --format=%h %ad %s --date=iso' on the host, unsandboxed, in <round>/work, a repo the writer fully controls from inside the sandbox (bound read-write at /story, including .git/config). Repo config can make that exact command run any program on the host: reproduced in a scratch repo, where 'git config log.showSignature true' and 'gpg.program <script>' plus a commit with a gpgsig header made the same git log run the script. A writer session with Bash and bypassPermissions could plant this (by mistake or not), and it would then run as Sumeet with ~/.claude/.credentials.json readable and writable, breaking the hard constraint and the whole sandbox boundary. It runs after every outline and scene session. Fix: produce the git log inside the sandbox (a bwrap like writerSandbox, without claude, running git in /story), or don't run git on the host in that repo at all; at minimum pass -c log.showSignature=false -c gpg.program=false -c core.fsmonitor=false --no-show-signature --no-textconv --no-ext-diff, though that is a denylist. The same pattern is at app/scripts/comparison/comparison.ts:522 (the ended harness; fix it or note it so it isn't reused).
