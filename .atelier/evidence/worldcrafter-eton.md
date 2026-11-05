---
created_at: "2026-11-05T02:06:43.223443533+00:00"
id: "worldcrafter-eton"
evidence_type: "test"
commit: "bdcf05bf5b23bd206e85dca73fa092b13059cae1"
result: "fail"
captured_at: "2026-11-05T02:05:33.352232468+00:00"
command: "bash -c 'cd app && bun run check'"
exit_status: "1"
target:
  kind: "issue"
  id: "worldcrafter-fax9"
  role: "validates"
relationships:
  blocks: []
  children: []
  attachments:
  - kind: "issue"
    id: "worldcrafter-fax9"
    role: "validates"
  relates: []
schema: "atelier.evidence"
schema_version: 2
status: "recorded"
title: "bash -c 'cd app && bun run check'"
updated_at: "2026-11-05T02:06:43.223804686+00:00"
---

## Summary

bash -c 'cd app && bun run check'

## Command

```console
bash -c 'cd app && bun run check'
```

Exit status: 1

## Stdout

Bytes: 177
Truncated: no
SHA-256: bbce2334b3951fdd0acb78186b2296e3ae759f11452dcc84a4299a1b707eeedf

```text
Checked 146 files in 263ms. No fixes applied.
bun test v1.4.4 (38afee6c8)
[sonnet part2] exit none, 0s, FAILED: the runner failed: /tmp/panel-test.n4Ouq1/key/key.md is missing.
```

## Stderr

Bytes: 966
Truncated: no
SHA-256: 7d023c793a33ffb6ee41a0600f7e33fcebbf1da1471e58b78d41c38edce941b5

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
Received: 19168.735783

      at <anonymous> (/home/supadava/projects/demiurge/app/src/generate/generate.test.ts:1043:25)
(fail) generate (memory storage) > streaming 50 KB of markup on many lines in 4-character deltas stays fast [19239.67ms]

 957 pass
 1 fail
 174141 expect() calls
Ran 958 tests across 45 files. [59.59s]
error: script "check" exited with code 1
```
