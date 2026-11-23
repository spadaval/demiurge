---
schema: atelier.item
schema_version: 3
id: worldcrafter-n0kb
title: Talk topic anchored to a contradiction
status: open
mission: null
labels: [talk, agent, design]
priority: low
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-23T08:34:38.567274660Z
---

## Goal

Let the writer open a talk topic about a contradiction. `worldcrafter-rxvy` named contradictions among its launch targets but did not build this (finding `3-unai.1`, lead's ruling in `.atelier/missions/worldcrafter-mtkn/notes.md`): a contradiction is computed from the bible on each read and has no ID that survives edits, and `DESIGN.md` defines topic scopes only for the world, a scene, a passage and a bible record.

## Done when

- [ ] A stable identity for a contradiction is decided and written in `docs/rebuild/talk-pages.md` (for example the set of records it names), with what happens to its topic when an edit resolves or changes it.
- [ ] `DESIGN.md`'s Topics section names the contradiction scope: its scope line, its place in the rail's groups, and its launch action in the Contradictions view and the World Inbox.
- [ ] A topic can be opened from a contradiction, and the agent's context packet carries the contradiction and the records it names.
- [ ] Tests cover opening one, and a topic whose contradiction has since been resolved; `cd app && bun run check` passes.

## Scope

In: the scope, its identity, the `DESIGN.md` amendment, the launch action and the context packet.
Out: changing how contradictions are computed.
