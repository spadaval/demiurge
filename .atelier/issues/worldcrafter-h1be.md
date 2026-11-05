---
created_at: "2026-11-05T00:50:24.465371383+00:00"
id: "worldcrafter-h1be"
issue_type: "task"
labels:
- "story-model"
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-xgxp"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T01:33:59.079806558+00:00"
status: "done"
title: "Events can cause events"
updated_at: "2026-11-05T01:33:59.079806558+00:00"
---

## Goal

A team can record that one event happened because of another, and see when a change breaks the chain. Three of four model-gaps logs asked for this, and moving an event turned an effect into its cause with nothing to object.

## Done when

- A command records and removes `causes` from one event to another. It refuses unknown IDs, a self-cause and a duplicate; it keeps a cycle and reports it, since contradiction is material.
- `storyContradictions` reports an effect positioned strictly before its cause, and a cycle, without refusing either; a cause and effect at the same position aren't reported, since same-year ordering was the commonest false alarm in the logs; a test moves a cause after its effect and sees the contradiction, then moves it back and sees it leave.
- `whatThisTouches` follows causes in both directions, and from an event reaches what its effects reach one step on; a test shows it.
- The CLI has the commands, `render` says what happened because of what, and `--help` shows an example.
- `bun run check` passes.

## Notes

- 2026-11-04 [decision] Causes live on the story as a top-level causes list of {cause, effect} event IDs, not on the timeline's events, and the file leaves the key out when empty
  Reason: A cause says why, not when, so it stays out of src/time (no change there) and the timeline parser stays the app's. Leaving the empty list out keeps files written before causes byte for byte the same. 'Strictly before' uses compareEvents on the full chronology (positions and constraints), so same-position, overlapping or unordered pairs aren't reported. The CLI prints a cause problem only when an edit adds it, keyed by event IDs, like timeline problems. Further touches carry forward from a cause to its effects' direct links, not backward from an effect.

## Close Reason

Causes as a top-level story list {cause, effect}; add-cause/remove-cause (refuse unknown, self, duplicate; keep cycles). storyContradictions reports effect strictly before cause and cycles (same-position not reported); whatThisTouches follows causes both ways and one step through effects; render says 'because of'; gaps treat a cause link as woven in. Evidence worldcrafter-jiun. Choice: causes live on the story, not the timeline; removeEvent removes its causes.
