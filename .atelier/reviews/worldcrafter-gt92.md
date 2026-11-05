---
schema: atelier.review
schema_version: 1
id: worldcrafter-gt92
title: finding on worldcrafter-hqgq @152f480b
target: worldcrafter-hqgq
identity: code-reviewer
commit: 152f480bb097d11aa2828b8f52232b961e14fe02
created_at: 2026-11-05T01:09:44.006209826Z
event:
  event: finding
  recommendation: defer
---

low: app/src/story/commands.ts:741 Answering a question keeps its working mark (CLI: set-open-question-working on an answered question also succeeds), so unanswering it later renders it as '(being weighed)' with its candidates hidden, which the writer didn't ask for. Clear the mark on answer, or decide it with iyt9's answer-history work.
