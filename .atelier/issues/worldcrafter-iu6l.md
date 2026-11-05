---
created_at: "2026-11-05T00:50:24.572415500+00:00"
id: "worldcrafter-iu6l"
issue_type: "validation"
labels:
- "story-model"
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-1wrn"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-ac45"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-hqgq"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-z9qs"
    type: "advances"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Verdict on the changed tool: a judging panel reads the second comparison"
updated_at: "2026-11-05T00:55:56.960828887+00:00"
---

## Goal

Find out whether the changed tool is at least as good as plain notes. A judging panel decides, as in worldcrafter-i2uz (decision worldcrafter-zybl, strategy Verdicts).

## Done when

- The panel runs as in worldcrafter-i2uz: three isolated judges on Opus 5.5, Sonnet 5.5 and Fable 5.1, with a blind Part 1 recorded before Part 2, over the second comparison's packets and `docs/verdicts/comparison-2-rubric.md`, a copy of the first rubric changed only to name the second comparison's premises and which is tuned-on and held back, committed and reviewed before any judge reads, so the two verdicts compare, following the same rule for flags and replacements (d2401a0 on i2uz). Each report and the verdict are evidence here; a fresh reviewer checks the procedure before the next increment starts.
- Before it runs: `panel.ts` takes the rubric path and the comparison root as arguments, `verdict` counts the run the flag rule selects for each judge (finding worldcrafter-g0qj), and the transcript-check gaps in worldcrafter-jf70 are fixed; each change is independently reviewed. These come from worldcrafter-1wrn.
- The verdict closes this item, with the next step chosen from it. On drop, the next step is a replan of the strategy, decided by agents and reviewed (decision worldcrafter-zybl).
