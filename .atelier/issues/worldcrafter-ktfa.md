---
created_at: "2026-11-05T11:33:23.719426723+00:00"
id: "worldcrafter-ktfa"
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
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T12:20:05.352427917+00:00"
status: "done"
title: "Scene viewpoint and group membership (decision worldcrafter-dgkx)"
updated_at: "2026-11-05T12:20:05.352427917+00:00"
---

## Goal

Hold whose eyes a scene is through and who belongs to a group over time, minimally.

## Done when

- A scene can name its viewpoint actor; reader-order --before marks what the reader has been told that the viewpoint character doesn't know (from knowledge records).
- Membership of a group actor over time (since/until events) is held, and show actor: lists it for both member and group.
- SKILL.md and --help; tests; bun run check passes.

## Close Reason

Outcome: done in 626abe8 on feature/worldcrafter-ulpg (src/story/story.ts, commands.ts, learning.ts, order.ts, contradictions.ts, render.ts, touches.ts, scenes.ts; scripts/story.ts; tests; story-sketch SKILL.md). (1) Viewpoint: Scene.viewpoint (an actor ID, left out of the file when unset); set-scene-viewpoint <scene> <actor|none>; show scene and render print it; touches and scenes link scene and actor both ways; removing the actor clears it. reader-order --before names it in the header ('through the eyes of Mara') and ends each told line with '; Mara doesn't know', 'doesn't know yet' (her knowledge of it starts later), 'no longer knows' (it ended), plus ', believes <version>' when she holds a version of a told event instead (viewpointGap in learning.ts). A told record is marked only when some knowledge record is of it (or, for an event, of one of its versions), so a story that tracks nobody's knowledge of a thing marks nothing; knowing and believing both count. Time: knowledge holds strictly after its since event and before its until event, in story order (eventsInStoryOrder, as counts use), at the scene's latest placed depicted event (the anchor --before already uses); with no anchor, time is ignored and any knowledge counts. Knowledge starting at the scene's own event counts as 'not yet'. (2) Membership: story.memberships {id, member, group, since?, until?} (left out of the file when empty); add-membership <id> <member> <group> [--since] [--until], update-membership <id> [--since|--until, none clears], remove-membership <id>; refused for unknown actors or events, a duplicate ID, or an actor in itself (the group's kind is not checked). show actor: lists 'member of:' and 'member:' lines in story order with since/until and the membership ID; show event: lists who joins or leaves then; render lists both sides; touches links member, group and since/until events, so trace follows them. Removing an actor takes its memberships either way round and the edit lists them under Also removed; removing an event takes the time off a membership, as knowledge does. One ending before it starts is a contradiction. (3) SKILL.md: the participant workaround for joins and leaves is replaced by a membership bullet; viewpoint added to scene links and to reader-order --before; --help overview, remove-actor and remove-event summaries updated. Examples use mara/ivo/crew. Deviations: memberships are not a ref kind (no show membership:, no scene reveals of one), to keep it small; a membership edit prints no trace. Edits now print knowledge and membership contradictions they add (before, only cause and count ones), which the skill already claimed for knowledge. Proof: bun run check exit 0 after the last change (1129 pass); new src/story/viewpoint.test.ts (viewpoint set/clear/refuse/round-trip/removal, viewpointGap cases yet/ended/believes/untracked/own knowledge/no anchor, membership refusals, update/remove, cascade, render, touches, contradiction) and a CLI test (quiet edits, reader-order --before exact output, show from both sides and the event, contradiction printed, Also removed); evidence worldcrafter-pxgp (scratch-story transcript). Open items: independent review outstanding. The 'only tracked records are marked' rule is a judgment: a writer who records no knowledge of a secret gets no marks, which the skill says; 2m7d may want to say more. Presence, quoted lines and the other deferred gaps are untouched.
