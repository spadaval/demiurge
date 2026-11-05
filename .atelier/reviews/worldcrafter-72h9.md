---
schema: atelier.review
schema_version: 1
id: worldcrafter-72h9
title: finding on worldcrafter-qmq0 @ae24b9ae
target: worldcrafter-qmq0
identity: round1-fix-reviewer
commit: ae24b9aeb2743abf03f589c4348bb7172e58c795
created_at: 2026-11-05T17:22:01.437421171Z
event:
  event: finding
  recommendation: defer
---

low: .agents/skills/story-sketch/SKILL.md (b0pg, yyki). Covers 7b2r, b0pg and yyki. The skill now lags the CLI the writer will use: its viewpoint paragraph describes the o0s0 rule (own records, taking part, telling, own viewpoint scenes), not b0pg's (own-scene implies and pays off, presence in others' scenes); it says nothing of --add/--remove on set-scene-actors, -events and -pressures, of month and year-range spans, of the counts section's opening values and changes, or of --precision being a quoted note. Both implementers flagged it as out of scope. Do it in the next skill pass, before Round 5's writer reads it, together with whatever the viewpoint fix above settles. 7b2r fixes in e46b5bc checked: withPhaseGuard covers whole phases (outline, scenes, so-far, including between a story so far's reply and revision, with its temp dirs in live.cleanup), probe() refuses and stops its sessions, and sandboxedSessions counts only this user's sessions, once each (the outermost timeout); tests cover the between-sessions signal and the other-uid case. yyki checked: --add/--remove on the three lists with the same errors, '4.7 to 5.7 months' for a month end, '20 September 1954, noted "late summer"', gu8c's repro still a passing test.
