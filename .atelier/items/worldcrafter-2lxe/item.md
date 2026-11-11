---
schema: atelier.item
schema_version: 3
id: worldcrafter-2lxe
title: 'Transcript check: flag running a file the session wrote'
status: draft
mission: null
labels: []
priority: low
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-05T17:55:34.032437347Z
---

## Goal

The transcript check sees a script's contents only when they are passed inline. Writing a script file and running it hides what it reads (finding worldcrafter-k9wa; open before 070f68e too).

## Done when

- [ ] - Text written to *.sh, *.py, *.js and similar files is checked as code, and a Bash call that runs a file the session wrote is flagged; tests; bun run check passes.

## Links

Relationships of the old record that the new format has no field for.

- related: worldcrafter-gwx3 (World first: demonstrate the Demiurge-assisted process on one premise)
- discovered_from review: worldcrafter-k9wa
