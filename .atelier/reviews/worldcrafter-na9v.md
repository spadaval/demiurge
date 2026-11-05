---
schema: atelier.review
schema_version: 1
id: worldcrafter-na9v
title: finding on worldcrafter-i2uz @c5fea91e
target: worldcrafter-i2uz
identity: code-reviewer
commit: c5fea91ec84335b6db2b6460d10b2c154c24abd3
created_at: 2026-11-05T00:25:02.601565825Z
event:
  event: finding
  recommendation: defer
---

low: app/scripts/judging/panel.ts:570 persistedOutputs takes saved-output paths only from user tool_result events, but no test covers that: the mutant that drops the type check passes all 89 judging and comparison tests. Without the guard, a judge's own assistant text naming a path under its projects slug would allow that path. The impact is small because the allowance is limited to the session's own ~/.claude/projects/<slug>/ in the sandbox's fresh home and refuses '..'. Suggested: add a test where an assistant message names such a path and the read is still flagged.
