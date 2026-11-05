---
created_at: "2026-11-05T09:13:32.783897695+00:00"
id: "worldcrafter-w2hx"
issue_type: "task"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-b0la"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-xzee"
    type: "discovered_from"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T10:10:27.558783902+00:00"
status: "done"
title: "Counts over time, and what the reader knows before a scene (Round 1 reading 2, 3)"
updated_at: "2026-11-05T10:10:27.558783902+00:00"
---

## Goal

Let the model hold a quantity that changes at events and check it, and let a writer ask, before writing a scene, what the reader knows by then and how long ago things happened.

## Done when

- A count record with values set at events (and an optional total or threshold) is shown as a running series by show and render, and trace follows it; contradictions reports a value set at an event that conflicts with an earlier one only if the writer declared it monotonic (or another simple rule the implementer picks and documents).
- reader-order --before <scene> lists, in short labels (no full fact text repeated), what the reader has been told before that scene.
- show event: (or a small command) gives the time between two events in days or the natural unit.
- SKILL.md and --help; tests; bun run check passes.

## Close Reason

Outcome: done in 54d8e3e on feature/worldcrafter-3fqq. (1) Count record (src/story/counts.ts; Story.counts, ref kind count): add-count <id> <label> [--total n | --of <count>] [--threshold n|more-than-half] [--direction rises|falls] [--notes], update-count (none clears), remove-count, set-count <id> <event> <value|none> [--note]. A value holds from its event to the next in story order; --of makes another count's value at the time the total (the pact's 1000 then 992). show count:<id> and render (section counts, 'Counts, as they change') print the series with 'N of T, K short of more than half (M)' or 'reaching'; show event: lists counts set there; list count. trace follows a count via touches (its events; an event's counts; of) and mentions (its values as numbers, label, notes); a changed value prints the usual capped trace, a first value at an event prints none (like a first placement). Rules, documented in counts.ts, SKILL.md and --help: contradictions reports only a value above its total in effect, and with --direction a value moving the other way between two events story time orders; an edit that adds one prints 'Count problem (kept; see contradictions)'. remove-event takes the count's value at it (listed under Also removed); removing a count clears others' --of. (2) reader-order --before <scene>: each ref the earlier scenes showed, revealed, implied, planted or paid off, once, as ref plus a 60-character label, with its time and how long before the scene (anchored at the latest placed event the scene shows, since earlier ones are flashbacks), and 'Held back and not told yet'. (3) span <from-event> <to-event>: calendar days start to start ('27 days'), months or years beside spans past eight weeks, hours or minutes under a day, ', going back' if the second is earlier. eventsInStoryOrder moved from render.ts to src/story/order.ts to avoid an import cycle (render -> contradictions -> counts). Proof: bun run check exit 0, 1106 pass; new CLI tests for counts and for span/--before. Scene-4 replay on a copy of the round's final story.json (evidence worldcrafter-vhsj; transcript in the implementer's scratch): show count:ledger-parts prints '488 of 992, 9 short of more than half (497)' at ledger-calls, against the prose's 'eight more'; adding Twelve-Pence's 497 at twelve-pence-sells (28 May 23:00, before ledger-calls at 01:00) is reported as the count falling 497 -> 488, a real ordering slip in the round's model; span third-reading heist prints '27 days' against the prose's 'twenty-six days'; reader-order --before one-exact-act is 147 lines / 15 KB against 418 / 71 KB for the full reader-order, and lists the bakehouse as '28 days before' the scene's ledger-calls. Deviations: the time between events is a span command plus the 'N days before' in --before, not a field on show event. Open items: independent review outstanding. The 'before' anchor is a heuristic (latest shown event); a scene with no placed event gets no 'how long before'. Counts don't check thresholds or totals across counts beyond the two rules.
