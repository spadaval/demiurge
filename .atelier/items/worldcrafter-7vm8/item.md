---
schema: atelier.item
schema_version: 3
id: worldcrafter-7vm8
title: 'Agent slip: live read-only slip on a running talk turn'
status: open
mission: null
labels: [ui, agent, talk]
priority: low
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-23T08:48:00.562969663Z
---

## Goal

Let the writer open the agent slip on a talk turn while it is still running. `DESIGN.md`'s Agent Slip describes a running turn's slip as read-only and live, with Stop on the turn's head. `worldcrafter-ywt3` shows "Request" only once the turn is recorded, and `docs/rebuild/story-agent.md` lists the live slip as not built.

## Done when

- [ ] A running model turn on a topic sheet offers "Request", and its slip shows the prompt and context as sent and each tool call as it starts and finishes ("running", "waiting", a duration), read-only.
- [ ] When the turn ends, the open slip becomes that turn's recorded slip without closing.
- [ ] App tests against the stub LLM server cover a slip open across a multi-call turn; `cd app && bun run check` passes, and `docs/rebuild/story-agent.md` is updated.

## Scope

In: the topic sheet's running turn and the slip's live state.
Out: the prose request slip, and editing a running turn.
