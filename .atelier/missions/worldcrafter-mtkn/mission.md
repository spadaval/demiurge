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

## Outcome

The Night Edition workspace (`DESIGN.md`) wired to the unified story bible and Story Agent Runner: browsable bible inspector views in the rail, live paint-only apparatus layers and gloss notes on scene prose, full prompt/context/tool-trace inspection, and scoped talk pages anchored to the world, any scene, passage, or bible record.

## Success criteria

- The Night Edition rail lets the writer inspect the full story bible—Cast & Drives, Open Questions (with candidates and rejected reasons), Timeline & Counts, Reader-Order, and Contradictions—without leaving the app (`worldcrafter-wqh0`).
- Scene prose renders live paint-only Night Edition apparatus layers and gloss notes driven directly by the story bible (`reader-order --before`, viewpoint dramatic-irony marks, opening counts, planted/paid-off objects, time spans) with zero prose reflow (`worldcrafter-hqca`).
- Scoped talk pages (`worldcrafter-lhh3`, `worldcrafter-rxvy`) run the app-owned Story Agent Runner anchored to the world, a scene, a passage, or any bible record.
- Every agent session exposes an editable system prompt, viewable/editable context packet, live tool-call trace, and post-change `trace` impact list (`worldcrafter-w4mr`).
- `bun run check` passes in `app/`, and visual/layout rules in `DESIGN.md` hold (paint-only layers, vermilion reserved for AI segments, no cards around gloss notes).

## Scope

In:
- Read/inspect bible views in the Night Edition rail (`worldcrafter-wqh0`).
- Live bible-backed scene apparatus layers and gloss column (`worldcrafter-hqca`).
- Scoped talk pages and world inbox over the app-owned agent runner (`worldcrafter-lhh3`, `worldcrafter-rxvy`).
- Prompt, context, tool-trace, and impact inspector UI (`worldcrafter-w4mr`).

Out:
- Direct-manipulation CRUD editors for bible records and multi-device sync (`worldcrafter-3z9j`).
- Block-ID prose suggestion diffs (`worldcrafter-yx9v`, remains independent backlog).
- Changing the underlying story schema or agent runner (`worldcrafter-r7vd`).

## Authority

Agents may choose component structure, routing, and visual layout within `DESIGN.md`'s named rules. Breaking `DESIGN.md` rules, pushing, or deploying waits for Sumeet.

## Result
