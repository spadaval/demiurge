---
schema: atelier.review
schema_version: 1
id: worldcrafter-bzfo
title: finding on worldcrafter-3fqq @9afff1fd
target: worldcrafter-3fqq
identity: round1-fix-reviewer
commit: 9afff1fd99391e25a22b258c653c069bba59aa32
created_at: 2026-11-05T09:57:19.245373899Z
event:
  event: finding
  recommendation: no_action
---

low: app/scripts/story.ts:2619 Covers b0la only. droppedLinkLines also fires on a deliberate clear: set-scene-links storm plants none prints 'Dropped from storm plants: object:penny (--add adds without replacing the list)', while --remove, equally deliberate, is silent. One line, rare, and it does confirm what went, so no action needed; if touched again, skip the --add hint (or the line) when the refs are 'none'.
