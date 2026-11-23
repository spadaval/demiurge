---
schema: atelier.item
schema_version: 3
id: worldcrafter-0pt4
title: 'Viewpoint marks: presence rule, group presence, timing, unplaced scenes'
status: building
mission: worldcrafter-k7uh
labels: []
priority: medium
blocked_by: []
implementers:
- thread:delegated-task:command%3Amcp%3A19a62698-b51c-422f-9aec-662edcca5fd6%3Adelegate-task%3A8e288766-5d13-4c08-a854-ba67cde5896a
ready: null
trivial: null
caused_by: null
created_at: 2026-11-05T19:02:18.248813588Z
---

## Goal

Round 5's reading (ranked items 2–4): the presence rule's `!theirs(s)` exception cancels it for secondary viewpoints; group members in a scene's actors don't count as present; a revealed knowledge record doesn't reveal what it knows; marks are taken at the scene's latest event, not as it opens; a scene whose depicted events are unplaced loses its anchor.

This does **not** pre-empt `worldcrafter-lfyv` (private reveals, `does-not-know`, shared senses): as Round 5's reading (section 3) showed, a bystander's own `add-knowledge` record already protects whispered secrets without `!theirs(s)`, and any primitive `worldcrafter-lfyv` adds later will layer on top.

## Done when

- [ ] Each of the five defects above is fixed with unit tests in `app/src/story/`.
- [ ] Re-running viewpoint marks on Round 5's fixture/scenarios clears the false marks listed in `docs/rounds/round-5/reading.md` without hiding true ones (including finding `mnm0`'s whispered-secret case when the bystander has their own knowledge record).
- [ ] `cd app && bun run check` passes.

## Links

Relationships of the old record that the new format has no field for.

- related: worldcrafter-gwx3 (World first: demonstrate the Demiurge-assisted process on one premise)
- discovered_from: worldcrafter-hdly (Round 5)
