---
schema: atelier.review
schema_version: 1
id: worldcrafter-9cto
title: finding on worldcrafter-hqgq @0805b7a5
target: worldcrafter-hqgq
identity: code-reviewer
commit: 0805b7a5c60f73c9e697e6dc399f28bda05b9a5c
created_at: 2026-11-05T01:37:23.483857525Z
event:
  event: finding
  recommendation: defer
---

low (worldcrafter-h1be): app/src/story/render.ts:275 events at the same position render in ID order, so an effect can be listed above its cause: wreck and funeral both 1200, add-cause wreck funeral renders '**The funeral** (year 1200): ... Because of The wreck.' before '**The wreck**'. Not wrong (same-position isn't a contradiction by design) but reads backwards. Suggested: use causes as a tiebreak among events the chronology leaves unordered.
