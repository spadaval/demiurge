---
schema: atelier.item
schema_version: 3
id: worldcrafter-gobh
title: 'Talk turns: show the model''s proposals with Record as fact'
status: open
mission: null
labels:
- agent
- talk
- ui
priority: low
blocked_by:
- worldcrafter-lhh3
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-23T07:54:51.424630352Z
---

## Goal

Show a model turn's proposals on a topic sheet with a "Record as fact" action, as `DESIGN.md`'s Topics section describes. `worldcrafter-lhh3` did not build it because the agent's output carries no structured proposal to render: a turn is text plus tool calls.

## Done when

- [ ] The representation of a proposal in an agent turn is decided and written in `docs/rebuild/talk-pages.md` (for example a typed tool call that proposes a fact without writing it).
- [ ] A model turn that carries proposals lists them on the topic sheet, and "Record as fact" writes one to the story bible through the story commands, with the write attributed and visible in open scenes and the World inspector.
- [ ] Tests against the stub LLM server cover a proposal shown, recorded, and refused when it contradicts the bible; `cd app && bun run check` passes.

## Scope

In: the proposal representation, its rendering on topic sheets, and the record action.
Out: block-ID prose edit proposals (`worldcrafter-yx9v`).
