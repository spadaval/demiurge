---
created_at: "2026-11-05T05:35:41.342106209+00:00"
id: "worldcrafter-efis"
issue_type: "feature"
labels:
- "story-model"
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-03rp"
    type: "derived_from"
  - kind: "issue"
    id: "worldcrafter-p3k7"
    type: "advances"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Take a premise to a finished long story with plain notes, and find where it falls short"
updated_at: "2026-11-05T05:35:41.342106209+00:00"
---

## Goal

Fresh agent sessions, working in plain markdown notes with the same craft advice as the comparisons, take a fresh premise from nothing to a finished story too long for any single session to hold. A judging panel then reads the finished stories with their notes, says where each falls short, and says how much each shortfall costs the story. That ranked list decides whether an aid has anything to aim at (strategy `docs/strategies/notes-first.md`).

## Done when

- A rubric, `docs/verdicts/long-run-rubric.md`, is committed and independently reviewed before any judge reads. For each story it asks, with citations:
  - where the story falls short as a finished story: dropped threads, setups with no payoff, contradictions, things the reader learns too early or too late, motivations that drift, scenes that don't turn, and anything else;
  - how much each shortfall costs the story;
  - whether the notes held what the drafting sessions needed, or whether sessions lost or contradicted what had been decided.
- A fresh premise is chosen by an agent that builds nothing here, and the choice is recorded as a decision. It must not be Thukker, magical girl therapist or premise-c.
- The harness in `app/scripts/comparison/` is extended for a long run, and the change is independently reviewed before any run. Three runs then go on claude-opus-5-5:
  - Each run works in its own temporary git repository, outside this one.
  - A run is a sketch session followed by drafting sessions until the story is finished. Each session is fresh and sees only the prompt, `craft.md` and what the run has saved so far.
  - The target length and number of sessions are fixed in the harness change, recorded before the runs, and the same for all three runs.
  - Failed runs aren't quietly rerun, and each transcript is checked for reads outside its run's directory.
- Three isolated judges (Opus, Sonnet and Fable) each read all three runs, following structure-first's Verdicts procedure (there is no key, since there is one arm). Their reports are recorded as evidence here, and a fresh reviewer checks that the procedure held.
- The item closes with two things:
  - a ranked list, with citations, of the shortfalls at least two judges name;
  - a decision record choosing the next step. Either it names an aid aimed at the top shortfall, to be tested blind against plain notes (a change to `craft.md` counts as an aid), or it closes the mission because nothing an aid could reach costs the story much.

## Unknowns

- **How long is long enough.** The length and number of sessions should make the notes carry the story without making three runs costly. A first guess is a novella of 20,000 to 30,000 words over ten or more drafting sessions. One unjudged trial run can settle it before the three runs.
- **Whether sessions may read the whole draft.** A real agent would read all of it, and that may be exactly why notes are enough. Forbidding it would test a situation that doesn't occur. Decide this in the harness change and record why.
- **Whether one premise is enough.** It is the first measure, not the last.

## Background

- **Earlier evidence.** The notes packets and the judges' Part 1 reports from both comparisons are in `docs/verdicts/comparison*/` and `/home/supadava/projects/demiurge-comparison{,-2}/packets/`. An independent reading for decision worldcrafter-03rp found one or two stale-text slips per notes packet at sketch scale, and none of them decided a preference. The judges decided on motivation and scene quality.
- **Methods the judges praised in the notes sessions:** rejected alternatives with reasons, scratch files weighing candidates, and "why it should hold".
- **Where to start:** the harness is in `app/scripts/comparison/` (worldcrafter-04z5, worldcrafter-ac45), the panel runner in `app/scripts/judging/`, and the craft advice in `.agents/skills/story-sketch/craft.md`.
