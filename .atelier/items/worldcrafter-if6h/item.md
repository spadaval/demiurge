---
schema: atelier.item
schema_version: 3
id: worldcrafter-if6h
title: Amend DESIGN.md for Night Edition bible inspector, Topics talk surface, and agent prompt/tool-trace slip
status: in_review
mission: worldcrafter-mtkn
labels:
- design
- night-edition
priority: high
blocked_by: []
implementers:
- thread:delegated-task:command%3Amcp%3A704c8a40-0c58-48f8-a155-75a1af3b85bf%3Adelegate-task%3Acecd828b-ea0d-41b5-bd57-b72a18262df3
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

- [x] `DESIGN.md` explicitly distinguishes scoped `Topics` talk pages from disallowed global chat and defines the layout, typography, hairline structure, and responsive behavior for `World` inspector views, `Topics` talk pages, and the agent prompt/tool-trace slip.
- [x] All existing Night Edition Named Rules (Vermilion Signature, One Job, Paired Tint, Two Voices, Fixed Weight, Paint-Only, Hairline) remain unbroken and consistent with the new sections.
- [x] Downstream items `worldcrafter-wqh0`, `worldcrafter-lhh3`, and `worldcrafter-w4mr` can check their UI against the amended `DESIGN.md` without ambiguity.

## Scope

In: `DESIGN.md` (and any matching `.impeccable/` surface brief if stale).
Out: Implementing UI components (`worldcrafter-wqh0`, `worldcrafter-lhh3`, `worldcrafter-w4mr`).

## Report

`DESIGN.md` now specifies the three new surfaces, so `worldcrafter-wqh0`, `-lhh3` and `-w4mr` each have a section to check against (commit ced027b).

What changed:
- **Overview** no longer reads as banning the Topics view. Conversation happens only on talk pages scoped to one thing, and there is no global, docked or launcher chat.
- **Layout › Sheets** and **the One Page Rule**: inspector views and records share one World tab. Each topic, the World inbox and the resolved list get a tab of their own. On sheets that are not documents, the masthead drops the stamp and layer toggles. The section also says where every kind of reference opens, and that nothing docks as a third pane, drawer or overlay.
- **Components**: References and Ledger (the shared link and list forms), World Inspector (rail section, the five views, record detail with Touches / Touched by in the gloss column, three breakpoints), Topics (four scope checks that separate talk pages from chat, the rail, the World inbox sheet, the topic sheet's head, turns, tool-use fold, proposals, running and failed turns, composer, breakpoints) and Agent Slip (system prompt with a "This session" / "Profile default" scope choice, model, context packet editable for the next turn only, tool trace, kept contradictions, trace suspects, colour, breakpoints).
- **Tokens**: `sheet-title` (the 21px Source Sans 500 the settings sheet already ships), `talk` (15px / 1.55), `excerpt` (Old Standard italic 15px, for quoted manuscript prose) and `code` (12.5px mono).
- `.impeccable/surfaces/writing-workspace.md` gains one line pointing at the new sections. I left `.impeccable/design.json` alone: it is derived from the shipped build, so it should be regenerated after the downstream items ship.

How the Named Rules hold:
- **Vermilion Signature**: the rule already said a surface that is not an AI segment carries no vermilion. I added that model talk turns, tool calls and results, and agent-written records are signed by their author line instead. AI prose proposed for the manuscript takes the plate wherever it is shown. That matches the mission's "vermilion reserved for AI prose segments".
- **One Job / Paired Tint**: the new surfaces use neutrals, with `time` only for story-time values. They carry no speaker tints, because tints are per scene.
- **Two Voices**: the bible, talk turns and the slip are apparatus, so they are sans. Quoted manuscript prose stays serif, and model text is serif only inside the plate.
- **Fixed Weight / Paint-Only**: the new surfaces add no layers. Passage-topic gloss keys for `worldcrafter-rxvy` must follow the Gloss Note grammar and the Paint-Only Rule.
- **Hairline**: all structure is `rule` / `rule-strong`, with no fills except raised umber for failures. Kept contradictions explicitly get no error styling.

Judgment calls for the reviewer:
- Model turns are set off by a 1px `rule-strong` left rule, not a colour, so authorship reads without vermilion.
- Inspector record names and topic titles are sans even when the writer typed them, by the margin-cue precedent. A serif title would put model-written titles in the writer's voice.
- I also corrected the Buttons section, which said there is one primary button per masthead. The shipped slip already has a primary Send, so it now says one per surface.

