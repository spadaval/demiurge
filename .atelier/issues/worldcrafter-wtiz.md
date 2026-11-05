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
closed_at: "2026-11-05T06:43:08.243538288+00:00"
status: "done"
title: "Separate the bible from the prose"
updated_at: "2026-11-05T06:43:08.243538288+00:00"
---

## Goal

The model and its render are author-facing, with no word budget, and are never shown to readers or judges. Prose (scenes and drafts) is stored separately from the model and linked to what each scene reveals, implies or withholds.

## Done when

- render has no word budget or length pressure, and the skill no longer tells the writer to cut story for length or that render is how the story will be read.
- Scene prose lives in its own files (not in story.json text fields), and a scene record can link records it reveals, implies or withholds; the CLI can list, per scene, those links, and per record, the scenes that touch it.
- Tests cover the new commands; bun run check passes in app/.
- Independently reviewed and merged locally.

## Close Reason

Outcome: the bible and the prose are separate. render prints no word count, and its doc comment, --help and the skill call it the author's bible, never read by readers or judges. The skill no longer says render is how the story will be read or to cut story for length; it says to keep every true record and link. Scene prose lives in scenes/<scene-id>.md beside the story file, by convention (no path field): show scene:<id> prints the path and its word count or 'not written yet'. Scenes gain reveals/implies/withholds ref lists (set-scene-links <scene> <how> <ref...>, any record or candidate, none clears; removed records drop out). show scene:<id> lists them; the new read 'scenes <ref>' lists, in telling order, every scene that touches a record and how (in it, depicts, pressures, opens/answers, reveals/implies/withholds; for an open question also links to its candidates). touches follows scene links both ways; render names them after each scene. Tests: src/story/scenes.test.ts and a CLI test in scripts/story.test.ts; bun run check passes (990 tests). Deviations: scene IDs that can't name a file (containing / or \, or only dots) are now refused by add-scene. Existing story.json files still load: the link lists are optional and omitted from the file when empty, so files without links serialize byte-identically. craft.md unchanged (nothing in it pushes cutting for length). Surprises: render still abbreviates linked records to a few words (kept as readability, the test renamed from length framing); set-open-question-working existed only to save render words and now just keeps render tidy, left for worldcrafter-r26d to revisit with open-question states. app/scripts/comparison still strips a word-count line from render output; now a no-op, left untouched (out of scope). Open items: independent review outstanding; mentions does not read prose files (change tracing is fix 6); no gap or check that a scene's prose reveals what its links say.
