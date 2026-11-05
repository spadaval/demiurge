---
created_at: "2026-11-05T04:07:55.714027260+00:00"
id: "worldcrafter-dc3c"
evidence_type: "test"
commit: "711a70c5114f8b9862a8103f5e75686efec8001d"
result: "fail"
captured_at: "2026-11-05T04:06:51.248640533+00:00"
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
title: "bun run check in app/ at the increment's head (tsc, biome, all tests)"
updated_at: "2026-11-05T04:07:55.714417517+00:00"
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
SHA-256: 799dd84e21874e1559a8b882f09770170631d0448db06d78653303ce9cfb9719

```text
Checked 146 files in 243ms. No fixes applied.
bun test v1.4.4 (38afee6c8)
[sonnet part2] exit none, 0s, FAILED: the runner failed: /tmp/panel-test.ZGkEhA/key/key.md is missing.
```

## Stderr

Bytes: 969
Truncated: no
SHA-256: 0085ba4fb8b78ee7131d79bffc192bf268997f285dde1909a6df1e23286aade6

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
Received: 11245.476124

      at <anonymous> (/home/supadava/projects/demiurge/app/src/generate/generate.test.ts:1043:25)
(fail) generate (IndexedDB storage) > streaming 50 KB of markup on many lines in 4-character deltas stays fast [11329.85ms]

 974 pass
 1 fail
 174211 expect() calls
Ran 975 tests across 45 files. [54.51s]
error: script "check" exited with code 1
```
