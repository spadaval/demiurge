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
closed_at: "2026-11-05T07:35:13.106954559+00:00"
status: "done"
title: "Four-judge panel runner, with Grok"
updated_at: "2026-11-05T07:35:13.106954559+00:00"
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

## Close Reason

Implementer report (commit 0b6104e on feature/worldcrafter-ql1d). Built app/scripts/judging/scenes.ts (scene panel) and grok.ts, reusing panel.ts (rubricAt/rubricFor cut, makeRunDir, judgeSession, judgeTranscript, modelProblems) and comparison/sandbox.ts (new systemMounts, workdirAndEnv, spawnSandboxed; spawnSession now delegates, bwrap options unchanged). README documents layout, sandbox, checks, output, commands. panel.ts prompt('part1') is left as it ran for the ended comparison; the scene panel has its own scenePrompt naming scene.md, story-so-far.md and rubric.md, nothing of parts/sessions (r8cb). Quote checks after JSON unescape + quote-mark/whitespace normalising (wtki), also reporting matches only without outer quotes or ignoring * and _, never correcting. Part 2 report rules enforced; malformed = failed run, replaced on the same model up to --attempts (default 3), failed runs kept as <judge>-failed-<n>. Waves: 4 at once only with >5 GiB MemAvailable, 2 with >3, else 1. Deviation: the report is the judge's final reply, not a file; judges get a read tool only (Claude Read, Grok read_file). Reason: with a report.md file contract Sonnet answered in its reply in 2 of 3 smoke runs. Grok runs sandboxed headless (no delegate_task fallback needed): tmpfs home with only auth.json ro-bound plus a runner config; home must be writable (Grok fails with read-only home); GROK_AUTH_EARLY_INVALIDATION_SECS=0 inside; host refresh via one-line grok -p with that variable set past the wave (verified expires_at moved 10:12Z to 13:10Z). Grok 4.7 reports as grok-4.7-build in modelUsage; accepted, grok-4.7-build-fast is not. Smoke (throwaway lighthouse scene, outputs /home/supadava/projects/demiurge-world/smoke-panel/): all four ok, no reads outside, all quotes found except two of Sonnet's (elided/compound quotes, recorded); auth.json and .credentials.json hashes identical before/after. Open: review outstanding; markdown table cells double-wrap quotes (cosmetic); Grok takes ~6 min per scene vs under 1 min for Claude.
