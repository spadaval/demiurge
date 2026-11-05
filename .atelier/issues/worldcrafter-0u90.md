---
created_at: "2026-11-05T14:15:00.701301092+00:00"
id: "worldcrafter-0u90"
issue_type: "task"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-lxmj"
    type: "discovered_from"
schema: "atelier.issue"
schema_version: 2
status: "in_progress"
title: "Years as spans, counts at ranged events, output polish (Round 3 reading 5, 7, 9)"
updated_at: "2026-11-05T14:25:19.920071950+00:00"
---

## Goal

Let a writer place events at year precision and order them without inventing dates, and remove the remaining output noise.

## Done when

- A year position is its span, as months and days are: two events in one year can be ordered without a contradiction; span gives a range when an end has year precision.
- A count value at a ranged event says when it takes effect ('from 8 June'), or set-count can put it at the end.
- An existing contradiction isn't reprinted as new after an unrelated edit; a count at 0 gets no 'short of'; no redundant 'below the threshold at:' line; duration mismatches use the gap's own unit when that doesn't hide the mismatch (worldcrafter-5b6m).
- Old story files load and render unchanged where no year-precision ordering is involved; tests; --help; bun run check passes.
