---
created_at: "2026-11-05T04:06:51.160195623+00:00"
id: "worldcrafter-0x5i"
evidence_type: "test"
commit: "711a70c5114f8b9862a8103f5e75686efec8001d"
result: "fail"
captured_at: "2026-11-05T04:05:44.230003122+00:00"
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
title: "bun run check in app/ at the increment's head (tsc, biome, all tests)"
updated_at: "2026-11-05T04:06:51.160589647+00:00"
---

## Summary

bun run check in app/ at the increment's head (tsc, biome, all tests)

## Command

```console
bash -c 'cd app && bun run check'
```

Exit status: 1

## Stdout

Bytes: 177
Truncated: no
SHA-256: a2ca113f0c3666ad5a88cfe8a25015d9c8b8bc8970582053354c32d288f303f4

```text
Checked 146 files in 247ms. No fixes applied.
bun test v1.4.4 (38afee6c8)
[sonnet part2] exit none, 0s, FAILED: the runner failed: /tmp/panel-test.Yjhghz/key/key.md is missing.
```

## Stderr

Bytes: 972
Truncated: no
SHA-256: e45faee469d5239a7e2bd2317ded11c5f72a6ba28e7633de46645a9d2a05a4c0

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
Received: 18010.630616999995

      at <anonymous> (/home/supadava/projects/demiurge/app/src/generate/generate.test.ts:1043:25)
(fail) generate (memory storage) > streaming 50 KB of markup on many lines in 4-character deltas stays fast [18075.33ms]

 974 pass
 1 fail
 174211 expect() calls
Ran 975 tests across 45 files. [57.12s]
error: script "check" exited with code 1
```
