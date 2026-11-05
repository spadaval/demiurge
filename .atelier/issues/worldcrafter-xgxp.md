---
created_at: "2026-11-05T00:50:24.443713507+00:00"
id: "worldcrafter-xgxp"
issue_type: "task"
labels:
- "story-model"
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates: []
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T01:06:23.357204964+00:00"
status: "done"
title: "Render the story, not the links"
updated_at: "2026-11-05T01:11:09.122132038+00:00"
---

## Goal

The readable form says each thing once, so a sketch's length measures the story and not its links. The first comparison's sessions deleted true links, settled questions and rejected candidates to fit about 1,500 words because the render reprinted them.

## Done when

- `renderStory` prints each drive's want once, under its actor. Elsewhere it refers to a drive by its actor's name and the want's first words, at most eight, not by quoting the want again. A relation is printed once, not under both drives.
- An open question's candidates print one short line each, without their `touches`. A command marks an open question as working, and the render leaves a working question and its candidates out, so candidates can be weighed in the file without costing words (the held-back run that weighed options "in my head" did it to save words).
- A constraint that the events' positions already satisfy isn't printed. One that positions don't settle, or that is violated, still is.
- A decided question prints only its chosen answer; rejected candidates and superseded answers stay in the file and out of the render.
- A test over a fixture with many links shows that adding the links, relations and satisfied constraints adds at most eight words per link; another shows a violated constraint still shows; `render`'s word count reflects the result.
- `bun run check` passes.

## Notes

- 2026-11-04 [note] From review finding worldcrafter-4i9o: a working question must still show in the render as one line (the question, and that it's being weighed), so the judges can see alternatives were weighed; only its candidates drop out.
- 2026-11-04 [decision] A gap constraint counts as satisfied by positions when, for two events placed with equal precision, their starts are the stated amount apart (give or take its tolerance, default half a unit); otherwise every gap the positions allow must fit. Order (before/after/during/simultaneous) counts as satisfied only when positions alone, with every constraint and placement removed, entail it
  Reason: Year positions are half-open spans, so the engine's own gap range for 1203 and 1213 is 9 to 11 and never 'settles' ten years strictly; writers mean year arithmetic. Checking against positions only, not other constraints, keeps two constraints that imply each other from both disappearing
  Rejected: Hide any constraint the engine reports no inconsistency for: it hides gaps that wide positions don't settle
  Rejected: Hide constraints implied by the rest of the chronology: mutually implied constraints would both vanish
- 2026-11-04 [decision] Elsewhere than under its actor, a drive is named by its actor and the first five words of its want, growing to at most eight until it differs from that actor's other wants; a decided question prints as one line, question then chosen answer, without what it concerns
  Reason: Five words keep a relation (verb + name + want words) within the eight-words-per-link budget while staying readable; eight would make a relation cost up to eleven. The question stays so the answer has meaning
  Rejected: Always eight words
  Rejected: Actor name alone when the actor has one drive (the Done when asks for the want's first words)
- 2026-11-04 [decision] Amends the gap-constraint decision: the start-difference rule applies only when both spans are at most one unit long (points or whole years); otherwise every gap the positions allow must fit
  Reason: Review finding worldcrafter-x38u: equal multi-year spans (1200-1210, 1220-1230) allow gaps of 10 to 30, so their start difference doesn't settle a stated gap

## Close Reason

Render says each thing once: a want in full once under its actor, elsewhere actor plus the want's first 5-8 words; a relation once; candidates one line without touches; a working question (new OpenQuestion.working, command setOpenQuestionWorking, CLI set-open-question-working [--stop]) shows as one line with no candidates (per note from 4i9o); constraints the positions satisfy are left out, unsettled or violated ones printed; decided questions one line. On a 58-link fixture links add 221 words instead of 469 (3.8 per link). bun run check 879 pass (evidence worldcrafter-x40c). Choices: gap constraints count as settled only for equal-precision exact spacing; 'during' rarely omitted; mentions of facts/questions cut to 8 words; decided questions don't show what they concern. Open: positions still render wordily; answering doesn't clear the working mark.
