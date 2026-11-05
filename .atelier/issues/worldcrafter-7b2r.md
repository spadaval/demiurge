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
closed_at: "2026-11-05T17:10:03.004534825+00:00"
status: "done"
title: "Round runner: a killed runner stops its sandboxed session"
updated_at: "2026-11-05T17:10:03.004534825+00:00"
---

## Goal

When the round or panel runner is terminated (SIGTERM, SIGINT, SIGHUP), its sandboxed claude or grok sessions stop too, so no credentialed writer or judge runs unsupervised and a rerun can't overlap an orphan (finding worldcrafter-gbh1; Round 4's first attempt).

## Done when

- app/scripts/round/ and app/scripts/judging/ pass termination on to their sandboxes (signal the timeout/bwrap process group, or bwrap --die-with-parent from the runner) and record the phase as failed with the signal.
- A test (or a recorded manual run with a trivial session) shows SIGTERM to the runner leaves no sandboxed process behind.
- Before Round 5, the orchestrator confirms no writer is left over from earlier runs.
- bun run check passes.

## Close Reason

Implementer report (commit 5ce4e32). New app/scripts/judging/terminate.ts: onTermination installs SIGTERM/SIGINT/SIGHUP handlers that stop every child session (SIGTERM to each timeout, which leads its own process group and passes it to bwrap; SIGKILL to the group and the pid after 15 s; zombies count as gone), call a recorder, and exit 128+signal; sandboxedSessions/refuseIfSessionsRunning scan /proc for 'bwrap --args 3 claude|grok'. round.ts: runSession installs it per session, recording interrupted + 'the runner was interrupted by <signal>' in record.json and run.json and removing a story so far's temp dirs; outline, scenes and so-far refuse to start while a sandboxed session runs. scenes.ts and panel.ts: their SIGINT/SIGTERM handlers now go through onTermination (adding SIGHUP and the escalation); judgeRound and runPart refuse to start likewise; childPids moved to terminate.ts. Proof: terminate.test.ts runs a stand-in runner with a sandboxed sleep through spawnSandboxed: for SIGTERM, SIGHUP and SIGINT it exits 129/130/143 as due, records the signal and leaves no process; a control without the handler leaves the sandboxed sleep orphaned; the startup check sees the live session. Manual run with the real round runner (so-far on a copy of the smoke round, /home/supadava/projects/demiurge-world/sigterm-run.txt): SIGTERM 4 s into the session; timeout, bwrap and the inner bwrap were running (timeout in its own group, the cause of the orphan), runner exit 143, no 'bwrap --args 3 claude' left, record.json interrupted SIGTERM, temp dirs removed. bun run check: 1148 pass (clean worktree of HEAD plus these files). Cause of Round 4's SIGTERM: nothing in the runner signals itself; it was stopped from outside, most likely a time limit on whatever launched it (README now says to run phases detached, with a log). Orchestrator still to confirm no writer is left before Round 5 (sandboxedSessions shows none now). Review outstanding.
