---
schema: atelier.item
schema_version: 3
id: worldcrafter-o7to
title: Direct-manipulation controls for high-frequency bible edits
status: building
mission: worldcrafter-3z9j
labels:
- ui
- story-model
priority: medium
blocked_by:
- worldcrafter-lgz8
- worldcrafter-7r87
- worldcrafter-wqh0
- worldcrafter-hqca
implementers:
- thread:delegated-task:command%3Amcp%3Ae73897d3-5d5f-4e72-a7aa-575ebc1de207%3Adelegate-task%3A4826dece-04b7-48ab-b57f-831e84e856e0
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T22:39:04.518206026Z
---

## Goal

Add lightweight direct-manipulation controls to the Night Edition bible inspector for the high-frequency edits where clicking is faster than prompting: answering or rejecting open-question candidates, reordering scenes, changing a scene's viewpoint, updating a count value, and marking a gap deliberate.

## Done when

- [ ] Each control invokes the same typed `app/src/story/commands.ts` mutation as the Story Agent Runner (never mutating storage directly) and surfaces any kept contradictions or `trace` suspects.
- [ ] Covers: answer/reject/reopen open-question candidate, move scene in telling order, set scene viewpoint, set count value, mark gap deliberate.
- [ ] Component tests verify each action updates the unified store and live inspector/apparatus views; `bun run check` passes.

## Scope

In: Targeted direct-edit actions inside Night Edition inspector views (`app/src/app/`).
Out: Full CRUD form editors for all 12 story record types (add only if dogfooding shows a need).
