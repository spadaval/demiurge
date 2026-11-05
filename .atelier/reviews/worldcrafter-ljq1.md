---
schema: atelier.review
schema_version: 1
id: worldcrafter-ljq1
title: finding on worldcrafter-7coc @ed6456ac
target: worldcrafter-7coc
identity: round0-reviewer
commit: ed6456ac6fb683a9f4cc1780e25b8f9ff304b6ba
created_at: 2026-11-05T06:47:11.209610407Z
event:
  event: finding
  recommendation: no_action
---

low: app/src/story/commands.ts:509 the scene-ID file-name check refuses only /, \ and all-dot IDs while its message says 'use letters, digits and dashes' (IDs 'a b' and 'evil.md' are accepted), and story files loaded from disk skip it. Harmless: the IDs accepted still name a file under scenes/, and proseFile only reads. Noted so nobody relies on the message as the rule.
