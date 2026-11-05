---
created_at: "2026-11-05T06:28:35.528501580+00:00"
id: "worldcrafter-xzee"
issue_type: "feature"
labels: []
workflow_branch:
  branch_base: master
  work_branch: feature/worldcrafter-xzee
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-7coc"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-gwx3"
    type: "advances"
  - kind: "issue"
    id: "worldcrafter-ql1d"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-s2mz"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
status: "in_progress"
title: "Round 1"
updated_at: "2026-11-05T08:53:14.849700163+00:00"
---

## Goal

The first judged round on the fixed tool (decision worldcrafter-jeue).

## Done when

- A fresh writer runs the outline phase on the prompt "Wait. Let me get this straight. You are a warlock that doesn't have a single patron, but hundreds of lesser patrons all watching you at the same time? And... you call them 'Chat'?"
- The orchestrator picks four points from the outline, two at random (seed recorded) and two at interesting turns (a reveal, a reversal, a cost being paid), spread across the arc, and records how each was chosen.
- Four scenes and four story-so-far texts are written, and every judge scores every scene with the rubric.
- After judging, a reader who is not the writer reads the writer's full transcript and model and reports where it misunderstood the tool and where the tool did something stupid; resulting skill or tool fixes are made, each independently reviewed and merged locally, before Round 2.
- docs/rounds/round-1.md holds the round log: tool changes, how the writer used the tool (commands, where it struggled, what it ignored), every judge's scores with quotes, and the paths to scenes; reports are recorded as evidence.

## Notes

- 2026-11-05 [note] From review finding worldcrafter-mdk6: timeline problems and mixed year/date positions print raw fractions of a year (contradictions, edit output, show event). If the writer uses dates, fix to the date/unit wording render uses.
- 2026-11-05 [note] Points (points.json in /home/supadava/projects/demiurge-world/round-1): chosen by the orchestrator: the-witness (19/37, reveal) and one-exact-act (31/37, cost paid); random: coldharbour (4/37, seed 20261105) and punch-or-fire (1/37, seed 20261106), uniform over remaining beats. Both random draws fell early, leaving nothing in beats 20-30; kept as drawn rather than redrawn. From Round 2 on, random points are drawn one from each half of the arc not covered by the chosen points (procedure change by the orchestrator, recorded here before Round 2's draw).
