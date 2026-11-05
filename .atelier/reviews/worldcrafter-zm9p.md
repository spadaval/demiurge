---
schema: atelier.review
schema_version: 1
id: worldcrafter-zm9p
title: finding on worldcrafter-ql1d @108f50b0
target: worldcrafter-ql1d
identity: rubric-reviewer
commit: 108f50b0c5a759fd02fa9443d123fca3b6ffe209
created_at: 2026-11-05T08:21:20.986223451Z
event:
  event: finding
  recommendation: no_action
---

low: app/scripts/round/round.ts:1006 The story-so-far agent gets the beats before its scene as they stand after every scene session, and the scene prompt invites the writer to update the story file after each scene. So a summary of an earlier beat can be revised with knowledge of later events (the smoke's beat 2 already says 'Ines doesn't hear it; the reader does'). The so-far prompt says to hold to the outline and not guess ahead, and the beats themselves are strictly before the scene, so this is acceptable; noted so the round log can say which state of the outline each story so far used (snapshotting story.json at outline time is the alternative).
