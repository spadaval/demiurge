---
created_at: "2026-11-05T06:28:35.434475264+00:00"
id: "worldcrafter-blvm"
issue_type: "task"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates: []
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T07:01:02.540803639+00:00"
status: "done"
title: "Write the scene rubric"
updated_at: "2026-11-05T07:01:02.540803639+00:00"
---

## Goal

The rubric each judge scores one scene against, written and reviewed before any judge reads anything, and frozen once judging starts.

## Done when

- docs/verdicts/world-demo-rubric.md scores each criterion 1 to 10, with written anchors for 2, 5 and 8 and a short quoted line of evidence: pacing; intrigue (does it make you want the next scene?); subtext (what's meant but unsaid); character (motive, interiority, distinct voices); prose and voice; tone and humour fit for this premise; world aliveness, the thesis criterion (the world feels lived-in beyond the scene, through implied history, institutions, economies, consequences and specific texture that isn't exposition); continuity with the story so far. Plus an overall score and the single best and worst moment.
- The judge-facing part says nothing about Demiurge, the tool, the process, rounds or other judges; judges read one scene and its story so far.
- It asks for scores per criterion in a fixed machine-readable block, so per-judge scores can be tabulated; no pass/fail.
- Independently reviewed and committed before any judge runs.

## Close Reason

Implementer report: wrote docs/verdicts/world-demo-rubric.md. Eight criteria scored 1-10 with anchors at 2, 5 and 8 and a quoted evidence line each (pacing, intrigue, subtext, character, prose and voice, tone and humour fit, world aliveness, continuity), plus a holistic overall score (stated not to be an average) and the single best and worst moment, in a fixed fenced JSON block followed by brief prose reasons. Judge-facing part is the span from '## What you're judging' up to '## Part 2', the existing rubricFor(rubric, 'part1') cut in app/scripts/judging/panel.ts, so the runner needs no new cut; Part 2 holds runner notes (inputs, per-judge tabulation, no vote, what counts as a failed report). Decisions: judges are given the premise, since tone and humour fit for this premise needs it and it reveals nothing about the process; world aliveness explicitly gives no credit for exposition, info-dumps or weightless invented names; continuity is judged against the story so far only, new facts allowed unless contradicting. Proof: ran rubricFor on the file; cut is lines 14-144, starts at the marker, excludes Part 2, and contains no match for Demiurge, tool(s), round(s), panel, judges, AI, process, model or worldcrafter; the JSON template parses with the eleven expected keys. Review outstanding: the Done when requires independent review before any judge runs; the orchestrator arranges it. Open: w716 should parse the block by these exact keys and treat a malformed block as a failed run, as Part 2 says.
