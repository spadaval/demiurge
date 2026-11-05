---
created_at: "2026-11-05T16:59:55.958537559+00:00"
id: "worldcrafter-b0pg"
issue_type: "task"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-lsu3"
    type: "discovered_from"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Opening counts and viewpoint marks in reader-order --before (Round 4 reading 2, 3)"
updated_at: "2026-11-05T16:59:55.958537559+00:00"
---

## Goal

The pre-scene read gives count values as the scene opens and true viewpoint marks.

## Done when

- reader-order --before prints each count's value entering the scene and each change at the scene's events ('402, then 261 at event:i-did-this').
- The viewpoint character also holds what a scene reveals or implies when they are an actor in it or take part in its depicted events, and what their own viewpoint scenes imply.
- Re-run on Round 4's snapshots shows the counts before s24 and s33 and the marks before s24, s33 and s36, with how many remain false by the reading's judgement; tests; --help; bun run check passes.
