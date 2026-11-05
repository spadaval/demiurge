---
created_at: "2026-11-05T17:55:34.032437347+00:00"
id: "worldcrafter-2lxe"
issue_type: "task"
labels: []
priority: "P3"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-gwx3"
    type: "related"
  - kind: "review"
    id: "worldcrafter-k9wa"
    type: "discovered_from"
schema: "atelier.issue"
schema_version: 2
status: "backlog"
title: "Transcript check: flag running a file the session wrote"
updated_at: "2026-11-05T17:55:34.032437347+00:00"
---

## Goal

The transcript check sees a script's contents only when they are passed inline. Writing a script file and running it hides what it reads (finding worldcrafter-k9wa; open before 070f68e too).

## Done when

- Text written to *.sh, *.py, *.js and similar files is checked as code, and a Bash call that runs a file the session wrote is flagged; tests; bun run check passes.
