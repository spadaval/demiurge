---
created_at: "2026-11-04T21:22:09.609277426+00:00"
id: "worldcrafter-xkyn"
evidence_type: "test"
commit: "1a5fb22b7692dad94837cb67aa5428d9ba5f5a44"
result: "pass"
captured_at: "2026-11-04T21:21:44.060347541+00:00"
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
title: "After review fixes (s26s, 90wt, fz4p, 3q6d): bun run check in app/ (tsc + biome + bun test) passes, including render tests for the Decided section and CLI tests for a lone none clearing set-scene-actors and set-drive-origins. Supersedes worldcrafter-apuq, whose command piped through tail and so did not carry the check's exit status."
updated_at: "2026-11-04T21:22:09.609521592+00:00"
---

## Summary

After review fixes (s26s, 90wt, fz4p, 3q6d): bun run check in app/ (tsc + biome + bun test) passes, including render tests for the Decided section and CLI tests for a lone none clearing set-scene-actors and set-drive-origins. Supersedes worldcrafter-apuq, whose command piped through tail and so did not carry the check's exit status.

## Command

```console
bash -c 'cd app && bun run check'
```

Exit status: 0

## Stdout

Bytes: 74
SHA-256: f904db20c4387ad94db0b3af1dc93532c28e817b9aba3352993e8bf6fa8702da

## Stderr

Bytes: 124
SHA-256: db13e4286f8b48f1fbe0642c2139623c51795167474365794e4151ed998af917
