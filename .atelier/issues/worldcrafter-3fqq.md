---
created_at: "2026-11-05T09:13:32.711437369+00:00"
id: "worldcrafter-3fqq"
issue_type: "feature"
labels: []
workflow_branch:
  branch_base: master
  work_branch: feature/worldcrafter-3fqq
priority: "P1"
relationships:
  blocks: []
  children:
  - kind: "issue"
    id: "worldcrafter-1h0r"
  - kind: "issue"
    id: "worldcrafter-b0la"
  - kind: "issue"
    id: "worldcrafter-te8t"
  - kind: "issue"
    id: "worldcrafter-w2hx"
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-gwx3"
    type: "advances"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T10:24:42.731802745+00:00"
status: "done"
title: "Round 1 fixes: tool and skill, from the writer's transcript"
updated_at: "2026-11-05T10:24:42.731802745+00:00"
---

## Goal

Fix what the Round 1 reading (/home/supadava/projects/demiurge-world/round-1/reading.md) showed: the writer silenced the CLI because of trace noise, made count and day-span errors the model couldn't catch, didn't consult what the reader knows before writing a scene, and linked ritually to clear gaps. Don't gold-plate.

## Done when

- All four children (b0la, w2hx, 1h0r, te8t) are closed, each independently reviewed, and merged into local master before Round 2 starts.

## Notes

- 2026-11-05 [note] Deferred from the Round 1 reading (finding worldcrafter-mrwc): the tool half of issue 5 (point of view, presence and place; group membership over time) and issue 12 (defeated drives, recognitions, rules deciding events, quoted lines, object holders, parallel time, how knowledge was gained). Model additions, not fixes to what broke; Round 2's reading (worldcrafter-5pks) checks whether they recur.

## Close Reason

Round 1 fixes done and reviewed (round1-fix-reviewer, approval kv29): b0la quiet CLI (Round 1 outline replay 1,402 -> 14 lines), dates everywhere, render --section, set-scene-links --add/--remove, update-event; w2hx counts over time, span, reader-order --before; te8t choose-random --range; 1h0r skill guidance; h5rz removed Round 1 story words from writer-facing text. 5b6m deferred to Round 2's reading.
