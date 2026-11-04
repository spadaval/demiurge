---
created_at: "2026-11-04T21:17:09.090128503+00:00"
id: "worldcrafter-j7a9"
evidence_type: "test"
commit: "5d57fb10345196b9a9b8a68e9f7345ff96c5674b"
result: "pass"
captured_at: "2026-11-04T21:16:46.605922602+00:00"
command: "bash -c 'cd app && bun run check'"
exit_status: "0"
target:
  kind: "issue"
  id: "worldcrafter-p4zf"
  role: "validates"
relationships:
  blocks: []
  children: []
  attachments:
  - kind: "issue"
    id: "worldcrafter-p4zf"
    role: "validates"
  relates: []
schema: "atelier.evidence"
schema_version: 2
status: "recorded"
title: "bun run check in app/ (tsc + biome + bun test) passes, including scripts/story.test.ts (CLI run as a subprocess: sketch, candidate with touches, drive rework, kept conflicting event move, read back from file; every --help example runs; refusals leave the file alone) and src/story/render.test.ts"
updated_at: "2026-11-04T21:17:09.090339287+00:00"
---

## Summary

bun run check in app/ (tsc + biome + bun test) passes, including scripts/story.test.ts (CLI run as a subprocess: sketch, candidate with touches, drive rework, kept conflicting event move, read back from file; every --help example runs; refusals leave the file alone) and src/story/render.test.ts

## Command

```console
bash -c 'cd app && bun run check'
```

Exit status: 0

## Stdout

Bytes: 74
SHA-256: 31f7bd507c776a7f73af0eebc080517cf75c6932a37b25f947b367070bdfc600

## Stderr

Bytes: 124
SHA-256: 8e611248b565fc244f2139823d4a9dcfffde3e3063d89eccab642362ec1b7dd4
