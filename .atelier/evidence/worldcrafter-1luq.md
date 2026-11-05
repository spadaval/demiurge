---
created_at: "2026-11-05T01:57:01.752193970+00:00"
id: "worldcrafter-1luq"
evidence_type: "test"
commit: "660ef4e3159ef9ed97f5dba155c4d540eb9b77e4"
result: "pass"
captured_at: "2026-11-05T01:56:05.815795418+00:00"
command: "bash -c 'cd app && bun run check'"
exit_status: "0"
target:
  kind: "issue"
  id: "worldcrafter-iyt9"
  role: "validates"
relationships:
  blocks: []
  children: []
  attachments:
  - kind: "issue"
    id: "worldcrafter-iyt9"
    role: "validates"
  relates: []
schema: "atelier.evidence"
schema_version: 2
status: "recorded"
title: "Rerun after worldcrafter-ycr6, which failed only on the unrelated timing test 'generate (memory storage) > streaming 50 KB ... stays fast' (18s against a 10s limit, host load average about 14). For doc fix mac4 (660ef4e): bun run check passes; the Deliberate gaps bullet in docs/rebuild/story-model.md says marks are kept in one list of their own (deliberateGaps), each naming the gap, its record or the whole story, and a reason."
updated_at: "2026-11-05T01:57:01.752568970+00:00"
---

## Summary

Rerun after worldcrafter-ycr6, which failed only on the unrelated timing test 'generate (memory storage) > streaming 50 KB ... stays fast' (18s against a 10s limit, host load average about 14). For doc fix mac4 (660ef4e): bun run check passes; the Deliberate gaps bullet in docs/rebuild/story-model.md says marks are kept in one list of their own (deliberateGaps), each naming the gap, its record or the whole story, and a reason.

## Command

```console
bash -c 'cd app && bun run check'
```

Exit status: 0

## Stdout

Bytes: 177
SHA-256: 6e51c1beafb110a85e45bcc8e4bb0b8a250806f786505b0b76edf1e5fb0a26a7

## Stderr

Bytes: 156
SHA-256: 84cb64a464b1866a10b868af0ea9028ae17a3e67f5f3d4cf8a301a04f0d8d093
