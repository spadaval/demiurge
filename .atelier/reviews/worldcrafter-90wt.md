---
schema: atelier.review
schema_version: 1
id: worldcrafter-90wt
title: finding on worldcrafter-o8b7 @287d51e5
target: worldcrafter-o8b7
identity: code-reviewer
commit: 287d51e5051ef14e74b916c3198e6cce16bb9b9b
created_at: 2026-11-04T21:20:11.426384122Z
event:
  event: finding
  recommendation: fix_now
---

low: app/scripts/story.ts:515-521 set-drive-origins help says "(none clears them)" but build passes rest() unfiltered, so `set-drive-origins map none` fails with "event none does not exist" (exit 1); only giving no event IDs clears. A fresh agent following --help on a frozen tool hits a refusal whose message does not hint at the fix. Fix: map a lone "none" to [] (as set-position/update-drive do), or change the help to say "no event IDs clears them"; add a CLI test.
