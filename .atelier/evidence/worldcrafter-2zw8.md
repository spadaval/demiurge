---
created_at: "2026-11-04T22:17:30.366052844+00:00"
id: "worldcrafter-2zw8"
evidence_type: "validation"
commit: "27848d36c5abd109a7e366228c63dbcc8a1be25e"
result: "pass"
captured_at: "2026-11-04T22:17:30.366015444+00:00"
path: "/home/supadava/projects/demiurge-comparison/smoke/bwrap-tool"
agent_identity: "implementer (phase A, sandboxed smoke)"
target:
  kind: "issue"
  id: "worldcrafter-04z5"
  role: "validates"
relationships:
  blocks: []
  children: []
  attachments:
  - kind: "issue"
    id: "worldcrafter-04z5"
    role: "validates"
  relates: []
schema: "atelier.evidence"
schema_version: 2
status: "recorded"
title: "Sandboxed tool-arm smoke run, Thukker (tuned-on, not part of the comparison). Fresh scratch freeze at 9b9e2b7 in the session scratchpad (removed afterwards); run b72253c7 under bwrap into smoke/bwrap-tool. All 4 steps exit 0 on claude-opus-5-5 (353/137/115/47 s; $1.30/0.63/0.54/0.21), no skills, no MCP, 0 hook events; session saw the tool at /opt/story-tool via --add-dir and STORY_CLI. verifyFrozen ran after every step without throwing, and the tool's sha256s matched FROZEN.json after the run; tool/ still read-only. Transcript check ran on all steps: one report in step 1, a false positive ('~1,500' in a heredoc read as a home path), fixed in 27848d3 with a test; a recheck reports nothing outside in any step. Packet written with the harness's packetFor (exported in 9b9e2b7, since packets needs one run of each arm): sections 1-4 in order, 6,146 words, both rework diffs re-apply to reproduce the after-text, no tool or command names. An earlier launch (1012a451) was stopped by me seconds into step 1 because the launching shell had a 10-minute limit; kept in smoke/bwrap-tool-aborted with a note. bun run check 781 pass after 27848d3."
updated_at: "2026-11-04T22:17:30.366297290+00:00"
---

Sandboxed tool-arm smoke run, Thukker (tuned-on, not part of the comparison). Fresh scratch freeze at 9b9e2b7 in the session scratchpad (removed afterwards); run b72253c7 under bwrap into smoke/bwrap-tool. All 4 steps exit 0 on claude-opus-5-5 (353/137/115/47 s; $1.30/0.63/0.54/0.21), no skills, no MCP, 0 hook events; session saw the tool at /opt/story-tool via --add-dir and STORY_CLI. verifyFrozen ran after every step without throwing, and the tool's sha256s matched FROZEN.json after the run; tool/ still read-only. Transcript check ran on all steps: one report in step 1, a false positive ('~1,500' in a heredoc read as a home path), fixed in 27848d3 with a test; a recheck reports nothing outside in any step. Packet written with the harness's packetFor (exported in 9b9e2b7, since packets needs one run of each arm): sections 1-4 in order, 6,146 words, both rework diffs re-apply to reproduce the after-text, no tool or command names. An earlier launch (1012a451) was stopped by me seconds into step 1 because the launching shell had a 10-minute limit; kept in smoke/bwrap-tool-aborted with a note. bun run check 781 pass after 27848d3.
