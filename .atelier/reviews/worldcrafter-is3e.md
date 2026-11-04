---
schema: atelier.review
schema_version: 1
id: worldcrafter-is3e
title: approval on worldcrafter-o8b7 @46176d74
target: worldcrafter-o8b7
identity: code-reviewer
commit: 46176d7450fbd118f880e2d3d34a7ac55c5eb932
created_at: 2026-11-04T20:45:55.117064101Z
event:
  event: approval
---

Independent review of worldcrafter-cly1 (01811e8f..46176d74) against its Done when, Scope and the Fluidity principles. Ran cd app && bun run check: tsc + biome + 724 pass, 0 fail. Read commands.ts in full and the timeline refactor (applyTimelineCommand behaviour unchanged: filter()[0] equals the old find()). Mutation-tested 16 claims (relation either direction, relation_exists, self relation, removeCandidate clears answer, removeDrive drops relations, removeActor nulls actorId, removeOpenQuestion drops candidate refs, withoutRefs on touches, unrelate either side, updateDrive actor check, addEvent summary, removeEvent constraints, constrain duplicate ID, removeScene refs and answeredAt, applyTimelineCommandKeepingProblems returning problems): all caught except removeScene clearing opensAt (finding worldcrafter-7eyd, defer). Probed removeEvent with hand-added placements and reveals naming the event: adds no timeline problem, so its empty problems list is right. One defer finding, no fix_now.
