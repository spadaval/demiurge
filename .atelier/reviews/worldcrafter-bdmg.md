---
schema: atelier.review
schema_version: 1
id: worldcrafter-bdmg
title: finding on worldcrafter-i2uz @ba1230c5
target: worldcrafter-i2uz
identity: code-reviewer
commit: ba1230c5302a25e35ec56fca128ca194088b0f1f
created_at: 2026-11-05T00:54:59.828825068Z
event:
  event: finding
  recommendation: defer
---

Part 2 (planning), low: Done-when checkability. .atelier/issues/worldcrafter-xgxp.md:26 asks the render to refer to a drive 'by a short name', but a Drive has no name (app/src/story/story.ts:44-53: want, stakes, method) and render omits IDs, so the implementer must invent a label or add a field (a change to the primitives, which the strategy's Authority makes a recorded decision). xgxp.md:29 'at most a few words per link' has no number, so a reviewer can't fail it. ac45.md:32 doesn't ask for the Claude Code version (FROZEN.json records 2.1.318 for the first run), which the comparison needs to say whether only the tool changed. Fix: name how a drive is referred to (or add an Unknown), give a number, and add the CLI version to ac45's handoff.
