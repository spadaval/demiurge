---
created_at: "2026-11-05T06:27:19.242448187+00:00"
id: "worldcrafter-jeue"
issue_type: "decision"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-03rp"
    type: "related"
  - kind: "issue"
    id: "worldcrafter-03rp"
    type: "supersedes"
  - kind: "issue"
    id: "worldcrafter-gwx3"
    type: "advances"
  - kind: "issue"
    id: "worldcrafter-p3k7"
    type: "supersedes"
  - kind: "issue"
    id: "worldcrafter-zybl"
    type: "related"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T06:27:37.696002680+00:00"
status: "done"
title: "Demonstrate the Demiurge-assisted process; drop head-to-head comparisons (Sumeet, 2026-11-05)"
updated_at: "2026-11-05T06:27:37.696002680+00:00"
---

## Question

Sumeet gave new direction on 2026-11-05 for the mission after worldcrafter-p3k7. What replaces the notes-first plan, and what happens to its work?

## Decision

Sumeet's decision (2026-11-05), recorded by the orchestrator. It replaces mission worldcrafter-p3k7's plan and reverses the part of decision worldcrafter-03rp that ended the typed-model tool.

- **Head-to-head comparisons are dropped.** In Sumeet's words: a short story is naturally better done in one shot, so a 1,500-word race against plain notes says little.
- **The last test mixed up the author's bible with the story.** Judges read the tool's `render` (drives, causes, "Decided" lists) as if it were the story, link text was taxed against a word budget, and gap reports pushed sessions to delete true story. On actual prose (the 800-word scenes) the result was split. Drives and open questions are author-side; nobody said they have to appear in the text.
- **Core thesis:** a rich, full world makes the story feel more alive.
- **This is a demonstration of the Demiurge-assisted process, not a comparative eval.** Judge only the final prose.
- **Plan:** Round 0 fixes the tool (six fixes, in order, each reviewed and merged locally), then up to five rounds on the warlock-and-"Chat" prompt. Each round has a fresh Opus 5.5 writer using the CLI and skill, which builds a world and a novel-scale outline and writes four scenes at points the orchestrator chooses. A separate agent writes a story so far for each scene, and a four-judge panel (Opus 5.5, Sonnet 5.5, Fable 5.1, Grok 4.7) scores each scene alone against a new rubric with world aliveness as its thesis criterion. Scores are per judge, never a pass/fail vote. The full direction is in `docs/strategies/world-demo.md`.
- **What happens to p3k7.** The mission, its head-to-head and notes-first framing, increment worldcrafter-efis and its children are superseded. The long-run harness work (worldcrafter-9ecm, with review findings worldcrafter-0kr4 and six others partly fixed) is parked unmerged on `feature/worldcrafter-efis` at dcc1e0a, with the sealed premise decision worldcrafter-ooxc and `docs/verdicts/long-run-rubric.md`. Parts may be reused; the branch is not merged. `/home/supadava/projects/demiurge-longrun/sealed/` stays sealed and unused.
- **Unchanged:** agents judge, under worldcrafter-zybl, with Sumeet reviewing after the fact; no `git push`; credentials read-only in sandboxes.

## Close Reason

Sumeet's direction of 2026-11-05: drop head-to-head comparisons; demonstrate the Demiurge-assisted process on the warlock-and-Chat prompt (Round 0 tool fixes, then up to five judged rounds, four judges, prose only). Supersedes mission worldcrafter-p3k7; opens worldcrafter-gwx3 (docs/strategies/world-demo.md).
