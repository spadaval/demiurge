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
updated_at: "2026-11-05T00:06:13.519679114+00:00"
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
