---
schema: atelier.review
schema_version: 3
round: 2
commit: f38a74ef464d392e60171f7012d6a1111651ff82
reviewers:
- 01a2064b-205e-78b1-8a8f-bc03d1531288
model: grok-4.6
verdict: approve
created_at: 2026-11-23T02:45:23.239650873Z
---

## Summary

- Complexity: medium. Three new surfaces, one Named Rule amendment, and four type tokens in one document, reviewable in a sitting. It is a contract `worldcrafter-wqh0`, `worldcrafter-lhh3`, and `worldcrafter-w4mr` must keep.
- Value: high. The mission is blocked on this grammar, and the Night Edition refusal of a third pane and of global chat only holds if these surfaces have a form.
- Risk of merging it: medium. The file is cheap to amend until the UI items ship; a hole here is copied into those three builds.

The approach is still the right one, and the three round-1 holes are closed. The value is worth merging this document.

Checked `git diff 5dd2527ea951ff5429f6fdcf6d65fbda961e14c2 f38a74ef464d392e60171f7012d6a1111651ff82` (24af764's DESIGN.md edits, this item's Report, the round-1 review file) and `git diff master...f38a74ef464d392e60171f7012d6a1111651ff82` for DESIGN.md, `.impeccable/surfaces/writing-workspace.md`, and this item. Read the amended Topics, Agent Slip, Buttons, Gloss Note, Paint-Only, Vermilion Signature, Sheets, and World Inspector sections against every Done when line, the Report, Named Rules, and the three downstream items. Re-read `docs/rebuild/talk-pages.md`, `PRODUCT.md:38`, `worldcrafter-rxvy`, mission `worldcrafter-mtkn`, and the shipped request slip (`app/src/generate/context-viewer.tsx` `sending` / `onStop`, `app/src/app/styles.css` `.settings-title`). `git diff --check` is clean on the item's files. Did not run `bun` checks; this is a design-document change.

Could not check: a rendered inspector, talk page, or agent slip (out of scope; no UI in the diff).

Done when 1 holds: Overview distinguishes scoped talk pages from global chat; layout, type, hairlines, and breakpoints are specified for the three surfaces, including new-topic, Send, and running-turn cases. Done when 2 holds: Talk gloss notes now ride the Notes layer, so Gloss Note grammar and Paint-Only both apply as written; Vermilion Signature, One Job, Paired Tint, Two Voices, Fixed Weight, and Hairline are unchanged in force. Done when 3 holds: `wqh0`, `lhh3`, and `w4mr` each have a section they can check, and the three round-1 ambiguities are gone.

Report claims that hold: the three findings are in 24af764; the deferred `ledger-row` height and record-detail "suggested" edits are there too. Passage topics on Notes in `ink-3` is one of the two sentences round 1 accepted; listing them under Passages in the Topics rail while Notes is off keeps them reachable at default Speakers-only. Composer Send as the topic sheet's only primary, next-turn slip without Send, and Stop on the running turn's head match the spec round 1 asked for, and the prose request slip still replaces Send with Stop as `context-viewer.tsx` does now. New topic is a sheet with a titled field, empty-turns line, and a composer that waits for a title; the inbox preview uses the open-topic row.

No new findings.

## Finding 1: Passage-topic gloss notes cannot follow Gloss Note grammar without a layer
Recommendation: fix now
Was: 1-dz77.1
Response: fixed in 24af764
Now: fixed

[DESIGN.md:379](/home/supadava/.t3/worktrees/demiurge/t3-c41fd8de-c523b24692a09fbc/DESIGN.md) now puts a passage's open topics on the Notes layer as gloss notes of kind "Talk". They follow the Gloss Note grammar: key, head and Notes-toggle underline in `ink-3`, key always in the DOM, note fades and tick draws only when Notes is on. That is Paint-Only, and it adds no layer and no hue. While Notes is off, the same topics stay listed in the Topics rail under Passages. The contradiction is gone.

## Finding 2: Composer Send and next-turn slip Send are both specified as the one primary
Recommendation: fix now
Was: 1-dz77.2
Response: fixed in 24af764
Now: fixed

[DESIGN.md:300](/home/supadava/.t3/worktrees/demiurge/t3-c41fd8de-c523b24692a09fbc/DESIGN.md) keeps Send on the prose request slip and on the topic composer, and says an agent slip has no Send of its own. [DESIGN.md:391](/home/supadava/.t3/worktrees/demiurge/t3-c41fd8de-c523b24692a09fbc/DESIGN.md)–[DESIGN.md:392](/home/supadava/.t3/worktrees/demiurge/t3-c41fd8de-c523b24692a09fbc/DESIGN.md) make composer Send the action that submits the text plus any next-turn slip edits, disabled while a turn runs, while the composer is empty, and while the topic has no title; Stop stays the running turn's text action. [DESIGN.md:413](/home/supadava/.t3/worktrees/demiurge/t3-c41fd8de-c523b24692a09fbc/DESIGN.md)–[DESIGN.md:417](/home/supadava/.t3/worktrees/demiurge/t3-c41fd8de-c523b24692a09fbc/DESIGN.md) split the four slip modes: prose request keeps Send and Stop-in-place-of-Send; next-turn has Discard edits and no Send; a running turn's slip is read-only and live, with no Send and no Stop; a past turn's slip is a record. That is the spec round 1 asked for.

## Finding 3: "New topic" has no title, empty state, or rail-preview row
Recommendation: fix now
Was: 1-dz77.3
Response: fixed in 24af764
Now: fixed

[DESIGN.md:376](/home/supadava/.t3/worktrees/demiurge/t3-c41fd8de-c523b24692a09fbc/DESIGN.md) says the writer names the topic first, never from the first message. [DESIGN.md:392](/home/supadava/.t3/worktrees/demiurge/t3-c41fd8de-c523b24692a09fbc/DESIGN.md) opens a sheet at once: empty title field in the Sheet title setting, document-title field form, placeholder "Name this topic", focus in the field, status Open, one empty-turns line, composer ready, Send waiting for a title, nothing stored until the first Send. [DESIGN.md:381](/home/supadava/.t3/worktrees/demiurge/t3-c41fd8de-c523b24692a09fbc/DESIGN.md) says the inbox preview uses the open-topic row (title plus about line), not the inbox ledger, and gives the contradiction about-line form. The holes are closed.
