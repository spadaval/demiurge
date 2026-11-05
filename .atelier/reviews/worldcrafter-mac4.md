---
schema: atelier.review
schema_version: 1
id: worldcrafter-mac4
title: finding on worldcrafter-hqgq @765f93c1
target: worldcrafter-hqgq
identity: code-reviewer
commit: 765f93c18ea9c8e1ca055571598f03155e13cc29
created_at: 2026-11-05T01:45:43.241959459Z
event:
  event: finding
  recommendation: fix_now
---

low (worldcrafter-iyt9 doc, f699d12): docs/rebuild/story-model.md:99 'Deliberate gaps ... marked on its record with a reason' doesn't match the code: marks live in a top-level deliberateGaps list on the story (story.ts DeliberateGap), and a gap about the whole story (no_reader_question, ref null) can be marked too. 'gap report stops listing it' is right, though gaps still prints a one-line count. Suggested: 'kept on the story with the gap, the record it's about (or the whole story) and a reason'. One line; can ride with the fix above.
