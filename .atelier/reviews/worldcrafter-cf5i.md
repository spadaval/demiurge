---
schema: atelier.review
schema_version: 1
id: worldcrafter-cf5i
title: finding on worldcrafter-o8b7 @8ee08cdd
target: worldcrafter-o8b7
identity: code-reviewer
commit: 8ee08cddeab6d68787594388e15093aa0054ce81
created_at: 2026-11-04T21:54:16.148241834Z
event:
  event: finding
  recommendation: defer
---

low: app/scripts/comparison/comparison.test.ts:1 the tests cover the transcript check, prompts and packet layout but not writePackets (one tool and one notes run per pair, random letters, no run ID or arm in any packet, key and failures behind key/), freeze's dirty and exists refusals, phase-b's refusal over an existing key or packets, or run refusing the held-back premise. The smoke test exercised writePackets once and the guards read correct, but they are the guarantees the freeze relies on. Add a writePackets test over fake key/raw run records, and unit tests for the guards (exported functions on a temp repo).
