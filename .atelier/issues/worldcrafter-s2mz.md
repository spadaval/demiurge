---
created_at: "2026-11-05T06:28:02.483395718+00:00"
id: "worldcrafter-s2mz"
issue_type: "feature"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-gwx3"
    type: "advances"
  - kind: "issue"
    id: "worldcrafter-j6z1"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "First pass at change tracing on content"
updated_at: "2026-11-05T06:49:45.867926708+00:00"
---

## Goal

After a change, list the records and prose that depend on it by meaning, not just by name.

## Done when

- After an edit (and on demand), the CLI lists records and scene prose that likely depend on the changed record's content, including ones that don't name it (for example a paraphrase, a date stated as an interval, a consequence). Approach is the implementer's call; an LLM call is allowed if it stays cheap and the CLI still works without it.
- Tests on fixed examples show it finds dependents that mentions misses. bun run check runs offline: if the tracer uses an LLM, the tests cover the offline path, and the LLM path is proven once by a recorded manual run on the same examples.
- bun run check passes; independently reviewed and merged locally.
