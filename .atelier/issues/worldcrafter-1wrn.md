---
created_at: "2026-11-05T00:07:39.711941030+00:00"
id: "worldcrafter-1wrn"
issue_type: "task"
labels: []
priority: "P3"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-z9qs"
    type: "advances"
  - kind: "review"
    id: "worldcrafter-vidi"
    type: "discovered_from"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T04:01:08.708038278+00:00"
status: "done"
title: "Panel runner fixes before the second panel"
updated_at: "2026-11-05T04:01:08.708038278+00:00"
---

## Goal

The panel runner is ready for the second comparison's panel (worldcrafter-iu6l), with the gaps the first panel's reviews deferred closed.

## Done when

- `panel.ts` takes the rubric path and the comparison root as arguments instead of hard-coding the first rubric.
- `verdict` counts, for each judge, the run the flag rule selects (d2401a0 on worldcrafter-i2uz), and records which run counted, instead of always reading `<judge>/part2` (finding worldcrafter-g0qj).
- The transcript check flags `cd ..` forms, brace expansion and IFS tricks (worldcrafter-jf70), and skips a quoted cat heredoc only when the cat is top-level (worldcrafter-aaj0).
- An interrupted run's run.json records the interruption and keeps its files/ copy (worldcrafter-vidi).
- Each has a test; `bun run check` passes; the change is independently reviewed.

## Notes

- 2026-11-04 [note] Also from review finding worldcrafter-aaj0: skip a quoted cat heredoc body only when the cat line is top-level (not inside bash <<X or a multi-line string), with the two probes as tests.
- 2026-11-04 [note] Also from review finding worldcrafter-jf70 (see review record).
- 2026-11-04 [note] Also from review finding worldcrafter-g0qj (see review record).
- 2026-11-04 [decision] Made a child of worldcrafter-hqgq
  Reason: It changes app/scripts/comparison/transcript.ts and app/scripts/judging/panel.ts, which hqgq's branch also changed (fax9, ac45); sharing the branch avoids a conflicting second branch, and the panel for iu6l runs after hqgq merges.

## Close Reason

panel.ts takes --rubric (path recorded; Part 2 and verdict refuse a mismatch); verdict counts the single Part 2 or an explicit --count judge=run, refuses to guess, records the choice (g0qj); transcript check catches .. however punctuated, brace paths, IFS (jf70) and skips a quoted cat heredoc body only at top level (aaj0); interrupted runs record the signal in run.json and keep files/ (vidi); refusals (fallback, safeguard stop, refusal stop, <synthetic>) fail the run with the reason. Evidence worldcrafter-mw12 (check, 975 pass), worldcrafter-35tf (read-only checks; the stricter check finds nothing in the 13 saved judge transcripts). Disclosure: a grep of comparison-2's failures.md printed a few lines of story text to the implementer (not a tool builder or judge).
