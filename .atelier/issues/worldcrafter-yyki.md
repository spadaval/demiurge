---
created_at: "2026-11-05T16:59:55.999424360+00:00"
id: "worldcrafter-yyki"
issue_type: "task"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-lsu3"
    type: "discovered_from"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T17:19:46.323413252+00:00"
status: "done"
title: "Trace and span polish; --add on scene lists (Round 4 reading 4, 5, 6)"
updated_at: "2026-11-05T17:20:07.768785762+00:00"
---

## Goal

Remove the last small frictions the reading found.

## Done when

- Traces leave out the old target of a changed knowledge record (matched against its own text). A record rewritten earlier in the same command line is left out only when its sole evidence is shared words; it stays when its text names the changed record or states its old year, value or a span (keeping review finding worldcrafter-gu8c's repro as a passing test).
- The --precision free text no longer prints as if it were the position (Round 4 reading item 9; finding worldcrafter-qs5e).
- span and reader-order give ranges for month-precision ends and year-range events, as single years do.
- set-scene-pressures, set-scene-actors and set-scene-events accept --add and --remove, as set-scene-links does.
- Tests; --help; bun run check passes.

## Notes

- 2026-11-05 [note] Orchestrator accepts the deviation: a same-line rewritten record is left out only when the earlier rewrite added words from the changed record's new text and shared words are its only evidence, so gu8c's repro keeps passing.

## Close Reason

Implementer report. Outcome: (1) Traces: a knowledge record's target, before or after the change, is never its own suspect (trace.ts). The batch list now also keeps each record an earlier edit in the command line rewrote, with the word stems that rewrite added; the inline trace leaves such a record out only when those added words include words of the changed record's new text (it was rewritten with the change in mind) and its only evidence is shared words (no quoted name, year, value or span). gu8c's repro (a fact rewritten for another reason) still lists it and stays a passing test; a new case (rewritten with the new version's words) leaves it out. This is narrower than 'rewritten earlier, sole evidence shared words', which would have failed gu8c's repro: there too the only evidence is shared words. (2) --precision text is shown quoted after the position ('May 201, noted "late spring"') in render, show, list, span and reader-order; its help says it doesn't change the position. (3) span and reader-order --before give a range when either end lasts a month or more (a month, a year, a range of them; isCoarse in calendar.ts, renamed yearRange/describeYearRange to spanRange/describeSpanRange); shorter ranges stay start to start; the note reads '(an event placed by its month or year may be any part of it)', and the both-ways case 'either way round'. (4) set-scene-actors, set-scene-events and set-scene-pressures take --add and --remove, sharing set-scene-links' list logic (editList), with the same errors. Proof: Round 4 replay of every Bash and Write call of all five phases, CLI called directly, before (82b739f) 4 blocks with 6 suspects, after 3 blocks with 4: hollow-wick under cas-suspects-ribbon and rite under chat-decides are gone; the real sixth-drained ('buri, step') and s35-city-sees remain. On the final model: span greyhand-joins i-did-this '4.4 to 5.3 months' (was '162 days, 5.3 months'); span pip-imagined i-did-this '10.7 to 15.7 years' (was '5730 days, 15.7 years (start to start)'); reader-order before s36 'reliquary-begun at May 201, noted "late spring", 4.1 to 5.1 months before' (was 'at May 201, late spring, 154 days, 5.1 months before'). Tests: trace.test.ts (knowledge target; fails on the old trace.ts), story.test.ts (month and year-range spans, quoted precision, --add/--remove on the three lists with errors, the rewritten-to-match batch case beside gu8c's). --help updated. bun run check 1151 pass. Open: independent review outstanding; the story-sketch skill doesn't mention --add on the other scene lists or month ranges (skill out of this task's scope).
