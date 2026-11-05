---
created_at: "2026-11-05T00:50:24.486855565+00:00"
id: "worldcrafter-qgom"
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
closed_at: "2026-11-05T01:33:59.175210035+00:00"
status: "done"
title: "Reach what free text mentions"
updated_at: "2026-11-05T01:33:59.175210035+00:00"
---

## Goal

After a change, a team can find the summaries, stakes, wants, facts and candidates whose text still states the old version. Every model-gaps log found stale text by reading: a moved date ("twenty years ago"), a changed motive, a dead character's count.

## Done when

- A pure `whatMentions(story, ref)` lists the records whose free text mentions a record by name or label, and, for an event, by its year as written in the story. For an event it also lists, in the records connected to it (as `whatThisTouches` finds them), text that states a span or season ("twenty years ago", "three years dead", "months", "spring"), reported as "may state when this happened". Matching is plain and case-insensitive; it reports the field and the matching text. It never edits text.
- The CLI has `mentions <ref>`. After `set-position`, `describe-event`, `update-drive` or `update-actor`, the CLI prints the records whose text mentions the changed record, as a prompt, not an error.
- Tests over a fixture find a stale year, a stale relative time ("twenty years ago" in a summary connected to a moved event) and a stale motive, and show that an unrelated record isn't listed.
- `bun run check` passes.

## Notes

- 2026-11-04 [decision] whatMentions takes the story before a change (was) for the names and years it looks for, and the CLI prompt after set-position, describe-event, update-drive and update-actor passes it
  Reason: Stale text states the old year, label or want, so searching for the new values would miss exactly what the issue asks for. A drive's text is reached through its holder's name as well as its want, since text states a motive in its own words (the stale-motive case). Spans and seasons are looked for in the event's own text and in what whatThisTouches reaches (direct and one step further), not the whole story, so an unrelated 'spring' isn't listed. The premise isn't a record and isn't searched. Matching is whole words, case-insensitive, with years as whole numbers, to keep 'Al' out of 'also' and 1203 out of 12030; it still lists coincidences, and it reads as a prompt.

## Close Reason

whatMentions(story, ref, was?) in mentions.ts: names/labels (and a drive's holder), an event's year as a whole number, and spans/seasons in the event's own and connected records' text, as 'may state when this happened'. CLI mentions <ref>, and after set-position, describe-event, update-drive and update-actor a prompt listing text that states the old values. Never edits text. Evidence worldcrafter-30o0. Premise not searched; the prompt may be chatty.
