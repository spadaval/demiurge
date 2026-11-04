---
schema: atelier.review
schema_version: 1
id: worldcrafter-e34x
title: finding on worldcrafter-z9qs @be337afb
target: worldcrafter-z9qs
identity: planning-reviewer
commit: be337afb60a800c74a5b665a5a5bb32a1332a7f5
created_at: 2026-11-04T23:10:26.110989134Z
event:
  event: finding
  recommendation: fix_now
---

R1 medium: aggregation is only defined for exactly three judges. docs/verdicts/comparison-rubric.md:76-79, docs/strategies/structure-first.md:201-210, worldcrafter-zybl:38-39 and worldcrafter-i2uz:35-37 say 'at least three judges' but the rule is 'the call at least two judges make; if all three differ, change'. With four judges a 2-2 keep/drop split satisfies 'at least two' for both calls, and with five a 2-2-1 split is undefined. Nothing says what happens if a judge's run fails or a judge breaks blind (replace, or proceed with fewer). Fix before the rubric freezes: fix the panel at exactly three (e.g. Opus, Sonnet 5.5, Fable 5.1, so two of three differ from the claude-opus-5-5 authoring model, app/scripts/comparison/comparison.ts:52), or define a plurality rule with tie -> change; and state that a failed or contaminated judge is replaced by a fresh one before aggregation.
