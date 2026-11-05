---
created_at: "2026-11-05T14:15:01.004175078+00:00"
id: "worldcrafter-lsu3"
issue_type: "feature"
labels: []
workflow_branch:
  branch_base: master
  work_branch: feature/worldcrafter-lsu3
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-79m3"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-gwx3"
    type: "advances"
  - kind: "issue"
    id: "worldcrafter-lxmj"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T16:59:56.741327487+00:00"
status: "done"
title: "Round 4"
updated_at: "2026-11-05T16:59:56.741327487+00:00"
---

## Goal

The fourth judged round, from scratch with a fresh writer on the same prompt, after the Round 3 fixes (decision worldcrafter-jeue).

## Done when

- As Round 3 (worldcrafter-lxmj), with the same random-point rule (one draw from beats 1..floor(n/2), one from floor(n/2)+1..n). For the two chosen turns: they are at least 3 beats apart, and one of them falls in beats ceil(0.8n)..n when the outline has a reveal, reversal or cost there; this is recorded before the draws. Random points may land next to chosen ones; that is kept as drawn.
- The reading checks whether set-count's kept note states an old value (finding worldcrafter-mugi).
- docs/rounds/round-4.md holds the round log, including how the writer's use of the tool changed from Round 3.
- The reading's fixes are recorded as their own increment, or the mission stops if the round shows no meaningful tool or skill issues.

## Notes

- 2026-11-05 [note] Failed attempt 1 (2026-11-05 15:31Z): the round runner (bun round.ts outline) was terminated by SIGTERM (exit 143) about 5 minutes into the outline phase, with no record written; cause not found (not the runner's own timeout). Its sandboxed writer kept running as an orphan and was stopped by the orchestrator. The partial directory is kept at /home/supadava/projects/demiurge-world/round-4-failed-1/ and is not used; the outline was rerun from scratch in round-4/. If it recurs, diagnose before a third attempt.

## Close Reason

Round 4 run (after one killed outline attempt, recorded and set aside), judged and read. Fresh writer built a 37-beat outline and four 1,753-1,976-word scenes; 16 reports (one Opus run replaced); criterion scores 5-9, overall 8-9, world aliveness 7-9. Round 3 fixes took (reader-order read whole every scene, no invented dates, first trace acted on, numbers right in value and meaning). Remaining: a retold night read from labels (ribbon slip), opening counts from memory, viewpoint marks half false late. Log: docs/rounds/round-4.md. Fixes: worldcrafter-qmq0. Next: Round 5 (worldcrafter-hdly), the last.
