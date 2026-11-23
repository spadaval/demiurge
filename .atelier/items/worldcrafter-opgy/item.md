---
schema: atelier.item
schema_version: 3
id: worldcrafter-opgy
title: Decide whether timeline values the story agent writes are marked inferred
status: open
mission: null
labels:
- decision
- needs-human
priority: medium
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-23T04:13:38.456282038Z
---

## Goal

The story tools (`app/src/story/tools.ts`, worldcrafter-7r87) and the agent runner (worldcrafter-667u) write timeline positions and constraints with no `authority`, so a value the model made up counts as asserted, the same as one the writer typed in the CLI. Both implementers left this open as a product decision: should model-written timeline values be marked `inferred` so the writer can tell them apart and contradictions weigh them less?

## Done when

- [ ] Sumeet has decided whether positions and constraints written through the story tools by the agent carry `authority: inferred` (or another mark) instead of counting as asserted, and the decision is recorded here.
- [ ] If the answer changes behaviour, an item to build it is filed.

## Scope

In: the decision.
Out: building it.
