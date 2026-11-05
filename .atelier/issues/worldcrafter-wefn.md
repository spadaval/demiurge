---
created_at: "2026-11-05T06:28:02.394770763+00:00"
id: "worldcrafter-wefn"
issue_type: "feature"
labels: []
workflow_branch:
  branch_base: master
  work_branch: feature/worldcrafter-wefn
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-gwx3"
    type: "advances"
  - kind: "issue"
    id: "worldcrafter-r26d"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T07:05:23.478368380+00:00"
status: "done"
title: "Make gap reports advisory"
updated_at: "2026-11-05T07:05:23.478368380+00:00"
---

## Goal

Gap reports are advisory and never push deletion. 'Actor with no drive is a gap' is dropped as pressure.

## Done when

- gaps output is framed as optional prompts; the actor-without-drive gap and any gap that would push removing true story are dropped or demoted.
- The skill says gaps are advisory and never a reason to delete.
- Tests; bun run check passes; independently reviewed and merged locally.

## Notes

- 2026-11-05 [note] From review finding worldcrafter-qr19: deliberate-gap marks of retired gap kinds (reader_question_never_answered, and any wefn retires) should be dropped on load, not refused (app/src/story/story.ts:188).

## Close Reason

Implementer report. Outcome: gap reports are advisory. The person_without_drive kind is gone (it pushed sessions to delete minor characters, comparison-2 log 40d78a42). gaps prints an advisory line above any gaps ('Optional prompts, not problems ... None is a reason to cut or merge anything true; a record can stay unlinked.'); event_unreferenced and fact_unconnected, the two kinds a rich world bible trips most and whose quickest clearing is deletion, now say 'Link it to what it bears on, if anything; it can also stand on its own.' Other kinds already ask for an addition and keep their wording. --help summary and group name reframed; SKILL.md says gaps are advisory and never a reason to cut, merge or unlink anything true, naming minor characters with no drive, unreferenced events and facts, and unopposed wants. Retired gap kinds (reader_question_never_answered from r26d, person_without_drive) are listed in RETIRED_GAP_KINDS (app/src/story/story.ts) and deliberate marks of them are dropped on load instead of refusing the file (finding qr19); comparison-2 d8577118/step-4 story.json, refused before, now loads. Deviations: none. Surprises: none. Open items: stale deliberate marks (a mark whose gap has since closed, raised in comparison-2) are still silent; not in scope. Review outstanding (orchestrator arranges).
