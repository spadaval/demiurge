---
schema: atelier.review
schema_version: 1
id: worldcrafter-qogl
title: finding on worldcrafter-3fqq @456a2561
target: worldcrafter-3fqq
identity: round1-fix-reviewer
commit: 456a2561f5981ddd1b681559c219e4dfd3f2f9d4
created_at: 2026-11-05T10:17:25.509474774Z
event:
  event: finding
  recommendation: no_action
---

low: app/src/story/counts.ts countSeries/countProblems (w2hx 54d8e3e; covers b0la's otbw fix and w2hx). A value set at an unplaced, unordered event sorts first in the series (eventsInStoryOrder puts zero-predecessor events first) and is shown with no date and no mark that its place is unknown: set-count held loose 2000 shows 'event:loose ("Unplaced"): 2000 of 1000' at the top of show count:held and render. Its --of total is taken from that arbitrary position, and the direction check compares only adjacent values, so a constrained but unplaced value sitting between two placed ones could hide a fall between them. Above-total is still reported and the direction rule never fires falsely. Rare in practice (counts go at placed plot events), so no action now; if it bites, mark such values '(not placed)' and compare each value against the latest ordered earlier one rather than only its neighbour.
