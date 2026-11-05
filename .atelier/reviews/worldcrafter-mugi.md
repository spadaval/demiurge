---
schema: atelier.review
schema_version: 1
id: worldcrafter-mugi
title: finding on worldcrafter-ulpg @65119a7c
target: worldcrafter-ulpg
identity: round1-fix-reviewer
commit: 65119a7c054784c7c11af9e6a87249460670ff85
created_at: 2026-11-05T12:26:10.215999269Z
event:
  event: finding
  recommendation: defer
---

low: app/scripts/story.ts setCount (d5wq fix 667ff88) with staleTextLines. Covers uf0f, vg6e, zevg, ktfa. Now that set-count keeps the note at an event, the kept note can state the old value, and the trace never says so because a record's own text isn't a suspect: set-count b wreck 4 --note "four left", then set-count b wreck 5 prints nothing, and show count:b shows '5 of 20 (four left)'. Small and visible in show, so defer; if it recurs, when set-count changes a value and keeps a note that states the old value (the same figures/words match the trace uses), print one line such as 'Kept the note at wreck: "four left" (--note replaces it)'.
