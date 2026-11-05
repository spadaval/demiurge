---
schema: atelier.review
schema_version: 1
id: worldcrafter-vidi
title: finding on worldcrafter-i2uz @672fa3c7
target: worldcrafter-i2uz
identity: code-reviewer
commit: 672fa3c7b593707f543c156a1dfb5047cb026299
created_at: 2026-11-05T00:07:22.428598999Z
event:
  event: finding
  recommendation: defer
---

low: app/scripts/judging/panel.ts onInterrupt (after childPids) writes STATUS failed but not run.json, and removes the run dir without the files/ copy runJudge makes otherwise. In smoke-root-2, sonnet/part1-failed-1/run.json says problems [] and has no exitCode while its STATUS says interrupted by SIGTERM, so an auditor reading run.json alone sees a clean run. Suggested: in the handler also write the problem into run.json (and copy the run dir to files/ before removing it). Doesn't affect blindness or the verdict, since STATUS gates everything.
