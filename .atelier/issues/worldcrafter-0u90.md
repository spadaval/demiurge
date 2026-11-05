---
created_at: "2026-11-05T14:15:00.701301092+00:00"
id: "worldcrafter-0u90"
issue_type: "task"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-lxmj"
    type: "discovered_from"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T14:37:29.910061358+00:00"
status: "done"
title: "Years as spans, counts at ranged events, output polish (Round 3 reading 5, 7, 9)"
updated_at: "2026-11-05T14:37:29.910061358+00:00"
---

## Goal

Let a writer place events at year precision and order them without inventing dates, and remove the remaining output noise.

## Done when

- A year position is its span, as months and days are: two events in one year can be ordered without a contradiction; span gives a range when an end has year precision.
- A count value at a ranged event says when it takes effect ('from 8 June'), or set-count can put it at the end.
- An existing contradiction isn't reprinted as new after an unrelated edit; a count at 0 gets no 'short of'; no redundant 'below the threshold at:' line; duration mismatches use the gap's own unit when that doesn't hide the mismatch (worldcrafter-5b6m).
- Old story files load and render unchanged where no year-precision ordering is involved; tests; --help; bun run check passes.

## Close Reason

Implementer report. Outcome: set-position takes a whole-number year as that year's span [Y, Y+1), as months, days and minutes already were, so two events in one year order without a contradiction; a fractional year stays a moment, and --end with a year still stops at that year's start (1950 --end 1960 is ten years, as before). Stored positions are untouched, so an older file's whole-year moments still read and order as before (re-placing an event makes it a span). span, and reader-order --before's how-long-before, give a range when either end is placed only by its year ('11.7 to 12.7 years'; 'in the same year, either way round'). A count value at an event longer than a day says when it takes effect ('8 to 18 June 1131, from 8 June 1131') in show count:, show event:, render and the counts section of reader-order --before; set-count's help says to give it an event placed at the end to have it there (chosen instead of a new --at-end flag). Polish: an edit no longer reprints a kept timeline problem whose message reads the same as one already there (and prints each once); a count at 0 gets no 'short of'; the 'below the threshold at:' line is gone from show count: and render (belowThreshold removed); duration mismatches say the amount in its own unit, whole where it is ('3 days give or take 12 hours ... 5 days', '2 weeks give or take 3.5 days'), the tolerance in its own unit, and the range in a smaller unit only where rounding would hide the mismatch or the range is smaller, with the amount converted beside it then ('1 year (12 months) give or take 1 day ... 12.4 months to 12.5 months'; finding worldcrafter-5b6m). Help (set-position, --end, span, set-count, top text) and three lines of the story-sketch skill updated, premise-neutral. Proof: calendar.test.ts (year parse, describeMismatch, yearRange, describeMoment) and two new story.test.ts cases (year ordering, span and reader-order ranges, --end year; count 'from', 0 without short of, a grown contradiction not reprinted); bun run check 1138 pass. Old files: render, contradictions, reader-order, list, gaps, every show and every reader-order --before, from HEAD and from this change, on the 32 comparison step files and the Round 1-3 final models (copied to scratch): 48 changed lines, all count lines from the polish (short of at 0, the dropped below-threshold lines, 'from' on month and multi-year events); no change to any position, span, contradiction or other output. Round 3 replay on phases/scene-2/work: set-position agathe-vow 1103, agathe-bound 1103, constrain vow-gap --gap 1d gives No contradictions (old: two problems); span birth sallowmarsh-razed with the razing at 1118 gives '11.8 to 12.8 years' (old: '4292 days, 11.8 years'), so neither 13-14 April 1103 nor June 1118 needs inventing. Surprise: an older file's agathe-bound, still a stored 1103 moment, still contradicts a vow placed at the new 1103 span until it is re-placed. Open: independent review outstanding; 'show event:' still prints a tolerance via describeYears ('gap 2 weeks ± 84 hours'), and --precision text still reads as if it placed the event (reading item 9 polish not in this issue).
