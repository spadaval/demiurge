---
schema: atelier.item
schema_version: 3
id: worldcrafter-yxfp
title: 'span: day counts off by one between whole-day events'
status: approved
mission: worldcrafter-k7uh
labels:
- bug
priority: high
blocked_by: []
implementers:
- thread:delegated-task:command%3Amcp%3A19a62698-b51c-422f-9aec-662edcca5fd6%3Adelegate-task%3A663252c0-5f30-4eb4-8d89-e62f56318ba9
ready: null
trivial: null
caused_by: null
created_at: 2026-11-05T19:02:18.204538559Z
---

## Goal

span's day counts between whole-day events are often off by one (rounding error counting midnights in describeBetween, app/src/story/calendar.ts ~423), latent since Round 2: 17 of 144 wrong on Round 2's model, 47 of 186 on Round 3's, 0 of 193 on Round 4's, 39 of 119 on Round 5's (docs/rounds/round-5/reading.md, ranked item 1).

## Done when

- [x] - Round each moment to the whole minute (or count calendar dates) before counting midnights; a test with 30 October to 1 November 1187; the per-round counts above re-run show 0 wrong; every day count stated in Rounds 2-5's judged prose (docs/rounds/round-<n>/scenes/) is re-checked against the fixed span and any error listed; bun run check passes.

## Links

Relationships of the old record that the new format has no field for.

- related: worldcrafter-gwx3 (World first: demonstrate the Demiurge-assisted process on one premise)
- discovered_from: worldcrafter-hdly (Round 5)

## Report

Day counts from `span` and `reader-order` now match the calendar. `describeBetween` (`app/src/story/calendar.ts`) rounds each moment to the whole minute before counting midnights, so a midnight stored as a fraction of a year no longer floors into the day before.

**Test.** `describeBetween counts the calendar days between whole-day events` in `app/src/story/calendar.test.ts` checks 30 October to 1 November 1187 ("2 days", either way round), 14 to 16 October, 24 October to 1 November, 23:00 to 01:00 two days on, and every pair of midnights under 56 days apart over 1187 and 1188. It fails on the old code ("1 day") and passes on the new.

One existing test had the bug written into it. `app/scripts/story.test.ts` expected "12 October 1954, 7 days before" a scene on 20 October, and it now expects 8.

**Per-round counts re-run.** For each round I took the final `work/story.json` from `~/projects/demiurge-world/round-<n>/`, ran `reader-order --before` for the four judged scenes, and checked every "N days before/after" against the calendar date difference with a script. With each round's own `tool/story.js`, the counts match the reading exactly: 17 of 144, 47 of 186, 0 of 193 and 39 of 119 wrong. With the same bundle patched with this fix, and with the current `app/scripts/story.ts`, all four rounds show 0 wrong.

**Judged prose re-checked.** I searched Rounds 2 to 5's `docs/rounds/round-<n>/scenes/*.md` for stated times (N days, nights or weeks; yesterday, tomorrow, last night, the day before, a month). I tied each to the events it counts between, then ran `span` on those events with the old and the fixed tool. 30 counts tie to events, and all of them agree with the fixed span:

| Round, scene | Prose | Events | Fixed span |
|---|---|---|---|
| R2 s1 | "last night", "yesterday" | tallow-offer to sponsorship-surge | 29 to 30 October |
| R2 s3 | "back five days" | tollhouse-raid to corvin-returns | 5 days |
| R2 s3 | "Sixteen days ago" | corvin-confesses to corvin-returns | 16 days |
| R2 s4 | "last night" | corvin-returns to hesper-revealed | 1 day |
| R2 s4 | "nearly a month" (Cinder) | marsh-ambush to hesper-revealed | 27 days |
| R3 s1 | "eight days ago" | tide-wraith to spring-lists | 8 days |
| R3 s2 | "Tomorrow at noon" | agathe-reveals to vote-day | 1 day |
| R3 s2 | "Seven weeks ago" | tide-wraith to agathe-reveals | 51 days |
| R3 s2 | "three weeks ago" | agathe-plea to agathe-reveals | 21 days |
| R3 s2 | "ten days" (Ember) | truth-telling to agathe-reveals | 10 days |
| R3 s2 | "Two months" | crossroads to agathe-reveals | 64 days |
| R3 s3 | "Seven days old" | birth to fever | 7 days |
| R3 s3 | "the very next day" | tide-wraith to benefice-arrives | 12 to 13 April |
| R3 s4 | "ten days of walking" | recruitment to walking-ends | 10 days (old tool: 9) |
| R3 s4 | "seven days ago" | ember-posts-poll to ember-eve | 7 days |
| R4 s1 | "five days" | abery-thread to crane-ribbon | 5 days |
| R4 s1 | "yesterday" | amberley-visit to crane-ribbon | 1 day |
| R4 s1 | "Three in a fortnight" | hollow-gorrie to crane-ribbon | 13 days |
| R4 s1 | "four nights ago" | chat-history to crane-ribbon | 4 days |
| R4 s2 | "four nights in the hood" | the-hood to breakout | 4 days |
| R4 s2 | "Two nights ago" | greyhand-speaks to i-did-this | 2 days |
| R4 s3 | "three weeks" (the glove) | greyhand-speaks to chat-decides | 23 days |
| R4 s4 | "for a month" (the card) | wick-visit to hospice-dawn | 32 days |
| R4 s4 | "six weeks" | hollow-wick to hospice-dawn | 42 days |
| R5 s1 | "rested for a week" | orrin-bridge to wending-fair | 8 days (old: 7) |
| R5 s1 | "known him a month" | cistern-job to wending-fair | 30 days (old: 29) |
| R5 s2 | "the day before" | testament-found to window-closed | 1 day (old: 2) |
| R5 s3 | "twelve days" turning it over | window-closed to lampwick-confesses | 12 days |
| R5 s3 | "thirty-one" nights | barge-departs to lampwick-confesses | 31 days |
| R5 s3 | "Twelve days out of Saltcombe" | saltcombe-clerks to lampwick-confesses | 12 days |

The other matches ("three nights now", "two weeks ago" in R3 s1, "the weathervane two days ago", "for a week", "tonight", "tomorrow" with no event behind it) are not tied to any event in the model, so there is nothing to check them against.

**Errors.** No stated day count is wrong against the fixed span. In the four places where the old and fixed spans differ, the prose already agreed with the fixed one. One count is doubtful against the model, though not because of span. In R5 s25 "Twelve days out of Saltcombe" counts from the fight at Saltcombe (8 November), but `event:upriver`, the journey out, starts on 10 November, which is 10 days before. The scene's own summary also says twelve, so this is the outline's choice rather than a prose slip.

**Check.** `cd app && bun run check` passes: 1155 tests pass and none fail. Two earlier runs, at a load average of 24 to 32, failed only on story CLI tests that hit the 5-second timeout, apart from the test above. Run alone with `--timeout 60000`, `scripts/story.test.ts` passed 30 of 30. That timeout problem is the same kind as worldcrafter-08kf and is not part of this change.

