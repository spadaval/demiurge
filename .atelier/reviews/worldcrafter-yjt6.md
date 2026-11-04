---
schema: atelier.review
schema_version: 1
id: worldcrafter-yjt6
title: finding on worldcrafter-i2uz @1fdc802e
target: worldcrafter-i2uz
identity: code-reviewer
commit: 1fdc802e35dfd5e475124aaff1e69784169997fb
created_at: 2026-11-04T23:59:26.531333010Z
event:
  event: finding
  recommendation: defer
---

low: app/scripts/judging/panel.ts:512 and :600 If runJudge throws (makeRunDir on a missing key file, unreadable transcript, a malformed fallback line in modelProblems) or the runner is killed, the slot is left with STATUS 'running' or none, so both a rerun and --replacement are refused and the run dir under /tmp is left behind; recovery means hand-editing STATUS. Also the failed dir is renamed before ensureToken, so a token failure leaves an empty slot whose next run is recorded with replacement=false. Suggested: wrap the post-spawn work so any exception writes 'failed' with the error, and rename after ensureToken.
