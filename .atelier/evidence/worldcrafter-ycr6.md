---
created_at: "2026-11-05T01:55:58.417446602+00:00"
id: "worldcrafter-ycr6"
evidence_type: "test"
commit: "660ef4e3159ef9ed97f5dba155c4d540eb9b77e4"
result: "fail"
captured_at: "2026-11-05T01:54:49.730462415+00:00"
command: "bash -c 'cd app && bun run check'"
exit_status: "1"
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
title: "After doc fix mac4 (660ef4e): bun run check passes. The Deliberate gaps bullet in docs/rebuild/story-model.md now says marks are kept in one list of their own (deliberateGaps), each naming the gap, its record or the whole story, and a reason."
updated_at: "2026-11-05T01:55:58.417935183+00:00"
---

## Summary

After doc fix mac4 (660ef4e): bun run check passes. The Deliberate gaps bullet in docs/rebuild/story-model.md now says marks are kept in one list of their own (deliberateGaps), each naming the gap, its record or the whole story, and a reason.

## Command

```console
bash -c 'cd app && bun run check'
```

Exit status: 1

## Stdout

Bytes: 177
Truncated: no
SHA-256: 98de400f0ee369a97432b8f4cef6b2b9d33e591509aef51d253e4b16750c2f6a

```text
Checked 146 files in 257ms. No fixes applied.
bun test v1.4.4 (38afee6c8)
[sonnet part2] exit none, 0s, FAILED: the runner failed: /tmp/panel-test.YruUy1/key/key.md is missing.
```

## Stderr

Bytes: 972
Truncated: no
SHA-256: e9c399c5eec09ef8996ca6502553c403f9b72e4936cd184e74ae31099326398f

```text
$ tsc --noEmit && biome check && bun test

scripts/judging/panel.test.ts:

src/generate/generate.test.ts:
1038 |         expect(result.outcome).toBe("complete");
1039 |         const segment = segmentAt(content(session), 3);
1040 |         expect(textOf(segment).join("\n").length).toBeGreaterThan(40_000);
1041 |         expect(content(session).slice(0, 3)).toEqual(ORIGINAL);
1042 |         // Measured at ~1 s; quadratic rendering took minutes.
1043 |         expect(elapsed).toBeLessThan(10_000);
                               ^
error: expect(received).toBeLessThan(expected)

Expected: < 10000
Received: 17980.828222000004

      at <anonymous> (/home/supadava/projects/demiurge/app/src/generate/generate.test.ts:1043:25)
(fail) generate (memory storage) > streaming 50 KB of markup on many lines in 4-character deltas stays fast [18060.25ms]

 956 pass
 1 fail
 174133 expect() calls
Ran 957 tests across 45 files. [58.18s]
error: script "check" exited with code 1
```
