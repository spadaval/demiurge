---
created_at: "2026-11-05T14:15:00.742499920+00:00"
id: "worldcrafter-vw1u"
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
status: "todo"
title: "Trace noise, round three (Round 3 reading 6)"
updated_at: "2026-11-05T14:15:00.742499920+00:00"
---

## Goal

Inline trace suspects that are mostly real.

## Done when

- The batch exclusion also covers the writing scene's prose file; records created in the same batch are left out; a prose duration is matched only against spans that include the changed event; word-share-only suspects need a higher bar.
- Re-run on Round 3's 8 trace blocks shows what remains; a count insert that makes another event's note off (the poll-morning 70 vs 69 case) is caught if cheap, or recorded as not caught; tests; bun run check passes.
