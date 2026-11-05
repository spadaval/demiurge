---
schema: atelier.review
schema_version: 1
id: worldcrafter-9ocs
title: finding on worldcrafter-hqgq @0805b7a5
target: worldcrafter-hqgq
identity: code-reviewer
commit: 0805b7a5c60f73c9e697e6dc399f28bda05b9a5c
created_at: 2026-11-05T01:37:23.560150043Z
event:
  event: finding
  recommendation: no_action
---

low (worldcrafter-iyt9): app/scripts/story.ts:940 --help prints 'mark-gap-deliberate <gap> <ref> [--reason <text>]' with the required flag in optional brackets; the help text and the refusal ('a deliberate gap needs a reason') say it's required, so an agent recovers in one try. Could be a positional or unbracketed flag; not worth a change before the freeze unless the usage line is touched anyway.
