---
created_at: "2026-10-30T22:02:01.320936113+00:00"
id: "worldcrafter-i2uz"
issue_type: "validation"
labels:
- "story-model"
workflow_branch:
  branch_base: master
  work_branch: validation/worldcrafter-i2uz
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-04z5"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-o8b7"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-z9qs"
    type: "advances"
schema: "atelier.issue"
schema_version: 2
status: "in_progress"
title: "Verdict: a judging panel reads the comparison, then keep, change or drop"
updated_at: "2026-11-05T00:49:23.401426965+00:00"
---

## Goal

Find out whether the model makes stories better than plain notes do. A judging panel of agents reads the comparison blind and decides (decision worldcrafter-zybl, strategy Verdicts). Tests can't answer this.

## Done when

- Exactly three judges answer every question in `docs/verdicts/comparison-rubric.md`, on Opus 5.5, Sonnet 5.5 and Fable 5.1. The rubric is given to them as it stands at a named commit, committed and reviewed before any judge reads a packet. None of them built the tool or ran the comparison.
- Each judge runs as an isolated session, sandboxed like the comparison's sessions. It can reach only a copy of the packets and the rubric, with no access to the repository, Atelier, git history, the key or other judges' reports. Each transcript is checked for reads beyond that. A judge that failed or reached beyond its material is replaced by a fresh judge on the same model, and the replacement is recorded.
- Part 1, the blind report, is recorded as evidence here before that judge's Part 2 starts. Part 2 is a fresh session of the same model, given its Part 1 report, the packets, the rubric, the key, the model-gaps logs and the failure notes. Part 1 isn't revised.
- Each judge's full report (both parts) is recorded as evidence here. The verdict follows the rubric's rule: the call that at least two of the three make, or change if all three differ. It is recorded as a decision note here.
- A fresh reviewer, not a judge, checks that the procedure held: the rubric commit, the isolation and blindness, the judges and their models, and the rule applied. The review is recorded before the next increment starts.
- This item closes with the verdict, the judges' main reasons, what they'd change first, and the next increment chosen from it. Any verdict closes this item, and drop is a useful result.

## Context

The packets are in `/home/supadava/projects/demiurge-comparison/packets/`. The key, raw output, model-gaps logs and failure notes are in `/home/supadava/projects/demiurge-comparison/key/`, which judges see only in Part 2. The Thukker pairs are tuned-on and the magical girl therapist pairs are held back. Format may give an arm away, and that's accepted. This verdict doesn't test how a screen feels; that's worldcrafter-frqk. Sumeet may read the reports and overturn the verdict afterwards, but he isn't the gate.

## Notes

- 2026-11-04 [decision] Part 1 judges get the rubric only up to the '## Part 2' heading, from the pinned commit; Part 2 gets the full rubric
  Reason: Review finding worldcrafter-8vrv: the rubric's Part 2 names the arms and the tuned-on premise, so giving Part 1 the whole file would break blindness. The excerpt's hash is recorded.
- 2026-11-04 [note] Refinement of the decision note above: Part 1's excerpt is the rubric's lines from '## What you're judging' up to (not including) '## Part 2' at the pinned commit; the title ('tool against plain notes') and the preamble are dropped too, since they name the arms.
- 2026-11-04 [decision] Opus and Fable Part 1 runs are kept after a reviewed recheck rather than replaced
  Reason: Diagnosis (c8c9d35, 39ae955): Opus's flagged reads were Claude Code's own spill files of a packet it had just cat'ed, inside the sandbox's fresh HOME; Fable's flag was bare '/' in the prose of the heredoc writing its report. Neither reached beyond its material. A replacement Opus would trip the same spill-file read. STATUS.original keeps the first verdicts.
- 2026-11-04 [decision] Verdict: drop the tool as built
  Reason: Panel of three (opus change, sonnet drop, fable drop); rule gives drop. Notes won 4 of 4 pairs for every judge, including the held-back premise and the tuned-on one. Main reason in all three reports: the render's word budget made tool sessions delete the structure the tool holds; then missing cause links, no way to reach what text mentions, no history. Reports in docs/verdicts/comparison/.
- 2026-11-04 [decision] Sonnet's first Part 2 run (judging/sonnet/part2-failed-1, VERDICT change) counts; the replacement (sonnet/part2, VERDICT drop) is kept on record but does not count. Panel: opus change, sonnet change, fable drop, so the verdict is change, not drop. This supersedes the decision note 'Verdict: drop the tool as built'.
  Reason: Decided by an independent decider (finding worldcrafter-49qz). Rule, applied to all flagged runs: the transcript check's flag triggers a diagnosis, not a replacement. A run is replaced only if it failed to produce a complete report or its transcript actually shows a read or write beyond its material; otherwise the first run counts and the flag is recorded. Opus P1 (spill files byte-equal to packets it had cat'ed) and fable P1 (bare '/' in quoted report heredoc) were kept under this rule. Sonnet part2-failed-1's only flag is the same class as fable's: a bare '/' in the prose of a quoted 'cat > part2.md <<EOF' after 'cd /tmp/judge.6ub61Q;'. Every Bash command cds into its own run dir and only cats its inputs (checked by the procedure reviewer and again by this decider from transcript.jsonl); its report is complete (sections 6-8 and a VERDICT line; byte-identical to docs/verdicts/comparison/failed/sonnet-part2-failed-1.md). Counting the first valid run also removes operator choice: the replacement was started without a recorded decision, after the flagged heredoc (which ends in the verdict) was in the operator's output, so letting it count would let a rerun pick the result. Replacing on any flag instead would also require replacing opus and fable Part 1 and their Part 2s. Follow-up before i2uz closes: (1) fix the check for a leading 'cd <run dir>;' before a top-level quoted cat heredoc (finding worldcrafter-bu9d, brought forward from worldcrafter-1wrn) with a test from part2-failed-1's command, independently reviewed; (2) recheck sonnet/part2-failed-1 so STATUS is ok with STATUS.original kept, as for fable; if the recheck flags anything else, this decision reopens; (3) record part2-failed-1's report as evidence counting toward the verdict, and amend evidence worldcrafter-t2uj and judging/verdict.md to say sonnet/part2 is a replacement run made without a recorded decision and not counted, kept for Sumeet's review; (4) record the verdict as change with tally keep 0 / change 2 / drop 1, dissent fable drop, and note that the uncounted replacement called drop; (5) tell Sumeet the verdict flipped and why. The judges' named changes (word budget deleting structure, missing cause links, no reach from text, no history) are the same under either verdict.
- 2026-11-04 [decision] Verdict: change. This replaces the earlier note 'Verdict: drop the tool as built'
  Reason: Opus change, Sonnet change (first run, which counts per d2401a0), Fable drop (dissent). The uncounted Sonnet replacement called drop. Every judge preferred the notes arm in all four pairs, so the tool as built lost; change means build on it only after named changes. The judges agree on what to change first: (1) render cost: the readable form's word budget made sessions delete structure, so keep links, settled questions and rejected candidates out of the count; (2) cause links between events, checked on moves; (3) a way to reach what free text mentions, such as moved dates and changed motives; (4) history: superseded answers. Opus: if the changes don't give at least an even result on a fresh held-back premise, the next verdict should be drop.
- 2026-11-04 [note] Path map after 7b8aa90 (finding worldcrafter-3k5e): evidence worldcrafter-t2uj (drop) recorded the uncounted Sonnet replacement, now at docs/verdicts/comparison/sonnet-part2-replacement-uncounted.md; docs/verdicts/comparison/sonnet-part2.md now holds the counted first run (change), formerly failed/sonnet-part2-failed-1.md, with its first STATUS in sonnet-part2.STATUS.original. Evidence worldcrafter-tshh (drop) described the verdict.md of 0ab62e8; verdict.md now says change (evidence worldcrafter-enlh). t2uj was superseded by worldcrafter-bzev rather than amended.
