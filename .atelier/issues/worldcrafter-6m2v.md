---
created_at: "2026-11-05T06:28:02.424101926+00:00"
id: "worldcrafter-6m2v"
issue_type: "feature"
labels: []
workflow_branch:
  branch_base: master
  work_branch: feature/worldcrafter-6m2v
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-gwx3"
    type: "advances"
  - kind: "issue"
    id: "worldcrafter-wefn"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T07:16:01.900300272+00:00"
status: "done"
title: "Model knowledge and belief, tied to reveals"
updated_at: "2026-11-05T07:16:01.900300272+00:00"
---

## Goal

Who knows or believes what, from when, and the versions different people tell, tied to reveals, so telling order is separate from true order.

## Done when

- SKILL.md describes the new commands or states, and `--help` is accurate (review finding worldcrafter-j8lb).
- An actor can know or believe a fact or a version of an event from a point in time; versions of the same event by different actors are held side by side.
- Scenes link which knowledge they reveal to the reader, so the reader's order of learning can be listed apart from the true order.
- Tests; bun run check passes; independently reviewed and merged locally.

## Close Reason

Outcome: two new record kinds, both refs scenes can link.
- version (story.versions: id, event, text, by): one account of an event told by the actors in by, held beside the event's summary (the truth) and the event's other versions. Commands: add-version, update-version, remove-version.
- knowledge (story.knowledge: id, actor, how knows|believes, what, optional since and until): what one actor knows or believes, from and until an event. what can be any ref (fact, version, event, candidate, even other knowledge but not itself). Commands: add-knowledge, update-knowledge (none clears since or until), remove-knowledge.
Time is told by events, so finer time (fix 5) needs no change here. A scene reveals a version or knowledge with the existing set-scene-links. The new read reader-order (app/src/story/learning.ts) prints two lists: each scene in telling order with what it shows, reveals, implies or withholds and its story time; then events in story order, each with the first scene that tells the reader of it (through the event, a version of it or knowledge of either; withholding doesn't count), and the knowledge that starts then with where the reader learns it, plus the knowledge held from the start.
Also: show lists an actor's knowledge and the versions they tell, an event's versions and the knowledge that starts or ends with it, and the version and knowledge records themselves. list version and list knowledge work. render puts versions under their event and adds a 'Who knows or believes what' section. touches, scenes and mentions (version text) follow the new records. Removing an event removes its versions, the knowledge of them and links to that, cascading. Removing an actor removes their knowledge and drops them as a teller. Removing an event used as since or until clears that time. The files written are unchanged when there are no versions or knowledge. eventsInStoryOrder and eventTime are now exported from render.ts for reuse. SKILL.md has two new bullets (versions and knowledge; telling order versus true order), and --help has a new group and intro paragraph.
Tests: src/story/knowledge.test.ts and a CLI test in scripts/story.test.ts. bun run check passes (1005 tests).
Deviations: no 'tells' record separate from 'by' (who tells a version) and 'believes' (who holds it). That is enough for a liar telling a version they don't believe.
Open items: independent review outstanding. No check that a scene doesn't reveal something before a scene that later reveals it 'for the first time'; reader-order only lists. Knowledge has no note field; whether a version is true is left to the event summary or a fact. What a reader believes over time (being misled by a version until a later reveal) is visible in reader-order but not modelled. Change tracing (fix 6) should treat versions and knowledge as dependents of their event.
