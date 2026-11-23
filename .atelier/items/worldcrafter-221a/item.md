---
schema: atelier.item
schema_version: 3
id: worldcrafter-221a
title: 'Talk: a message stored before a failed send is duplicated on resend'
status: open
mission: null
labels: [bug, talk]
priority: medium
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-23T08:48:00.597232278Z
---

## Goal

Stop a talk message being stored twice. If the writer's message is stored and the send then fails before the turn starts (a storage error, for example), the message stays in the topic with no answer, and sending again adds a second copy. `worldcrafter-ywt3` made this rarer and did not remove it (its Report).

## Done when

- [ ] A test reproduces it: a send that fails after the writer's message is stored and before the run starts, then a second Send, leaves one copy of the message.
- [ ] The cause is fixed in `app/src/talk/talk.ts` (for example by resuming the unanswered message, as Try again does, in place of storing a new one), not by hiding the duplicate in the view.
- [ ] `cd app && bun run check` passes.

## Scope

In: `send` and `resume` in the talk commands and the topic sheet's Send.
Out: the agent runner's own two-write gap (`worldcrafter-a8dl`).
