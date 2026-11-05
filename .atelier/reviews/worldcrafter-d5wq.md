---
schema: atelier.review
schema_version: 1
id: worldcrafter-d5wq
title: finding on worldcrafter-ulpg @cbeb9305
target: worldcrafter-ulpg
identity: round1-fix-reviewer
commit: cbeb9305a087c0b5faacf6545ef7a0604b2b1a54
created_at: 2026-11-05T12:12:27.326125563Z
event:
  event: finding
  recommendation: defer
---

low: app/scripts/story.ts setCount build (note: a.text('note') ?? ""), from w2hx, bearing on vg6e. Covers uf0f and vg6e. Re-setting a value without --note silently erases the note stored at that event: set-count boats wreck 4 --note "four left after the wreck", then set-count boats wreck 5, and show count:boats has no note at wreck. A note the writer wrote is lost, and the stale-note case vg6e was built to catch can't arise because the note is gone. Fix when convenient: keep the existing note when --note is absent and let --note "" clear it, matching how other update commands treat absent flags.
