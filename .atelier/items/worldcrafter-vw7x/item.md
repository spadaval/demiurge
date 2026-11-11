---
schema: atelier.item
schema_version: 3
id: worldcrafter-vw7x
title: 'Subtext layer: speaker attribution, foreshadowing and implications'
status: draft
mission: null
labels:
- feature
priority: medium
blocked_by:
- worldcrafter-8agg
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-10-17T21:32:39.662330842Z
---

## Goal

The bookkeeping pass also infers subtext and shows it as layers in the writing workspace: who is speaking each line of dialogue (Fountain-style: inferred from "said X" and alternation, forceable by the writer, plain text when unsure), foreshadowing linked to the event it pays off, and implications (what a line tells the reader that nothing earlier did). Every mark is inferred, visibly so, and one click from confirm or dismiss.

## Done when

- [ ] Provisional: fixture-text scenarios show that: - speaker attribution is right on alternating dialogue and stays unattributed when ambiguous - a forced speaker survives a rerun - foreshadowing and implication marks carry provenance and can be confirmed or dismissed - Subtext is off by default and opt-in per scene

## Context

Direction: `.impeccable/surfaces/writing-workspace.md` (Night Edition). Sketches: `.impeccable/mocks/decision/synth-calm.html` and `synth-layers.html`. Extends the bookkeeping pass in worldcrafter-8agg.

## Notes

- 2026-10-17 [note] From the 9get workspace code review (2026-10-17): (R2) dismissed gloss notes keep their letter (dismiss b → a, c, d…); pass the dismissed set to assignKeys in app/src/editor/layer-plugin.tsx. Confirm/dismiss are memory-only today (only fixture notes exist); when real inferred marks arrive they must persist as annotations (pins/dismissals), never in the content tree.
- 2026-10-29 [note] Moved out of the rebuild mission (worldcrafter-3otd) on 2026-10-29: it was planned for a manuscript-first app. Re-plan it under the story model (decision worldcrafter-ok5a, docs/rebuild/story-model.md) before scheduling it.
- 2026-11-05 [note] 2026-11-05: correction to the 2026-10-29 note: decision worldcrafter-03rp ended the typed story model (decision worldcrafter-ok5a is superseded) and the Structure first mission (worldcrafter-z9qs). Don't re-plan this under docs/rebuild/story-model.md. It stays in the loose backlog, unlinked from that mission, and is re-planned only if the notes-first mission (worldcrafter-p3k7) shows the product needs an app.
