---
created_at: "2026-11-05T02:10:51.593846133+00:00"
id: "worldcrafter-txw0"
evidence_type: "test"
commit: "bdcf05bf5b23bd206e85dca73fa092b13059cae1"
result: "fail"
captured_at: "2026-11-05T02:09:25.000389138+00:00"
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
updated_at: "2026-11-05T02:10:51.594337549+00:00"
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
SHA-256: f3d780cbe68d6e93d728136c9aec72334a08ab8247a8a2d14ac1a5de3ac5a31d

```text
Checked 146 files in 579ms. No fixes applied.
bun test v1.4.4 (38afee6c8)
[sonnet part2] exit none, 0s, FAILED: the runner failed: /tmp/panel-test.q5EyOO/key/key.md is missing.
```

## Stderr

Bytes: 1712
Truncated: no
SHA-256: 6f4ea2fed799e882895985aa42cc891cd71c4009c7253061db620e311e11062c

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
Received: 11170.434471

      at <anonymous> (/home/supadava/projects/demiurge/app/src/generate/generate.test.ts:1043:25)
(fail) generate (memory storage) > streaming 50 KB of markup on many lines in 4-character deltas stays fast [11252.77ms]
1038 |         expect(result.outcome).toBe("complete");
1039 |         const segment = segmentAt(content(session), 3);
1040 |         expect(textOf(segment).join("\n").length).toBeGreaterThan(40_000);
1041 |         expect(content(session).slice(0, 3)).toEqual(ORIGINAL);
1042 |         // Measured at ~1 s; quadratic rendering took minutes.
1043 |         expect(elapsed).toBeLessThan(10_000);
                               ^
error: expect(received).toBeLessThan(expected)

Expected: < 10000
Received: 13990.987674999997

      at <anonymous> (/home/supadava/projects/demiurge/app/src/generate/generate.test.ts:1043:25)
(fail) generate (IndexedDB storage) > streaming 50 KB of markup on many lines in 4-character deltas stays fast [14083.09ms]

 956 pass
 2 fail
 174141 expect() calls
Ran 958 tests across 45 files. [70.61s]
error: script "check" exited with code 1
```
