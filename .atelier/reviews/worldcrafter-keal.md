---
schema: atelier.review
schema_version: 1
id: worldcrafter-keal
title: finding on worldcrafter-i2uz @ba1230c5
target: worldcrafter-i2uz
identity: code-reviewer
commit: ba1230c5302a25e35ec56fca128ca194088b0f1f
created_at: 2026-11-05T00:54:59.327431905Z
event:
  event: finding
  recommendation: fix_now
---

Part 2 (planning), medium: .atelier/issues/worldcrafter-ac45.md:30 says the 04z5 harness is 'changed only to add the new premise', each change reviewed before the freeze. The harness holds premise text in the repo (app/scripts/comparison/prompts.ts:24-36, PREMISES), so adding it the same way commits the sealed premise before the freeze where builders and the public-repo push can see it. The change also has to drop magical-girl-therapist (runAll iterates every PREMISES entry, comparison.ts:786, so it would run 12 runs; the held-back premise is now seen by builders through the reports and model-gaps logs) and the 'thukker' guard (comparison.ts:816). Fix: say the harness reads the premise from the sealed file at run time after the freeze, replaces magical-girl-therapist rather than adding to it, and that the pre-freeze review sees the mechanism, not the text.
