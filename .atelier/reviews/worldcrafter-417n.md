---
schema: atelier.review
schema_version: 1
id: worldcrafter-417n
title: finding on worldcrafter-s2mz @87093f72
target: worldcrafter-s2mz
identity: round0-reviewer
commit: 87093f723c888cfa56a358b3225708ebb5ee6c8e
created_at: 2026-11-05T08:14:47.005299199Z
event:
  event: finding
  recommendation: defer
---

low: app/src/story/trace.ts:71 (STOPWORDS, MIN_SHARED) shared-word matching counts common words as distinctive, so on-demand trace lists unrelated prose. trace event:hesse-killed on the same story flagged paragraphs from other stories' prose for 'call, stop', 'away, turn' and 'accident, stop' (lines in s-names, s-burglary, s-raid and s-armada), and a stray '14' in a quoted letter. In the edit prompt the top five were all relevant, so this is noise only in the full list. Suggest a longer stopword list or a minimum rarity per shared stem, once Round 1 shows how long trace lists get.
