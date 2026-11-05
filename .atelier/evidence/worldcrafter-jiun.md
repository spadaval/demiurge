---
created_at: "2026-11-05T01:22:30.478769836+00:00"
id: "worldcrafter-jiun"
evidence_type: "test"
commit: "8bd0b50d3379ba13fb8114af3813e639306bdc2f"
result: "pass"
captured_at: "2026-11-05T01:22:03.846293414+00:00"
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
title: "bun run check after h1be: tsc, biome, 903 tests pass. Causes: commands.test 'causes between events' (record/remove, refuses unknown/self/duplicate, keeps cycle, removeEvent drops causes); contradictions.test 'causes' (effect-first listed, same position not, move after and back, constraint order, cycle once); touches.test 'causes' (both directions, further via effects); render.test because-of lines, 8-word budget with causes, contradiction words; story.test 'causes in the file' (old file byte-for-byte, parse errors); CLI test add-cause/render/show/set-position report; --help examples run. Mutations of each key line caught."
updated_at: "2026-11-05T01:22:30.479144515+00:00"
---

## Summary

bun run check after h1be: tsc, biome, 903 tests pass. Causes: commands.test 'causes between events' (record/remove, refuses unknown/self/duplicate, keeps cycle, removeEvent drops causes); contradictions.test 'causes' (effect-first listed, same position not, move after and back, constraint order, cycle once); touches.test 'causes' (both directions, further via effects); render.test because-of lines, 8-word budget with causes, contradiction words; story.test 'causes in the file' (old file byte-for-byte, parse errors); CLI test add-cause/render/show/set-position report; --help examples run. Mutations of each key line caught.

## Command

```console
bash -c 'cd app && bun run check'
```

Exit status: 0

## Stdout

Bytes: 177
SHA-256: 843f56bb8021aaa4d463868e334f6f858508804ac3a31350d85cea23f1e447d8

## Stderr

Bytes: 156
SHA-256: 7977f91072c765c01ef662cd9e3f4aeb150d688679679f018f513994fa10efc1
