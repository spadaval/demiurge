---
created_at: "2026-11-05T00:50:24.572415500+00:00"
id: "worldcrafter-iu6l"
issue_type: "validation"
labels:
- "story-model"
workflow_branch:
  branch_base: master
  work_branch: validation/worldcrafter-iu6l
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
closed_at: "2026-11-05T05:28:52.476831143+00:00"
status: "done"
title: "Verdict on the changed tool: a judging panel reads the second comparison"
updated_at: "2026-11-05T05:28:52.476831143+00:00"
---

## Goal

Find out whether the changed tool is at least as good as plain notes. A judging panel decides, as in worldcrafter-i2uz (decision worldcrafter-zybl, strategy Verdicts).

## Done when

- The panel runs as in worldcrafter-i2uz: three isolated judges on Opus 5.5, Sonnet 5.5 and Fable 5.1, with a blind Part 1 recorded before Part 2, over the second comparison's packets and `docs/verdicts/comparison-2-rubric.md`, a copy of the first rubric changed only to name the second comparison's premises and which is tuned-on and held back, committed and reviewed before any judge reads, so the two verdicts compare, following the same rule for flags and replacements (d2401a0 on i2uz). Each report and the verdict are evidence here; a fresh reviewer checks the procedure before the next increment starts.
- Before it runs: `panel.ts` takes the rubric path and the comparison root as arguments, `verdict` counts the run the flag rule selects for each judge (finding worldcrafter-g0qj), and the transcript-check gaps in worldcrafter-jf70 are fixed; each change is independently reviewed. These come from worldcrafter-1wrn.
- The verdict closes this item, with the next step chosen from it. On drop, the next step is a replan of the strategy, decided by agents and reviewed (decision worldcrafter-zybl).

## Notes

- 2026-11-04 [note] From review finding worldcrafter-4i9o: the second rubric copy may also state the actual pair count per premise, if a run failed.
- 2026-11-05 [decision] Sonnet's Part 1 run counts; it is not replaced. The check will be fixed for sed substitution patterns, reviewed, and the run rechecked before any Part 2
  Reason: Flag rule from d2401a0 on worldcrafter-i2uz: a flag starts a diagnosis; replace only on an incomplete report or a real read or write outside the material. Diagnosis before any other step: the flagged command is sed -i 's/ the Jovian-like mechanism is absent,//' part1.md, editing its own report inside its run dir; the token flagged is '//' from the sed pattern. Every tool call in the transcript (1 Bash cd/cat/ls/wc in the run dir, 8 Reads of its packets, 1 Write of part1.md, the sed) stays in /tmp/judge.B5XZ2y. Recorded before Part 2 and before any verdict is known; Part 1 reports carry no verdict.
- 2026-11-05 [decision] Verdict: drop the tool. The next step is a replan of the strategy, decided by agents and reviewed (decision worldcrafter-zybl)
  Reason: Opus drop, Fable drop, Sonnet change (dissent). Notes won the held-back premise-c pairs for all three judges, and the tuned-on Thukker pairs too wherever both arms delivered. Reasons: following a change through, the tool's central promise, failed in every tool log (mentions and set-position missed what the old version left in scene summaries; sessions found leftovers by reading, as the notes arm did); open questions rendered flat, with the weighing invisible; the render still taxed links, so sessions cut true structure. Opus and Fable: what would fix it is a redesign (knowledge and belief, objects, event participants, drive lifecycle, finer time, a content-based dependency tracer, a render that shows weighing), not a change; the gaps logs and the notes sessions' working methods should seed what comes next. Reports in docs/verdicts/comparison-2/.

## Close Reason

Verdict: drop (keep 0, change 1 [sonnet], drop 2 [opus, fable]) by a panel of three isolated judges over docs/verdicts/comparison-2-rubric.md at e72f280; procedure review approved (worldcrafter-qxcm). Reports and verdict in docs/verdicts/comparison-2/. Main reasons: the notes arm won the held-back premise for every judge and the tuned-on one wherever both arms delivered; the changed tool still failed at its central promise, following a change through (mentions and set-position missed what scene summaries still stated; sessions found leftovers by reading); open questions rendered flat; the render still taxed links. What judges would change is a redesign (knowledge and belief, objects, event participants, a drive lifecycle, finer time, a content-based dependency tracer, a render that shows weighing). Deviations: Sonnet's Part 1 was flagged on a sed pattern, kept by a decision recorded first (dd49ddd), check fixed and reviewed, run rechecked. Next step: replan the strategy, decided by agents and reviewed (decision worldcrafter-zybl); the backlog increments stay blocked until then.
