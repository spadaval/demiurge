---
created_at: "2026-11-05T01:54:49.547393217+00:00"
id: "worldcrafter-112q"
evidence_type: "test"
commit: "660ef4e3159ef9ed97f5dba155c4d540eb9b77e4"
result: "pass"
captured_at: "2026-11-05T01:53:52.656535698+00:00"
command: "bash -c 'cd app && bun run check'"
exit_status: "0"
target:
  kind: "issue"
  id: "worldcrafter-qgom"
  role: "validates"
relationships:
  blocks: []
  children: []
  attachments:
  - kind: "issue"
    id: "worldcrafter-qgom"
    role: "validates"
  relates: []
schema: "atelier.evidence"
schema_version: 2
status: "recorded"
title: "After fix pzpi (926d2c0): bun run check passes. CLI test 'a cut-short prompt keeps the text stating the old want ahead of the holder's name': 12 scene summaries name Mara, a fact says 'Her vow to keep the light binds her'; update-drive --want 'Leave the island' prints the fact first, then 4 holder lines, then '...and 8 more (13 in all)'; mentions drive:d also lists the fact first. mentions.test checks match order direct, holder, near. Removing the ranking fails 5 tests."
updated_at: "2026-11-05T01:54:49.547863464+00:00"
---

## Summary

After fix pzpi (926d2c0): bun run check passes. CLI test 'a cut-short prompt keeps the text stating the old want ahead of the holder's name': 12 scene summaries name Mara, a fact says 'Her vow to keep the light binds her'; update-drive --want 'Leave the island' prints the fact first, then 4 holder lines, then '...and 8 more (13 in all)'; mentions drive:d also lists the fact first. mentions.test checks match order direct, holder, near. Removing the ranking fails 5 tests.

## Command

```console
bash -c 'cd app && bun run check'
```

Exit status: 0

## Stdout

Bytes: 177
SHA-256: ce80890e9db0640fcd9a0df9b3a5fb232b8b56e819a30a1a8a8920c0f1a4e1cf

## Stderr

Bytes: 156
SHA-256: 52b0267b78755d4f00f4213b83884f35ad05c7b9ce50b5aaef78e4bc90e9df3f
