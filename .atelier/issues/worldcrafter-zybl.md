---
created_at: "2026-11-04T23:07:12.219240817+00:00"
id: "worldcrafter-zybl"
issue_type: "decision"
labels:
- "story-model"
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-45an"
    type: "related"
  - kind: "issue"
    id: "worldcrafter-i2uz"
    type: "related"
  - kind: "issue"
    id: "worldcrafter-z9qs"
    type: "advances"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-04T23:07:16.591278194+00:00"
status: "done"
title: "Agents judge verdicts; Sumeet keeps only irreversible and public calls"
updated_at: "2026-11-04T23:11:25.960817917+00:00"
---

## Question

Who decides keep, change or drop at the end of an increment, and what still has to wait for Sumeet? The strategy made Sumeet the verdict gate on the blind comparison (worldcrafter-i2uz) and on every increment, and reserved the success criteria, primitives, premises and similar calls for him.

## Decision

Decided by Sumeet (2026-11-04): he doesn't want to be the verdict gate on the blind comparison or on any increment. Verdicts come from an independent judging panel of agents instead, and everything else is decided by agents with independent agent review, with Sumeet reviewing after the fact.

- **Panel.** At least three fresh judges that didn't build the work and don't see the authors' reasoning, on at least two models (for example Opus, Sonnet and Fable). They are blind to which arm is which until each has filed a blind report, and they judge against a written rubric that is committed before any judge reads the material. Each judge records keep, change or drop with reasons.
- **Aggregation.** The verdict is the call that at least two judges make. If all three calls differ, the verdict is change, the reversible middle that keeps the work and names what to fix, and the dissent is recorded.
- **Records.** Each judge's report and the verdict go into Atelier as evidence on the verdict item, so Sumeet can read them later.
- **What stays with Sumeet.** Only irreversible or public calls: pushing, deploying or publishing; spending money, such as buying demiurge.ink; the product's name (worldcrafter-cogw); and destructive actions that git can't undo.
- **Everything else.** Success criteria, primitives, premises, rubrics and reopening decisions are now agent decisions. Each is recorded as a decision and independently reviewed before the work it governs proceeds.

Consequences: the strategy's Authority section, its success criteria `sketch`, `rework` and `on-screen`, its Shape, and a new Verdicts section change to match. worldcrafter-i2uz loses its needs-human label and is passed by the panel. The backlog increments end with the panel's verdict. This supersedes decision worldcrafter-45an's consequence that changing the web-app plan comes back to the human: it is now an agent decision, reviewed. Agent judges may share the authoring model's taste, so the strategy's Risks name the different-model judge, the fixed rubric and Sumeet's later review as the check.

## Notes

- 2026-11-04 [note] 2026-11-04, after planning review (findings worldcrafter-e34x, carf, bd5i, 0xvm): the panel is exactly three judges on Opus, Sonnet and Fable. Judges run as isolated sessions, reaching only their material and the rubric at a named commit, with their transcripts checked. Part 2 is a fresh session given the judge's own recorded Part 1. A judge that failed or was contaminated is replaced on the same model. The panel is the outcome's review; a fresh reviewer checks only that the procedure held before the next increment starts. The rubric's Part 1 no longer says which premise was tuned on.

## Close Reason

Verdicts come from an independent panel of at least three blind agent judges on at least two models, against a rubric fixed in advance, majority rule with change as the tie-break; Sumeet keeps only irreversible or public calls and reviews the rest after the fact (Sumeet's direction, 2026-11-04)
