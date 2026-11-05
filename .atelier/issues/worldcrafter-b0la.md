---
created_at: "2026-11-05T09:13:32.748475981+00:00"
id: "worldcrafter-b0la"
issue_type: "task"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-xzee"
    type: "discovered_from"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T09:53:36.342619978+00:00"
status: "done"
title: "Cut CLI noise and friction (Round 1 reading 1, 4, 6, 7, 8, 10)"
updated_at: "2026-11-05T09:54:22.680996301+00:00"
---

## Goal

Make the CLI quiet enough that a writer making a thousand calls never needs to filter its output.

## Done when

- No change-trace prints for add-* or an event's first set-position; inline traces after a real change are capped to a few lines with a count and the trace command to see all.
- gaps no longer lists fact-unconnected per fact (dropped or collapsed to one count line).
- render takes --section <name>; question sections are named after their states; the skill's words match.
- Date ranges and dates print as dates everywhere (render, reader-order, contradictions, edit output, show), never as fractional years (also finding worldcrafter-mdk6).
- set-scene-links can add or remove refs without retyping the list, and a set that drops refs says which.
- update-event works as an alias of describe-event (or the error suggests it).
- SKILL.md and --help match; tests; bun run check passes.

## Notes

- 2026-11-05 [note] Orchestrator accepts the deviation: add-drive-turn keeps its trace, since a turn changes an existing drive (one of Round 1's six real traces came from it); the Done when's 'add-*' meant record creation.

## Close Reason

Outcome: done in 397bde4 on feature/worldcrafter-3fqq. (1) Edits that succeed print nothing ('Saved.' is gone); anything printed is a kept timeline or cause problem, 'Also removed', dropped scene links, or a trace. No trace for add-* or an event's first set-position; inline traces show 3 suspects then '...run trace <ref> for all N'. (2) gaps no longer has fact-unconnected (retired like person-without-drive; old deliberate marks load and are dropped). (3) render --section <name,...> (names in --help; unknown name is a usage error; an asked-for empty section prints '(nothing yet)'). Question sections are 'Open questions: undecided / decided, not revealed yet / revealed / left open for the reader', undecided first; the decided line no longer ends 'Not revealed yet.' since the heading says it. (4) describeWhen (calendar.ts) says positions as dates: '1 to 3 November 612', 'September 618 to May 619', minutes with times; whole years stay 'year 1200 to 1210'. Used by render, reader-order, show, list event. Constraint gaps in show/list and inconsistent_duration messages (edit output and contradictions) are in units via describeYears, which now falls back to one decimal of the largest unit (mdk6 repro now prints '2 weeks give or take 84 hours ... -3 hours to 21 hours'). For that, the time engine's inconsistent_duration problem carries stated/between/unit fields. mentions looks for whole years of a date range. (5) set-scene-links --add/--remove (remove of an unlinked ref is a usage error); a plain set that drops refs prints 'Dropped from <scene> <how>: <refs> (--add adds without replacing the list)'. (6) update-event is an alias of describe-event (Spec.alias; help shows '(also update-event)'). (7) Help intro and SKILL.md updated to match. Proof: bun run check exit 0, 1104 pass. Replay of all 43 Round 1 outline Bash calls against a scratch dir via a logging STORY_CLI wrapper (final story.json byte-identical to round's work/ before and after): 984 edit calls printed 1,402 lines (every call printed) before, 14 lines from 4 calls after: two traces for events the writer re-placed with a range, the remove-drive-turn novelty trace the reading counts as real, and 'Dropped from smoke-at-pennyfold plants: object:penny' (the reading's possible silent drop). Fractional years in the round's story: render 4->0, reader-order 11->0, list event 52->0. Deviation: add-drive-turn still prints a trace, because adding a turn changes an existing drive (the reading lists 'add-drive-turn novelty flagged ledger-ruin' among the six real traces); Done when says no trace for add-*, so the orchestrator should confirm. Open items: independent review outstanding. render and reader-order length otherwise unchanged (reader-order --before is w2hx). Set-position precision text and non-year world units untouched.
