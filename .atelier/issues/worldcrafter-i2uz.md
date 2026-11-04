---
created_at: "2026-10-30T22:02:01.320936113+00:00"
id: "worldcrafter-i2uz"
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
status: "todo"
title: "Verdict: a judging panel reads the comparison, then keep, change or drop"
updated_at: "2026-11-04T23:07:45.809408244+00:00"
---

## Goal

Find out whether the model makes stories better than plain notes do. A judging panel of agents reads the comparison blind and decides (decision worldcrafter-zybl). Tests can't answer this.

## Done when

- At least three fresh judges answer every question in `docs/verdicts/comparison-rubric.md`, which was committed before any of them read a packet. At least one judge runs on a different model from the others. None of them built the tool or ran the comparison, and none sees the authors' reasoning, the handoffs or the other judges' reports.
- Each judge reads only the packets and the rubric for Part 1, and files that report before getting the key. Part 2 adds the key, the model-gaps logs and the failure notes, and leaves Part 1 unrevised.
- Each judge's full report is recorded as evidence on this item. The verdict follows the rubric's rule: the call at least two judges make, or change if all three differ.
- The verdict is recorded as a decision note here. This item closes with the verdict, the judges' main reasons, what they'd change first, and the next increment chosen from it. Any verdict closes this item, and drop is a useful result.

## Context

The packets are in `/home/supadava/projects/demiurge-comparison/packets/`. The key, raw output, model-gaps logs and failure notes are in `/home/supadava/projects/demiurge-comparison/key/`. The Thukker pairs are tuned-on and the magical girl therapist pairs are held back. Format may give an arm away, and that's accepted. This verdict doesn't test how a screen feels; that's worldcrafter-frqk. Sumeet may read the reports and overturn the verdict afterwards, but he isn't the gate.
