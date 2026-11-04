---
schema: atelier.review
schema_version: 1
id: worldcrafter-7eyd
title: finding on worldcrafter-o8b7 @46176d74
target: worldcrafter-o8b7
identity: code-reviewer
commit: 46176d7450fbd118f880e2d3d34a7ac55c5eb932
created_at: 2026-11-04T20:45:48.309960383Z
event:
  event: finding
  recommendation: defer
---

low: app/src/story/commands.test.ts:675 the removeScene test removes 'found' (the reader question's answeredAt) but never a scene used as opensAt, so the opensAt clearing at app/src/story/commands.ts:547 is untested: mutating it to keep opensAt leaves all 103 story-command tests passing. Code is correct by reading. Suggested fix: also remove 'bar' in that test and expect the reader question to have no opensAt. Can ride along with worldcrafter-33qr.
