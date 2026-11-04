---
created_at: "2026-11-04T21:21:37.306164342+00:00"
id: "worldcrafter-apuq"
evidence_type: "test"
commit: "ca9f18121acc9e7c78157852947dee236a884de7"
result: "pass"
captured_at: "2026-11-04T21:21:13.574490651+00:00"
command: "bash -c 'cd app && bun run check 2>&1 | tail -6'"
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
title: "After review fixes (s26s, 90wt, fz4p, 3q6d): bun run check in app/ passes, including render tests for the Decided section and CLI tests for a lone none clearing set-scene-actors and set-drive-origins"
updated_at: "2026-11-04T21:21:37.306538290+00:00"
---

## Summary

After review fixes (s26s, 90wt, fz4p, 3q6d): bun run check in app/ passes, including render tests for the Decided section and CLI tests for a lone none clearing set-scene-actors and set-drive-origins

## Command

```console
bash -c 'cd app && bun run check 2>&1 | tail -6'
```

Exit status: 0

## Stdout

Bytes: 110
SHA-256: b6996ad3ca457eedf479c341bacc3507bbfc18c3f96546467cd069c4d1ee4ea1

## Stderr

Bytes: 0
SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
