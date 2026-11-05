---
created_at: "2026-11-05T06:28:02.336250231+00:00"
id: "worldcrafter-wtiz"
issue_type: "task"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-b37f"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Separate the bible from the prose"
updated_at: "2026-11-05T06:28:02.336250231+00:00"
---

## Goal

The model and its render are author-facing, with no word budget, and are never shown to readers or judges. Prose (scenes and drafts) is stored separately from the model and linked to what each scene reveals, implies or withholds.

## Done when

- render has no word budget or length pressure, and the skill no longer tells the writer to cut story for length or that render is how the story will be read.
- Scene prose lives in its own files (not in story.json text fields), and a scene record can link records it reveals, implies or withholds; the CLI can list, per scene, those links, and per record, the scenes that touch it.
- Tests cover the new commands; bun run check passes in app/.
- Independently reviewed and merged locally.
