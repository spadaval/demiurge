---
schema: atelier.item
schema_version: 3
id: worldcrafter-if6h
title: Amend DESIGN.md for Night Edition bible inspector, Topics talk surface, and agent prompt/tool-trace slip
status: open
mission: worldcrafter-mtkn
labels:
- design
- night-edition
priority: high
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T23:09:32.896584487Z
---

## Goal

Amend `DESIGN.md` (and `.impeccable/` surface brief if present) to define the Night Edition visual and layout grammar for the three new surfaces in `worldcrafter-mtkn`—explicitly reconciling `DESIGN.md:134` ("no panels, no cards around notes, and no chat surface") with the rail's `Manuscript / World / Topics` view switch (`DESIGN.md:244`) and gloss-column slips:
1. **`World` bible inspector** (Cast & Drives, Open Questions with candidates/rejected reasons, Timeline & Counts, Reader-Order, Contradictions) set in hairlines and Source Sans 3 apparatus without floating dashboard panels or cards.
2. **`Topics` scoped talk-page surface** (Wikipedia-style anchored discussions over the Story Agent Runner, distinct from global chat, with attributed model turns and world inbox).
3. **Agent prompt, context, and tool-trace slip** extending the existing Context Viewer slip while keeping Night-Edition Vermilion reserved strictly for AI prose segments.

## Done when

- [ ] `DESIGN.md` explicitly distinguishes scoped `Topics` talk pages from disallowed global chat and defines the layout, typography, hairline structure, and responsive behavior for `World` inspector views, `Topics` talk pages, and the agent prompt/tool-trace slip.
- [ ] All existing Night Edition Named Rules (Vermilion Signature, One Job, Paired Tint, Two Voices, Fixed Weight, Paint-Only, Hairline) remain unbroken and consistent with the new sections.
- [ ] Downstream items `worldcrafter-wqh0`, `worldcrafter-lhh3`, and `worldcrafter-w4mr` can check their UI against the amended `DESIGN.md` without ambiguity.

## Scope

In: `DESIGN.md` (and any matching `.impeccable/` surface brief if stale).
Out: Implementing UI components (`worldcrafter-wqh0`, `worldcrafter-lhh3`, `worldcrafter-w4mr`).
