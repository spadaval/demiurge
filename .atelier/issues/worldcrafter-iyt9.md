---
created_at: "2026-11-05T00:50:24.508703985+00:00"
id: "worldcrafter-iyt9"
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
status: "in_progress"
title: "Keep answers' history, and let a gap be deliberate"
updated_at: "2026-11-05T01:33:24.282776056+00:00"
---

## Goal

A reworked answer keeps the old one on record, and a gap the team has judged fine stops being reported. Sessions deleted decided questions to save words, so the history lived only in git, and gap reports nagged about deliberate choices (a drive from temperament, with no origin event).

## Done when

- Changing a question's chosen answer keeps the old answer marked superseded, with what replaced it. `show` lists the history, and `render` doesn't. Unanswering keeps it too. Tests show both.
- A command marks one gap on one record as deliberate, with a reason, and `storyGaps` stops listing it; removing the mark brings it back. The mark lives in the story file.
- `bun run check` passes.

## Notes

- 2026-11-04 [decision] Answer history is a superseded list on the open question, oldest first, each entry {candidate, answer text, by?}; deliberate gaps are a top-level deliberateGaps list of {gap, ref or null, reason}, one per gap and record
  Reason: History on the question (not a mark on the candidate) survives a candidate being re-chosen, edited or removed, and keeping the answer's text means it still reads after the candidate changes. Removing the chosen candidate counts as unanswering, so it's kept too. Gap kinds moved to story.ts (GAP_KINDS, GAP_SUBJECTS) so the parser can check them without story.ts importing gaps.ts; a mark is refused for a missing record, a record of the wrong kind or a blank reason, and re-marking replaces the reason. A mark can be made before its gap appears. gaps still prints a one-line count of the marked gaps so they aren't invisible; storyGaps itself leaves them out. Both new fields are omitted when empty so older files read and write back byte for byte.
