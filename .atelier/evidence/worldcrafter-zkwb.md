---
created_at: "2026-11-05T04:11:21.232348969+00:00"
id: "worldcrafter-zkwb"
evidence_type: "test"
commit: "70b28a4cee7659342298ae5e4e0b23f7dd33a420"
result: "fail"
captured_at: "2026-11-05T04:10:18.364351744+00:00"
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
updated_at: "2026-11-05T04:11:21.232701475+00:00"
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
SHA-256: a8dc107e5f721b49776fcf2c1f44fcb899a0880d4fda06f8b0b917cce6cfea9d

```text
Checked 146 files in 249ms. No fixes applied.
bun test v1.4.4 (38afee6c8)
[sonnet part2] exit none, 0s, FAILED: the runner failed: /tmp/panel-test.6kCysi/key/key.md is missing.
```

## Stderr

Bytes: 968
Truncated: no
SHA-256: 2b587201aa8dc8eb38f72adfb3d18711cfcaf0f934044bfd3b88432fc572a235

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
Received: 15624.17828

      at <anonymous> (/home/supadava/projects/demiurge/app/src/generate/generate.test.ts:1043:25)
(fail) generate (IndexedDB storage) > streaming 50 KB of markup on many lines in 4-character deltas stays fast [15730.84ms]

 974 pass
 1 fail
 174211 expect() calls
Ran 975 tests across 45 files. [53.13s]
error: script "check" exited with code 1
```
