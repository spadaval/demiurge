---
schema: atelier.item
schema_version: 3
id: worldcrafter-g7go
title: Check the topic sheet's agent slip layout in a browser, wide and at 860px
status: open
mission: null
labels: [ui, night-edition, talk]
priority: medium
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-23T08:48:00.630349177Z
---

## Goal

Look at the topic sheet's agent slip in a real browser. `worldcrafter-ywt3` placed the slip in the gloss column with `grid-template-columns: subgrid` and an absolutely placed grid child, and inline after its turn at 860px and below. Only stylesheet tests check this, which read the rules and not the rendering, and no one has seen it rendered.

## Done when

- [ ] The built app (`cd app && bun run build`, served statically) is opened on a topic with several turns, and screenshots are kept in the Report for: a turn's Request slip beside its turn, the next-turn slip beside the composer, the same at 1380px and below, and the inline slip at 860px and below.
- [ ] Each screenshot is checked against `DESIGN.md` (Topics, Agent Slip, the One Page Rule); a departure is fixed here if it is a CSS correction, or filed.
- [ ] `cd app && bun run check` passes.

## Scope

In: looking, and CSS corrections to the topic sheet's slip placement.
Out: a dev server or watch command (AGENTS.md), and redesign.
