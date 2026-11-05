---
created_at: "2026-11-05T19:02:18.204538559+00:00"
id: "worldcrafter-yxfp"
issue_type: "bug"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-gwx3"
    type: "related"
  - kind: "issue"
    id: "worldcrafter-hdly"
    type: "discovered_from"
schema: "atelier.issue"
schema_version: 2
status: "backlog"
title: "span: day counts off by one between whole-day events"
updated_at: "2026-11-05T19:02:18.204538559+00:00"
---

## Goal

span's day counts between whole-day events are often off by one (rounding error counting midnights in describeBetween, app/src/story/calendar.ts ~423), latent since Round 2: 17 of 144 wrong on Round 2's model, 47 of 186 on Round 3's, 0 of 193 on Round 4's, 39 of 119 on Round 5's (docs/rounds/round-5/reading.md, ranked item 1).

## Done when

- Round each moment to the whole minute (or count calendar dates) before counting midnights; a test with 30 October to 1 November 1187; the per-round counts above re-run show 0 wrong; every day count stated in Rounds 2-5's judged prose (docs/rounds/round-<n>/scenes/) is re-checked against the fixed span and any error listed; bun run check passes.
