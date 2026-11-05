---
schema: atelier.review
schema_version: 1
id: worldcrafter-aaj0
title: finding on worldcrafter-i2uz @dd4d831c
target: worldcrafter-i2uz
identity: code-reviewer
commit: dd4d831c77611bb5ce16d4e8b84bbadae2a9b698
created_at: 2026-11-05T00:28:54.368028251Z
event:
  event: finding
  recommendation: defer
---

low: app/scripts/comparison/transcript.ts withoutFileHeredocs (CAT_HEREDOC_TO_FILE) strips a quoted cat heredoc's body wherever that line appears, even inside an outer context that does expand it. Probes through judgeTranscript give no finding for: "bash <<X\ncat > f <<'EOF'\n$(cat /etc/shadow)\nEOF\nX" (the outer unquoted heredoc expands the inner body) and an inner cat line inside a multi-line double-quoted echo string. The credentials pattern is hidden the same way. Both are deliberate evasion constructs, not something a judge writes by accident, and the sandbox, not this check, is what keeps the repo, key and other judges' files out of reach (they aren't mounted). Suggested: strip only when the cat line is at the top level, e.g. the command's first line, or only when nothing before it opens a heredoc or an unclosed quote; add the two probes as tests.
