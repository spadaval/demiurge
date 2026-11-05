---
created_at: "2026-11-05T09:28:58.638479742+00:00"
id: "worldcrafter-5pks"
issue_type: "feature"
labels: []
workflow_branch:
  branch_base: master
  work_branch: feature/worldcrafter-5pks
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-3fqq"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-gwx3"
    type: "advances"
  - kind: "issue"
    id: "worldcrafter-xzee"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T11:33:24.472003787+00:00"
status: "done"
title: "Round 2"
updated_at: "2026-11-05T11:33:24.472003787+00:00"
---

## Goal

The second judged round, from scratch with a fresh writer on the same prompt, after the Round 1 fixes (decision worldcrafter-jeue).

## Done when

- As Round 1 (worldcrafter-xzee), except the point draw: the orchestrator picks the two interesting turns first; then one random point is drawn uniformly, with a recorded seed, from beats 1..floor(n/2) and one from beats floor(n/2)+1..n, each among beats not already chosen, using `round.ts choose-random --range <a>-<b>` (built in worldcrafter-3fqq).
- The round's reading checks whether the deferred Round 1 issues (point of view, presence and place; group membership over time; reading issue 12) come back.
- docs/rounds/round-2.md holds the round log, including how the writer's use of the tool changed from Round 1.
- The reading's fixes are recorded as their own increment, or the mission stops if the round shows no meaningful tool or skill issues.

## Notes

- 2026-11-05 [note] From review finding worldcrafter-5b6m: duration problems now print one unit finer than typed (e.g. '72 hours give or take 12 hours' for --gap 3d). The reading checks whether the writer misreads them.

## Close Reason

Round 2 run, judged and read. Fresh writer built a 34-beat outline and four 1,877-1,975-word scenes; 16 reports (one Sonnet run replaced), criterion scores 6-9, overall 8-9, world aliveness 7-8. Round 1 fixes took (no silencing; counts and span fixed outline errors); remaining: unchecked numbers in scenes, noisy traces, recurring viewpoint and membership gaps. Log: docs/rounds/round-2.md. Fixes: worldcrafter-ulpg; decision worldcrafter-dgkx. Next: Round 3 (worldcrafter-lxmj).
