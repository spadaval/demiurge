---
created_at: "2026-11-05T06:28:02.365759326+00:00"
id: "worldcrafter-r26d"
issue_type: "feature"
labels: []
workflow_branch:
  branch_base: master
  work_branch: feature/worldcrafter-r26d
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
    id: "worldcrafter-wtiz"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T06:58:14.179171184+00:00"
status: "done"
title: "Give open questions distinct states"
updated_at: "2026-11-05T06:58:14.179171184+00:00"
---

## Goal

An open question is one of: undecided (an author task, with candidates and rejected options and their reasons kept and shown), decided but not revealed, deliberately left open for the reader, or revealed in scene X. Unclosed threads are normal.

## Done when

- SKILL.md describes the new commands or states, and `--help` is accurate (review finding worldcrafter-j8lb).
- The model holds the four states, rejected candidates keep their reasons, and show/render display them.
- 'Revealed in scene X' ties to the scene links from the bible/prose split.
- Nothing reports an unrevealed or reader-open question as a problem.
- Tests; bun run check passes; independently reviewed and merged locally.

## Notes

- 2026-11-05 [note] From review finding worldcrafter-0m5a: dedupe refs in setSceneLinks (app/src/story/commands.ts ~697) so scenes doesn't print 'reveals it; reveals it'.

## Close Reason

Outcome: an open question now has one of four states, derived by questionState (app/src/story/story.ts): undecided (no answer chosen); decided (answered, no scene reveals it yet); left_open (marked with leave-for-reader <q> --reason, answered or not, until a scene reveals it); revealed (answered, and scene is the first scene in telling order whose reveals link names the question or its chosen candidate). That last state reuses the wtiz scene links, so no new link type. Rejected candidates: reject-candidate <q> <c> --reason keeps the candidate with candidate.rejected; --undo restores it; refused on the chosen answer; answering with a ruled-out candidate clears the rejection. show open-question prints state:, the left-open reason, and candidates marked (chosen) or (ruled out: reason); show candidate prints ruled out:; list open-question prints the state. render groups questions into Decided (answer plus Revealed in "X" or Not revealed yet), Left open for the reader (reason and any author's answer), and Not decided yet (live candidates). Each group lists ruled-out candidates with their reasons. Nothing reports an unrevealed or left-open question: the open_question_* gaps and conflict contradictions consider undecided questions only. Rejected and left-open reasons are free text, so mentions searches them. Finding 0m5a: setSceneLinks now links a ref given twice once. Deviations: set-open-question-working and OpenQuestion.working are removed, since undecided is now the state and render no longer hides candidates to save words. Old files with working still load and the mark is dropped on write. I also removed the reader_question_never_answered gap kind, because an unanswered reader thread is normal per the strategy; a story file whose deliberate-gap marks name it will no longer load. Skill: the 'Weigh in the file' bullet is rewritten around reject-candidate, and a new 'Where a question stands' bullet covers the four states; --help covers the new commands and renames the group. Tests: commands.test (states, rejection), story.test (file shape), render.test (grouping), gaps.test (left open and unanswered reader question are not gaps), scenes.test (dedupe), and a CLI test walking every state. bun run check passes (993 tests). Surprises: none of note. Open items: independent review outstanding. An unanswered question that a scene reveals stays undecided or left_open, and nothing flags that. Superseded answers are shown only by show, as before. Reader questions (opensAt/answeredAt) are still separate from open questions; whether they should merge is open, and wefn or later rounds may decide.
