---
created_at: "2026-11-05T00:50:24.530212011+00:00"
id: "worldcrafter-fax9"
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
    id: "worldcrafter-h1be"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-iyt9"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-qgom"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Update the skill for the changed tool"
updated_at: "2026-11-05T00:50:24.530212011+00:00"
---

## Goal

The skill tells an agent how to use the changed tool, while `craft.md` stays exactly as it was so both arms of the next comparison get the same craft advice.

## Done when

- `.agents/skills/story-sketch/SKILL.md` covers causes, `mentions`, superseded answers and deliberate gaps, with examples that echo neither Thukker nor any premise.
- `craft.md` is byte-identical to the first comparison's frozen copy (sha256 in /home/supadava/projects/demiurge-comparison/frozen/FROZEN.json).
- The CLI subprocess test covers the new commands end to end.
- A fresh headless session, sandboxed as in the comparison, given only the skill and a throwaway premise that is neither comparison premise, produces a story file that parses, uses at least one cause link and one `mentions` call, and a `model-gaps.md`. Its output isn't read for quality.
- `bun run check` passes.
