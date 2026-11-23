---
schema: atelier.item
schema_version: 3
id: worldcrafter-8jrq
title: Story agent tool to raise a talk topic
status: open
mission: null
labels:
- agent
- talk
priority: medium
blocked_by:
- worldcrafter-lhh3
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-23T07:54:32.058778524Z
---

## Goal

Give the story agent a tool that raises a talk topic, so the World Inbox's "open topics the model raised" can fill from real agent runs. `worldcrafter-lhh3` built `Talk.raise` and the inbox, but only code calls `raise` today (the demo world seeds one), so no model turn can start a topic.

## Done when

- [ ] The story agent's tool set includes a typed tool that raises a topic with a title, an opening message and a scope (world, scene, passage or bible record), validated like the other story tools and refused with a reason when the scope does not resolve.
- [ ] A topic raised this way is attributed to the model with its profile, request ID and trace, and appears in the World Inbox.
- [ ] Tests against the stub LLM server cover a raised topic reaching the inbox and a refused raise; `cd app && bun run check` passes.

## Scope

In: the tool definition, its wiring to `Talk.raise`, and tests.
Out: deciding when the agent should raise topics unprompted (prompt policy), and any inbox UI change.
