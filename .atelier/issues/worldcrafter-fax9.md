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
status: "in_progress"
title: "Update the skill for the changed tool"
updated_at: "2026-11-05T02:12:23.513977477+00:00"
---

## Goal

The skill tells an agent how to use the changed tool, while `craft.md` stays exactly as it was so both arms of the next comparison get the same craft advice.

## Done when

- `.agents/skills/story-sketch/SKILL.md` covers causes, `mentions`, superseded answers and deliberate gaps, with examples that echo neither Thukker nor any premise.
- `craft.md` is byte-identical to the first comparison's frozen copy (sha256 in /home/supadava/projects/demiurge-comparison/frozen/FROZEN.json).
- The CLI subprocess test covers the new commands end to end.
- A fresh headless session, sandboxed as in the comparison, given only the skill and a throwaway premise that is neither comparison premise, produces a story file that parses, uses at least one cause link and one `mentions` call, and a `model-gaps.md`. Its output isn't read for quality.
- `bun run check` passes.

## Notes

- 2026-11-04 [note] From review finding worldcrafter-f5m4: SKILL.md must also cover set-open-question-working (weigh candidates in the file without spending render words), and the CLI help should say it's refused on an answered question.
- 2026-11-04 [note] Fresh-session check: `cd app && bun scripts/comparison/comparison.ts skill-check /home/supadava/projects/demiurge-comparison/smoke/fax9-skill "A beekeeper in a mountain village finds her hives robbed at night, and the thief turns out to be someone she owes a debt to."` ran step 1 of the tool arm once, sandboxed as in the comparison, in 227s (18 turns, $0.80). All mechanical checks held (check.json): exit 0, story.json parses, 9 causes, 1 mentions call (`$S mentions actor:ruben`), model-gaps.md present, nothing outside, only claude-opus-5-5. It also used set-open-question-working 4 times. Not read for quality. Two earlier bun run check runs failed only on the generate "stays fast" timing tests while the host load was ~20 (qemu, ffmpeg); a rerun passed (worldcrafter-p3rr).
