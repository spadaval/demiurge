---
created_at: "2026-11-05T04:10:18.266888981+00:00"
id: "worldcrafter-hih8"
evidence_type: "test"
commit: "70b28a4cee7659342298ae5e4e0b23f7dd33a420"
result: "fail"
captured_at: "2026-11-05T04:09:01.238511238+00:00"
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
title: "bun run check in app/ at the increment's head (tsc, biome, all tests); retried only for the known load flake worldcrafter-08kf"
updated_at: "2026-11-05T04:10:18.267501672+00:00"
---

## Summary

bun run check in app/ at the increment's head (tsc, biome, all tests); retried only for the known load flake worldcrafter-08kf

## Command

```console
bash -c 'cd app && bun run check'
```

Exit status: 1

## Stdout

Bytes: 177
Truncated: no
SHA-256: 4f639bf852181876ac517ccfc6f7a566a562caf9535da53b68380bee689d82ef

```text
Checked 146 files in 258ms. No fixes applied.
bun test v1.4.4 (38afee6c8)
[sonnet part2] exit none, 0s, FAILED: the runner failed: /tmp/panel-test.dOR2xD/key/key.md is missing.
```

## Stderr

Bytes: 969
Truncated: no
SHA-256: f16d0a322c3a76693aef4ad9d92c3ac58e908eeba676db3a3e9e5a7fa6e3b2c5

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
Received: 29886.312828

      at <anonymous> (/home/supadava/projects/demiurge/app/src/generate/generate.test.ts:1043:25)
(fail) generate (IndexedDB storage) > streaming 50 KB of markup on many lines in 4-character deltas stays fast [29975.78ms]

 974 pass
 1 fail
 174211 expect() calls
Ran 975 tests across 45 files. [67.01s]
error: script "check" exited with code 1
```
