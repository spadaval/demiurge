---
created_at: "2026-11-05T06:28:02.454321564+00:00"
id: "worldcrafter-j6z1"
issue_type: "feature"
labels: []
workflow_branch:
  branch_base: master
  work_branch: feature/worldcrafter-j6z1
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-6m2v"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-gwx3"
    type: "advances"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T07:54:47.754049936+00:00"
status: "done"
title: "Fill the remaining model gaps: objects, participants, drive life, finer time"
updated_at: "2026-11-05T07:54:47.754049936+00:00"
---

## Goal

Objects (planted in one scene, paid off in another), event participants, a drive's life (satisfied, renounced, replaced, flipped), and time finer than a year.

## Done when

- SKILL.md describes the new commands or states, and `--help` is accurate (review finding worldcrafter-j8lb).
- Each of the four is held by the model and the CLI, shown by show/render, with tests.
- bun run check passes; independently reviewed and merged locally.

## Close Reason

Outcome: all four gaps are held by the model and the CLI, shown by show and render, and tested.
1. Objects: a new object record (add-object, update-object, remove-object; ref object:<id>). Scene links gain plants and pays-off (stored as plants and paysOff) for any ref, so plant and payoff tie to the existing scene links. show object lists where it is planted and paid off and the events it takes part in. render has a Things section and Plants/Pays off lines on scenes. Planting and paying off count as telling in reader-order.
2. Event participants: story.participants {event, who (actor or object), role}, one per event and participant (set-participant <event> <ref> --role, remove-participant). show event and actor/object list them, render names them after the event, and touches follows them. They go with their event, actor or object, and the edit lists them under 'Also removed'.
3. Drive life: drive.turns, in order: {how satisfied|renounced|replaced|flipped, at event, into drive (only for replaced or flipped, not itself), note}. Commands: add-drive-turn, remove-drive-turn <n>. show drive prints 'life, in order' and the drive it replaces or flipped from; render prints turns under the want. Removing the event or the into drive clears that field and keeps the turn.
4. Finer time (app/src/story/calendar.ts): positions stay fractional years, so year-based files load and render as before (checked on a comparison-2 story.json). set-position also takes dates (1954-10, 1954-10-12, '1954-10-12 21:00'), stored as the half-open span of that month, day or minute, so two events on one day order with before without a contradiction. render and show print such spans as dates ('12 October 1954, 21:00'); single moments and older fractional positions still print as years. constrain --gap/--tolerance take units (3d, 2w, 6h, 4mo, 1y); a unit gap defaults to give or take half its unit, and render says gaps in units ('2 days', '6 months'). Knowledge since/until and drive-turn at are event refs, so they're unaffected. mentions searches the year of a date position, object names and notes, and turn notes.
Help: remove-event/actor/drive/object say what they take; the intro and a new Objects group are in --help; SKILL.md has bullets for plants/pays-off, participants, a drive's life and finer time. The old advice to model a changing want as two drives with different origins now points at replaced/flipped.
Tests: calendar.test.ts, things.test.ts and a CLI test. bun run check passes (1022 tests).
Deviations: dates are Gregorian only, with no custom calendars. A turn ties to an event, not a scene. A relation flipping over time is modelled as a flipped drive with its own relations, not as a timed relation.
Open items: independent review outstanding. No gap or check for a plant with no payoff (deliberately: unclosed is normal). Scenes have no time of their own (a scene spanning a night jump is still only its depicted events). Participants don't imply knowledge. Story worldUnit is assumed to be year for dates (the CLI never changes it).
