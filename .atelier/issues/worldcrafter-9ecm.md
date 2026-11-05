---
created_at: "2026-11-05T05:44:05.215656852+00:00"
id: "worldcrafter-9ecm"
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
    id: "worldcrafter-fhe0"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-ikjp"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Extend the harness for long runs with a read budget, and try it once"
updated_at: "2026-11-05T05:44:05.215656852+00:00"
---

## Goal

The comparison harness runs a premise to a finished novella across many fresh sessions. Each session sees the notes in full but only a limited share of the draft, so the run tests notes carrying a story that no session re-reads whole.

## Done when

- `app/scripts/comparison/` (or a sibling script) can run a sketch session and then drafting sessions until the story is finished. Each session is a fresh `claude -p` that sees only the prompt, `craft.md` and what the run has saved: the notes and the draft.
- Each drafting session has a draft read budget smaller than the draft, chosen by the session from the parts it wants.
  - The harness enforces the budget where the sandbox allows.
  - It always measures, from the transcript, how many words of draft each session read, and reports any session over budget.
  - The prompt tells the session about the budget without suggesting what to put in the notes.
- The target length, the number of sessions and the budget are fixed in the change and recorded with the reason for each.
- The change is independently reviewed before any run.
- One trial run goes on a premise used before (Thukker), never the sealed one. It is not judged. Use it to settle the length, the budget and the cost, and to check that the budget measurement works. Record the numbers on worldcrafter-efis.
