---
schema: atelier.review
schema_version: 1
id: worldcrafter-7vd3
title: finding on worldcrafter-ql1d @a77639c1
target: worldcrafter-ql1d
identity: rubric-reviewer
commit: a77639c1685a42e56e67438a90a279635051a8df
created_at: 2026-11-05T07:39:09.515411465Z
event:
  event: finding
  recommendation: defer
---

low: app/scripts/judging/grok.ts:31 --tools read_file doesn't limit what Grok is offered: the smoke transcript's available_commands lists read_file, search_tool and use_tool, and use_tool is a gateway that can invoke tools hidden behind it. The transcript check flags any call that isn't read_file and bwrap contains the rest, so a call fails the run rather than leaking, but toolsOffered is recorded and never checked. Fix: also pass --disallowed-tools search_tool,use_tool if the CLI accepts it, and fail (or warn) when toolsOffered holds anything besides GROK_TOOLS, with a test.
