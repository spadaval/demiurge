---
created_at: "2026-11-05T01:41:51.484416535+00:00"
id: "worldcrafter-dk6u"
evidence_type: "test"
commit: "f699d1214c1c0f69be54da73c02f5578f2309387"
result: "pass"
captured_at: "2026-11-05T01:41:23.439564936+00:00"
command: "bash -c 'cd app && bun run check'"
exit_status: "0"
target:
  kind: "issue"
  id: "worldcrafter-h1be"
  role: "validates"
relationships:
  blocks: []
  children: []
  attachments:
  - kind: "issue"
    id: "worldcrafter-h1be"
    role: "validates"
  relates: []
schema: "atelier.evidence"
schema_version: 2
status: "recorded"
title: "After fix 9cto (9deaaad): bun run check passes. render.test 'puts a cause before its effects when story time doesn't order them': three events at one position whose IDs and labels sort effects first render C storm, A flood, B famine; without the causes labels decide. Removing the tiebreak fails the test."
updated_at: "2026-11-05T01:41:51.484739087+00:00"
---

## Summary

After fix 9cto (9deaaad): bun run check passes. render.test 'puts a cause before its effects when story time doesn't order them': three events at one position whose IDs and labels sort effects first render C storm, A flood, B famine; without the causes labels decide. Removing the tiebreak fails the test.

## Command

```console
bash -c 'cd app && bun run check'
```

Exit status: 0

## Stdout

Bytes: 177
SHA-256: 402f9041e0608ea7c5ac3be91d9605d98b23b32e6f11b6c4ddce32fce8175e3c

## Stderr

Bytes: 156
SHA-256: dd4d22fdf0daad887726da06ba17014c03fb014fc8b420b54ecb5286b6905a21
