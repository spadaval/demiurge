---
created_at: "2026-11-04T20:42:07.926861536+00:00"
id: "worldcrafter-44hv"
evidence_type: "test"
commit: "5c82b4f891a5913c3235bff0c4bff2df6e55d1aa"
result: "pass"
captured_at: "2026-11-04T20:41:46.297458866+00:00"
command: "bash -c 'cd app && bun run check'"
exit_status: "0"
target:
  kind: "issue"
  id: "worldcrafter-cly1"
  role: "validates"
relationships:
  blocks: []
  children: []
  attachments:
  - kind: "issue"
    id: "worldcrafter-cly1"
    role: "validates"
  relates: []
schema: "atelier.evidence"
schema_version: 2
status: "recorded"
title: "bun run check in app/ (tsc + biome + 724 tests) passes with story commands: app/src/story/commands.test.ts covers every StoryCommand, each refusal (unknown target or link ID, duplicate and blank IDs, self relation, relation either way), removal of references for every record kind, kept timeline contradictions via applyTimelineCommandKeepingProblems, and answer/unanswer changing nothing else"
updated_at: "2026-11-04T20:42:07.927516327+00:00"
---

## Summary

bun run check in app/ (tsc + biome + 724 tests) passes with story commands: app/src/story/commands.test.ts covers every StoryCommand, each refusal (unknown target or link ID, duplicate and blank IDs, self relation, relation either way), removal of references for every record kind, kept timeline contradictions via applyTimelineCommandKeepingProblems, and answer/unanswer changing nothing else

## Command

```console
bash -c 'cd app && bun run check'
```

Exit status: 0

## Stdout

Bytes: 74
SHA-256: e49aff960bbf5bd842b1968fdfc9df56cc5ab2104161a65b25d40e52eacae636

## Stderr

Bytes: 124
SHA-256: 645e9ac8f708820f8db12a95a40cd7ca72cb1eca5b8d8a0f6ce4eed0e1b4b0a2
