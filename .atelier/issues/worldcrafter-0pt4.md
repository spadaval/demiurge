---
created_at: "2026-11-05T19:02:18.248813588+00:00"
id: "worldcrafter-0pt4"
issue_type: "task"
labels: []
priority: "P2"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-gwx3"
    type: "advances"
  - kind: "issue"
    id: "worldcrafter-hdly"
    type: "discovered_from"
schema: "atelier.issue"
schema_version: 2
status: "backlog"
title: "Viewpoint marks: presence rule, group presence, timing, unplaced scenes"
updated_at: "2026-11-05T19:02:18.248813588+00:00"
---

## Goal

Round 5's reading (ranked items 2-4): the presence rule's exception cancels it for secondary viewpoints; group members in a scene's actors don't count as present; a revealed knowledge record doesn't reveal what it knows; marks are taken at the scene's latest event, not as it opens; a scene whose depicted events are unplaced loses its anchor.

## Done when

- Each fixed with a test; Round 5's marks re-run show the false ones the reading lists cleared without hiding true ones (finding mnm0's case still holds); bun run check passes.
