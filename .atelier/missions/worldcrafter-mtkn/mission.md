---
schema: atelier.mission
schema_version: 3
id: worldcrafter-mtkn
title: Night Edition bible inspector and scoped agent conversation
status: open
labels:
- ui
- night-edition
- agent
lead: null
planners:
- ace64553-eec2-406a-84c3-c6360b8f5131
created_at: 2026-11-22T22:38:26.289754150Z
---

## Why

Started from Sumeet's direction on 2026-11-22: even with a strong typed story model and app-owned agent runner (`worldcrafter-r7vd`), the human needs a clear, calm UI to inspect the story bible, see what the world knows beside live prose, inspect and edit prompts/tool traces, and have intelligent, grounded conversations with the agent. Starting at the Codex-like end of the control axis (rich inspection + scoped conversational steering) delivers most of the leverage without forcing premature CRUD forms for every record type.

`DESIGN.md` already reserves the rail's `Manuscript / World / Topics` view switch (`DESIGN.md:244`) and gloss-column request slips, while ruling out floating dashboard panels and global unanchored chat (`DESIGN.md:134`). Before building the new surfaces, `worldcrafter-if6h` amends `DESIGN.md` to specify the Night Edition grammar for the `World` bible inspector, the `Topics` scoped talk surface, and the agent prompt/tool-trace slip so every downstream item has a concrete spec to check against.

## Outcome

The Night Edition workspace (`DESIGN.md`, amended by `worldcrafter-if6h`) wired to the unified story bible (`worldcrafter-r7vd`) and Story Agent Runner (`worldcrafter-667u`): browsable bible inspector views in the `World` view, live paint-only apparatus layers and gloss notes on scene prose, full prompt/context/tool-trace inspection extending the existing Context Viewer, and scoped talk pages in `Topics` anchored to the world, any scene, passage, or bible record.

## Success criteria

- `DESIGN.md` is amended to specify Night Edition layout and components for the `World` bible inspector, `Topics` scoped talk-page surface (confirming it is scoped discussion rather than global chat), and the agent prompt/tool-trace slip (`worldcrafter-if6h`).
- The Night Edition `World` view lets the writer inspect the full story bible—Cast & Drives, Open Questions (with candidates and rejected reasons), Timeline & Counts, Reader-Order, and Contradictions—without leaving the app (`worldcrafter-wqh0`, after `worldcrafter-if6h`, `worldcrafter-lgz8`, `worldcrafter-7r87`).
- Scene prose renders live paint-only Night Edition apparatus layers and gloss notes driven directly by the story bible (`reader-order --before`, viewpoint dramatic-irony marks, opening counts, planted/paid-off objects, versions vs. truth, time spans) with 0 px prose reflow verified by `app/scripts/measure-layers.ts` (`worldcrafter-hqca`, after `worldcrafter-lgz8`, `worldcrafter-7r87`, `worldcrafter-yxfp`, `worldcrafter-0pt4`).
- Scoped talk pages (`worldcrafter-lhh3`, `worldcrafter-rxvy`) run the app-owned Story Agent Runner (`worldcrafter-667u`) anchored to the world, a scene, a passage, or any bible record, with open topics aggregated in the World Inbox.
- Every agent session extends the existing Context Viewer (`app/src/generate/context-viewer.tsx`) to expose an editable system prompt, viewable/editable next-turn context packet, live tool-call trace, and post-change `trace` impact list (`worldcrafter-w4mr`, after `worldcrafter-if6h`, `worldcrafter-667u`).
- `cd app && bun run check` passes, and every named rule in the amended `DESIGN.md` holds.

## Scope

In:
- Amending `DESIGN.md` for the `World` bible inspector, `Topics` talk surface, and agent prompt/tool-trace slip (`worldcrafter-if6h`).
- Read/inspect bible views in the Night Edition `World` view (`worldcrafter-wqh0`).
- Live bible-backed scene apparatus layers and gloss column (`worldcrafter-hqca`).
- Scoped talk pages and world inbox over the app-owned agent runner (`worldcrafter-lhh3`, `worldcrafter-rxvy`).
- Prompt, context, tool-trace, and impact inspector extending `app/src/generate/context-viewer.tsx` (`worldcrafter-w4mr`).

Out:
- Direct-manipulation CRUD editors for bible records, prose Context Viewer wiring (`worldcrafter-aq1r`), and multi-device sync (`worldcrafter-3z9j`).
- Block-ID prose suggestion diffs (`worldcrafter-yx9v`, remains independent backlog).
- Retiring legacy `app/src/world/` and `app/src/outline/` modules (handled once all UI consumers migrate).
- Changing the underlying story schema or agent runner (`worldcrafter-r7vd`).

## Authority

Sumeet directed the Codex-style Night Edition inspector and scoped talk-page UI on 2026-11-22. Agents may choose component structure, routing, and visual layout within the amended `DESIGN.md`'s named rules. Breaking `DESIGN.md`'s core rules (paint-only layers, vermilion reserved for AI prose segments, no global chat), pushing, or deploying waits for Sumeet.

## Result
