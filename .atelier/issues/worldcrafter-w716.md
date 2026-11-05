---
created_at: "2026-11-05T06:28:35.496846259+00:00"
id: "worldcrafter-w716"
issue_type: "task"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-blvm"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Four-judge panel runner, with Grok"
updated_at: "2026-11-05T07:06:41.086981196+00:00"
---

## Goal

Run four isolated judges, Opus 5.5, Sonnet 5.5, Fable 5.1 and Grok 4.7, each on exactly one scene plus its story so far and the rubric, and tabulate their scores per judge.

## Done when

- Extends or reuses app/scripts/judging/ and the sandbox: each judge sees only its scene, its story so far and the judge-facing rubric, is told nothing about Demiurge or the process, and its transcript is checked for reads beyond that.
- Grok runs through /home/supadava/.grok/bin/grok headless in the same sandbox with its credentials mounted read-only and never written from inside; if that can't work, the runner documents why and the orchestrator uses T3 delegate_task (providerInstanceId grok, model grok-4.7) with the same inputs and records that. That fallback judge runs in a fresh directory holding only its scene, its story so far and the judge-facing rubric, is told to read nothing else, and its transcript or tool log is checked for reads beyond those files, as for the sandboxed judges.
- Judges run four at once only if free -g shows more than 5 GB available, otherwise fewer.
- Output: each report, a scores table per scene per judge with the quoted evidence, and the best and worst moments.
- Tests; bun run check passes; a smoke on a throwaway scene with each model, using the reviewed rubric (blvm); independently reviewed and merged locally.

## Notes

- 2026-11-05 [note] From review findings on the blvm rubric (docs/verdicts/world-demo-rubric.md). worldcrafter-r8cb: panel.ts's judge prompt prompt('part1') still asks for every pair, a one-line preference and confidence, names packets/, and names Part 1 and a later Part 2 session; with the new rubric that contradicts the cut and leaks process. w716 must replace it for one-scene judging with a prompt that names the two files (scene, story so far), says nothing of parts, sessions or later steps, and points to the rubric's 'Your report' section. worldcrafter-wtki: compare each evidence quote and best/worst quote to the scene after JSON unescaping and normalising quote marks (straight vs curly) and whitespace. Also parse the block per the rubric's Part 2: exactly one fenced json block, exactly the template's keys at both levels, whole-number scores 1-10, non-empty strings, else a failed run.
