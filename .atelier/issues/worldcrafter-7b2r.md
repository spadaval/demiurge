---
created_at: "2026-11-05T17:02:28.300091597+00:00"
id: "worldcrafter-7b2r"
issue_type: "task"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "review"
    id: "worldcrafter-gbh1"
    type: "discovered_from"
schema: "atelier.issue"
schema_version: 2
status: "in_progress"
title: "Round runner: a killed runner stops its sandboxed session"
updated_at: "2026-11-05T17:03:07.143182342+00:00"
---

## Goal

When the round or panel runner is terminated (SIGTERM, SIGINT, SIGHUP), its sandboxed claude or grok sessions stop too, so no credentialed writer or judge runs unsupervised and a rerun can't overlap an orphan (finding worldcrafter-gbh1; Round 4's first attempt).

## Done when

- app/scripts/round/ and app/scripts/judging/ pass termination on to their sandboxes (signal the timeout/bwrap process group, or bwrap --die-with-parent from the runner) and record the phase as failed with the signal.
- A test (or a recorded manual run with a trivial session) shows SIGTERM to the runner leaves no sandboxed process behind.
- Before Round 5, the orchestrator confirms no writer is left over from earlier runs.
- bun run check passes.
