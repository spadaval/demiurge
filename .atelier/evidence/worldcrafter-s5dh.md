---
created_at: "2026-11-05T00:05:57.142949589+00:00"
id: "worldcrafter-s5dh"
evidence_type: "validation"
commit: "1ccb50b373c0e1e37cd567bf6dcb8057bef82490"
result: "pass"
captured_at: "2026-11-05T00:05:57.142843140+00:00"
path: "/home/supadava/projects/demiurge-comparison/smoke/judging-panel/smoke-root-2"
agent_identity: "implementer (judging panel runner, review fixes)"
target:
  kind: "issue"
  id: "worldcrafter-i2uz"
  role: "validates"
relationships:
  blocks: []
  children: []
  attachments:
  - kind: "issue"
    id: "worldcrafter-i2uz"
    role: "validates"
  relates: []
schema: "atelier.evidence"
schema_version: 2
status: "recorded"
title: "Review fixes for the judging panel runner (dfbbec4, 1ccb50b; findings worldcrafter-8vrv, jok5, yjt6, slwr), smoke-tested on the smoke material only (smoke/judging-panel/smoke-root-2), not the real packets or key. 8vrv: Part 1's rubric.md is now the pinned rubric from \"## What you're judging\" up to, not including, \"## Part 2\" (lines 7-50 at 314b20ad); the cut also drops the title line, which reads 'Rubric: tool against plain notes', and the preamble, which names docs/strategies/structure-first.md, since text before '## Part 2' alone would still name both arms. run.json records the copy's sha256 (63da2a3e...) and the cut; the live Part 1 run dir's rubric.md starts at that heading, has no '## Part 2', and contains none of tool, notes, held back, tuned, markdown (unit test on the pinned rubric too, and on the Part 1 prompt). Part 2's rubric.md is byte-identical to the full pinned rubric (sha256 d6b77152..., cut 'the whole file'). jok5: RECORDED is JSON {evidenceId, part1Sha256}; part2 refused live after part1.md was edited post-recording ('changed since it was recorded as smoke-0002'), and ran once restored. yjt6: a runner exception (unit test: a missing key.md) writes STATUS failed with the error and leaves no /tmp/judge.*; live SIGTERM 15s into part1 sonnet: runner exit 143, STATUS 'failed - the runner was interrupted by SIGTERM', run dir removed, and after 1ccb50b no timeout/bwrap/claude session left running (before it, the session kept running and was killed by hand; that run is kept as part1-sigterm-before-kill-fix). The failed run is moved aside only after ensureToken. --replacement then moved it to part1-failed-1 and ran part1 fresh: exit 0, 49s, STATUS ok, models [claude-sonnet-5-5], 4 tool uses, outside [], unparsed 0. slwr: unparsed transcript lines are a STATUS problem (unit test). part2 sonnet: exit 0, 18s, STATUS ok, models [claude-sonnet-5-5], outside [], unparsed 0, my-part1.md sha256 b266ac4e... identical to part1.md and RECORDED, last line 'VERDICT: change'. New unit tests for the post-session checks: input changed or removed, report missing or empty, no verdict line, non-zero exit, timeout, unparsed lines. Content not judged. bun run check: 849 pass, 0 fail. Not exercised live: part1/part2 all (concurrency), ensureToken's refresh wait, SIGKILL of the runner (leaves STATUS 'running')."
updated_at: "2026-11-05T00:05:57.143812510+00:00"
---

Review fixes for the judging panel runner (dfbbec4, 1ccb50b; findings worldcrafter-8vrv, jok5, yjt6, slwr), smoke-tested on the smoke material only (smoke/judging-panel/smoke-root-2), not the real packets or key. 8vrv: Part 1's rubric.md is now the pinned rubric from "## What you're judging" up to, not including, "## Part 2" (lines 7-50 at 314b20ad); the cut also drops the title line, which reads 'Rubric: tool against plain notes', and the preamble, which names docs/strategies/structure-first.md, since text before '## Part 2' alone would still name both arms. run.json records the copy's sha256 (63da2a3e...) and the cut; the live Part 1 run dir's rubric.md starts at that heading, has no '## Part 2', and contains none of tool, notes, held back, tuned, markdown (unit test on the pinned rubric too, and on the Part 1 prompt). Part 2's rubric.md is byte-identical to the full pinned rubric (sha256 d6b77152..., cut 'the whole file'). jok5: RECORDED is JSON {evidenceId, part1Sha256}; part2 refused live after part1.md was edited post-recording ('changed since it was recorded as smoke-0002'), and ran once restored. yjt6: a runner exception (unit test: a missing key.md) writes STATUS failed with the error and leaves no /tmp/judge.*; live SIGTERM 15s into part1 sonnet: runner exit 143, STATUS 'failed - the runner was interrupted by SIGTERM', run dir removed, and after 1ccb50b no timeout/bwrap/claude session left running (before it, the session kept running and was killed by hand; that run is kept as part1-sigterm-before-kill-fix). The failed run is moved aside only after ensureToken. --replacement then moved it to part1-failed-1 and ran part1 fresh: exit 0, 49s, STATUS ok, models [claude-sonnet-5-5], 4 tool uses, outside [], unparsed 0. slwr: unparsed transcript lines are a STATUS problem (unit test). part2 sonnet: exit 0, 18s, STATUS ok, models [claude-sonnet-5-5], outside [], unparsed 0, my-part1.md sha256 b266ac4e... identical to part1.md and RECORDED, last line 'VERDICT: change'. New unit tests for the post-session checks: input changed or removed, report missing or empty, no verdict line, non-zero exit, timeout, unparsed lines. Content not judged. bun run check: 849 pass, 0 fail. Not exercised live: part1/part2 all (concurrency), ensureToken's refresh wait, SIGKILL of the runner (leaves STATUS 'running').
