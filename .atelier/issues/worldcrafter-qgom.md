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
status: "in_progress"
title: "Reach what free text mentions"
updated_at: "2026-11-05T01:12:55.934842488+00:00"
---

## Goal

After a change, a team can find the summaries, stakes, wants, facts and candidates whose text still states the old version. Every model-gaps log found stale text by reading: a moved date ("twenty years ago"), a changed motive, a dead character's count.

## Done when

- A pure `whatMentions(story, ref)` lists the records whose free text mentions a record by name or label, and, for an event, by its year as written in the story. For an event it also lists, in the records connected to it (as `whatThisTouches` finds them), text that states a span or season ("twenty years ago", "three years dead", "months", "spring"), reported as "may state when this happened". Matching is plain and case-insensitive; it reports the field and the matching text. It never edits text.
- The CLI has `mentions <ref>`. After `set-position`, `describe-event`, `update-drive` or `update-actor`, the CLI prints the records whose text mentions the changed record, as a prompt, not an error.
- Tests over a fixture find a stale year, a stale relative time ("twenty years ago" in a summary connected to a moved event) and a stale motive, and show that an unrelated record isn't listed.
- `bun run check` passes.
