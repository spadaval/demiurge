---
schema: atelier.review
schema_version: 1
id: worldcrafter-vujt
title: approval on worldcrafter-j6z1 @02f77cc9
target: worldcrafter-j6z1
identity: round0-reviewer
commit: 02f77cc99abe7442485ae811328083e34ffb6805
created_at: 2026-11-05T07:58:18.690079463Z
event:
  event: approval
---

Reviewed 9fa04db9..02f77cc9 against j6z1's Done when (with j8lb), jeue and world-demo.md. Objects: add/update/remove-object; plants and pays-off scene links; show object lists plants, payoffs and events; render has a Things section. Participants: set/remove-participant, actor or object only, one role per pair, shown on event, object and render, and listed under Also removed. Drive life: add/remove-drive-turn with satisfied, renounced, replaced and flipped, --into checked (not itself, only for replaced or flipped), 1-based removal; show and render list the life, and the target shows 'flipped from'. Removing the event or drive clears the field and keeps the turn. Finer time: dates parsed and validated (bad day, month and hour refused), shown as dates in show and render; unit gaps render in units. Old files: on 32 comparison story.json files, render, show event, contradictions and gaps print identically under the base 9fa04db9 and this head, and an add-fact edit writes byte-identical files. --help and SKILL.md describe all four. Re-ran bun run check in app/: 1022 pass, 0 fail. One defer finding (raw fractional years in timeline problem messages).
