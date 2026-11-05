---
created_at: "2026-11-05T11:33:23.493718906+00:00"
id: "worldcrafter-dgkx"
issue_type: "decision"
labels: []
priority: "P2"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-gwx3"
    type: "advances"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T11:33:23.569430789+00:00"
status: "done"
title: "Add a minimal scene viewpoint and group membership after Round 2"
updated_at: "2026-11-05T14:15:00.582895055+00:00"
---

## Question

Round 1's reading deferred point of view, presence and group membership as model additions. Round 2's reading found them recurring (two POV and dramatic-irony entries, three membership entries) and central to its plot. Add them now, or keep deferring?

## Decision

Add a minimal version now: a scene's viewpoint actor, which reader-order --before uses to mark what the reader has been told that the viewpoint character doesn't know; and group membership with since/until (or joins/leaves participant roles that show actor: and the group's show list). Keep quoted lines, the two-identity alias, defeated drives, recognitions, rules deciding events, object holders and how knowledge was gained deferred until a round shows them costing the story. Reason: they recurred in both rounds, the cost is small, and Sumeet's direction is to let the rounds show what matters. Reversible: if Round 3's writer ignores them, they can be dropped. Agents' decision under worldcrafter-zybl; Sumeet reviews after.

## Notes

- 2026-11-05 [note] Clarifications (finding worldcrafter-w2l1): (1) Presence in a scene, which recurred in Round 2 as 'who is conspicuously quiet', stays deferred with the others. (2) The criterion: a gap is added when it recurred in both rounds and has cost the story at least once; membership did (Round 1's Brindle sale on two clocks), and viewpoint recurred as the engine of Round 2's middle act, with dramatic irony unheld. The rest wait for a story cost. (3) 'Small' means the minimal form in worldcrafter-ktfa: one viewpoint field and membership since/until, not the full model the reading's 'larger model change' described.
- 2026-11-05 [note] After Round 3 (docs/rounds/round-3/reading.md section 5): quoted lines now meet the criterion weakly (one line placed at the wrong scene). The orchestrator takes the cheaper reversible step, a skill line to check earlier scenes before reusing a line, rather than a quoted-line record; if Round 4 shows another cost, add the record. Two identities recurred a third time, central to the plot, with no story cost, so stay deferred.

## Close Reason

Add minimal scene viewpoint and group membership; keep the other deferred gaps deferred.
