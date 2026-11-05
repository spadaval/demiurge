---
created_at: "2026-11-05T01:33:18.331394414+00:00"
id: "worldcrafter-vapb"
evidence_type: "test"
commit: "8b7844a4df4b096ef112b9ff02a3599c145c334f"
result: "pass"
captured_at: "2026-11-05T01:32:51.326080497+00:00"
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
title: "bun run check after iyt9: tsc, biome, 953 tests pass. commands.test 'answers keep their history' (change keeps old with by, unanswer keeps without by, text survives candidate edit/removal, same answer adds nothing, order kept) and 'deliberate gaps' (kept in file, re-mark replaces reason, unmark restores file, story-wide null ref, refusals, record removal drops marks); gaps.test 'a gap marked deliberate' (every GAP_KIND: marked stops listing, deliberateGaps lists it, unmark brings it back; mark on one record leaves another); story.test (old files byte for byte, history order, parse errors); render.test superseded answers left out; CLI tests show history/render, mark/unmark/gaps output. Mutations (history dropped on answer/unanswer, marks ignored, marks always written, render shows history) each caught."
updated_at: "2026-11-05T01:33:18.331662945+00:00"
---

## Summary

bun run check after iyt9: tsc, biome, 953 tests pass. commands.test 'answers keep their history' (change keeps old with by, unanswer keeps without by, text survives candidate edit/removal, same answer adds nothing, order kept) and 'deliberate gaps' (kept in file, re-mark replaces reason, unmark restores file, story-wide null ref, refusals, record removal drops marks); gaps.test 'a gap marked deliberate' (every GAP_KIND: marked stops listing, deliberateGaps lists it, unmark brings it back; mark on one record leaves another); story.test (old files byte for byte, history order, parse errors); render.test superseded answers left out; CLI tests show history/render, mark/unmark/gaps output. Mutations (history dropped on answer/unanswer, marks ignored, marks always written, render shows history) each caught.

## Command

```console
bash -c 'cd app && bun run check'
```

Exit status: 0

## Stdout

Bytes: 177
SHA-256: a54d90bc30e1c5f35d2c23a20e70dbf5c5a83c2c068baabfad80ec2836aa50f6

## Stderr

Bytes: 156
SHA-256: e7c1bf8ca711dc6ac336aa15d7a313d6ea0ebe475e289a78be15af61132911e7
