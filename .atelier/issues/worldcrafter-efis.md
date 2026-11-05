---
created_at: "2026-11-05T05:35:41.342106209+00:00"
id: "worldcrafter-efis"
issue_type: "feature"
labels:
- "story-model"
priority: "P1"
relationships:
  blocks: []
  children:
  - kind: "issue"
    id: "worldcrafter-9ecm"
  - kind: "issue"
    id: "worldcrafter-fhe0"
  - kind: "issue"
    id: "worldcrafter-fi68"
  - kind: "issue"
    id: "worldcrafter-i41m"
  - kind: "issue"
    id: "worldcrafter-i822"
  - kind: "issue"
    id: "worldcrafter-ikjp"
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
closed_at: "2026-11-05T06:27:31.020803864+00:00"
status: "superseded"
title: "Take a premise to a finished long story with plain notes, and find where it falls short"
updated_at: "2026-11-05T06:27:31.020803864+00:00"
---

## Goal

Fresh agent sessions, working in plain markdown notes with the same craft advice as the comparisons, take a fresh premise from nothing to a finished novella. Each drafting session sees the notes in full but may read only a fixed share of the draft, smaller than the draft, so the notes have to carry the story the way they would for a novel too long to re-read every session. A judging panel then reads the finished stories with their notes, says where each falls short, and says how much each shortfall costs the story. That ranked list decides whether an aid has anything to aim at (strategy `docs/strategies/notes-first.md`).

## Done when

The children deliver, in order of their `blocked_by` links:
1. **worldcrafter-fhe0 and worldcrafter-ikjp:** a sealed premise and the rubric.
2. **worldcrafter-9ecm:** the harness, with its read budget, reviewed, and one unjudged trial run.
3. **worldcrafter-fi68:** three long runs.
4. **worldcrafter-i822:** the panel.
5. **worldcrafter-i41m:** the decision on the next step.

Each child is independently reviewed. The increment closes when that decision is recorded. It closes with:
- a ranked list, with citations, of the shortfalls at least two judges name;
- that decision, which either names an aid aimed at the top shortfall, to be tested blind against plain notes (a change to `craft.md` counts as an aid), or closes the mission because nothing an aid could reach costs the story much.

The runs also have to show that the read budget held. If sessions read the whole draft every time, the result says nothing about notes carrying a story.

## Unknowns

- **Length and read budget.** A first guess is a novella of 20,000 to 30,000 words over ten or more drafting sessions. The read budget would be the notes in full plus up to about 5,000 words of draft per session, chosen by the session. The trial run in worldcrafter-9ecm settles both before the three runs.
- **Whether one premise is enough.** It is the first measure, not the last.

## Background

- **Earlier evidence.** The notes packets and the judges' Part 1 reports from both comparisons are in `docs/verdicts/comparison*/` and `/home/supadava/projects/demiurge-comparison{,-2}/packets/`. An independent reading for decision worldcrafter-03rp is recorded as a note on that decision. It found one or two stale-text slips per notes packet at sketch scale, and none of them decided a preference. The judges decided on motivation and scene quality.
- **Methods the judges praised in the notes sessions:** rejected alternatives with reasons, scratch files weighing candidates, and "why it should hold".
- **Where to start:** the harness is in `app/scripts/comparison/` (worldcrafter-04z5, worldcrafter-ac45), the panel runner in `app/scripts/judging/`, and the craft advice in `.agents/skills/story-sketch/craft.md`.
- **Panel procedure:** the "Reading one arm" case in the strategy's Verdicts section.

## Notes

- 2026-11-05 [note] 2026-11-05: deferred finding worldcrafter-z9wp (judge load): after the trial run in worldcrafter-9ecm, size-check what each judge must read (three novellas plus notes) and, if it doesn't fit comfortably, split the panel into one session per run plus a ranking session; carried in worldcrafter-i822's Done when.

## Close Reason

Superseded by Sumeet's direction of 2026-11-05, decision worldcrafter-jeue: head-to-head comparisons and the notes-first framing are dropped; the next mission is worldcrafter-gwx3. Work done is parked unmerged on feature/worldcrafter-efis (dcc1e0a).
