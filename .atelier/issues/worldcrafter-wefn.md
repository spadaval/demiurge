---
created_at: "2026-11-05T06:28:02.394770763+00:00"
id: "worldcrafter-wefn"
issue_type: "task"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-r26d"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Make gap reports advisory"
updated_at: "2026-11-05T06:28:02.394770763+00:00"
---

## Goal

Gap reports are advisory and never push deletion. 'Actor with no drive is a gap' is dropped as pressure.

## Done when

- gaps output is framed as optional prompts; the actor-without-drive gap and any gap that would push removing true story are dropped or demoted.
- The skill says gaps are advisory and never a reason to delete.
- Tests; bun run check passes; independently reviewed and merged locally.
