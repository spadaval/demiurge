---
schema: atelier.review
schema_version: 1
id: worldcrafter-p8h4
title: finding on worldcrafter-03rp @55ac9267
target: worldcrafter-03rp
identity: planning-reviewer
commit: 55ac9267c4e58856e7b6507a5bc18405c409f325
created_at: 2026-11-05T05:45:25.020800780Z
event:
  event: finding
  recommendation: defer
---

R10 low: the read budget can be bypassed through the notes. 9ecm (Done when) and notes-first.md Outcome give each session the notes in full and cap only draft reads, and 9ecm says the prompt won't suggest what goes in the notes. Nothing measures the notes, so a run whose sessions copy large parts of the draft, or a running full summary, into the notes gets around the budget, and 'notes are enough' comes back true by construction, which is what gqvm was fixing. Copying into notes is arguably what notes are for, so the fix is to measure it, not forbid it: in 9ecm, log the notes' size per session and their verbatim overlap with the draft, check it in the trial run, and say in fi68's handoff and the rubric how the panel should read a run whose notes became a second draft. Defer to 9ecm.
