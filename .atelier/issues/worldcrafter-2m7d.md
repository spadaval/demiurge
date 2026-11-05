---
created_at: "2026-11-05T11:33:23.795530097+00:00"
id: "worldcrafter-2m7d"
issue_type: "task"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-5pks"
    type: "discovered_from"
  - kind: "issue"
    id: "worldcrafter-ktfa"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-uf0f"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-vg6e"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T12:26:25.888282041+00:00"
status: "done"
title: "Skill guidance from Round 2 (reading 1, 4, 5, 7)"
updated_at: "2026-11-05T12:26:25.888282041+00:00"
---

## Goal

Close the skill gaps Round 2 showed, keeping the skill tight.

## Done when

- SKILL.md says: after drafting a scene, check every number and stated time in the prose with show count: and span before saving; read reader-order --before whole; after setting a count's series, read show count: once against what each event says; don't report an empty gaps list as a result; how to use viewpoint and membership. Examples stay neutral (no premise or round content).
- Reviewed against the CLI after the other children.

## Close Reason

Outcome: done in 035b7db on feature/worldcrafter-ulpg; only .agents/skills/story-sketch/SKILL.md changed (craft.md untouched). From Round 2's reading, ranked issues 1, 4, 5, 7: (1) 'Before writing a scene' is now 'Writing a scene': before drafting, reader-order --before and show each depicted event; after drafting and before committing the draft, show count: for every number and span for every time the prose states ('nearly half', 'three days since'), then set links and read what edits print. (7) reader-order --before is to be read whole, never through head or tail, since its early lines hold the setups; the skill now also says it prints counts as of the scene (uf0f). (4) Counts: after setting a series, read show count: once and check each value and its distance from the threshold against what that event says (replacing the line that only said show count: and render print the series). (5) gaps: an empty list is not a goal 'and not a result to report'. Viewpoint and membership (ktfa): the viewpoint bullet says marks need recorded knowledge of a secret, or nothing is marked; the membership bullet says to use it rather than an event with a participant role, and Time says membership since/until follow events. Cuts to hold length: the Rework bullet (its commands named in the trace bullet instead), 'Output prints dates, not fractions of a year' (a Round 1 fix, now just true), trace's first-time-silence sentence (in --help), a shorter open-question on-the-spot line, the membership update example, and 'no reader sees it' after render (said above). Word count: 2248 before (2112 before ktfa added viewpoint and membership), 2214 after. Proof: every backticked command name in the skill checked against --help (only arguments such as reveals, replaced, flipped are not commands); examples use mara/ivo/crew/storm/wreck only; no code changed, so bun run check at 667ff88 still covers the code. Open items: independent review outstanding (a docs change, not trivial). The 'reviewed against the CLI after the other children' clause was done by the author, so a reviewer should re-check it.
