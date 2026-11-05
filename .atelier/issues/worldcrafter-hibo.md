---
created_at: "2026-11-05T17:23:36.091581009+00:00"
id: "worldcrafter-hibo"
issue_type: "task"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "review"
    id: "worldcrafter-72h9"
    type: "discovered_from"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T17:26:01.498814144+00:00"
status: "done"
title: "Skill up to date with the CLI after the Round 4 fixes"
updated_at: "2026-11-05T17:26:01.498814144+00:00"
---

## Goal

SKILL.md describes the CLI as it stands after b0pg (with mnm0), yyki and 7b2r (finding worldcrafter-72h9). Done in the same pass as worldcrafter-l55e.

## Done when

- SKILL.md describes the current viewpoint rule, --add/--remove on set-scene-actors/-events/-pressures, month and year-range spans, the counts section's opening values and changes, and quoted --precision notes; reviewed with l55e.

## Close Reason

Implementer report. Outcome: in the same commit as worldcrafter-l55e, SKILL.md now describes the viewpoint rule after b0pg and mnm0 (own records decide; otherwise taking part, telling, an earlier own-viewpoint scene that shows, reveals, implies or pays off it, and an earlier scene they are in that reveals or pays off it unless it is that scene's viewpoint's own secret), --add/--remove on every scene list, ranges for month, year and longer-range ends in span, the counts section's opening values and changes, and --precision as a quoted note. Proof by inspection against --help at 0614f10. Open: independent review outstanding.
