---
schema: atelier.item
schema_version: 3
id: worldcrafter-ywt3
title: 'Host the agent slip on topic sheets: Request, Context and the next-turn slip'
status: open
mission: worldcrafter-mtkn
labels:
- ui
- night-edition
- agent
- talk
priority: medium
blocked_by:
- worldcrafter-lhh3
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-23T07:54:32.035107756Z
---

## Goal

Host the agent slip (`ContextViewer` `kind="turn"` and `kind="next"`, merged by `worldcrafter-w4mr`) on topic sheets, so every talk turn's prompt, context packet and tool trace can be read, and the next turn's can be edited, as `DESIGN.md` (Topics, Agent Slip) specifies.

`worldcrafter-w4mr` built the slip but leaves hosting to its caller, and `worldcrafter-lhh3` left prompt and trace UI out of its scope, so nothing in the app shows the slip for an agent session yet. The mission's success criterion on inspecting every agent session does not hold until a topic sheet hosts it. Each talk message already stores the request ID and trace the slip needs. The w4mr Report's "For lhh3" paragraph gives the wiring.

## Done when

- [ ] A model turn's "Request" action opens that turn's agent slip in the topic sheet's gloss column, on a leader beside the turn, showing the system prompt, parameters, context packet and tool calls as sent.
- [ ] "Context" on the composer line and in the masthead opens the next-turn slip beside the composer; its edits to the system prompt, model or sampler (this session or profile default) and to the context packet are sent by the composer's Send through `sendNextTurn`, and "Discard edits" drops them. The slip has no Send of its own.
- [ ] A topic's agent session starts from the saved profile defaults (`app/src/agent/defaults.ts`), so a "Profile default" edit reaches the next new topic.
- [ ] A reference followed in the slip opens its record detail sheet or scene, and the slip stays open.
- [ ] At 860px and below the slip opens inline after its turn, as `DESIGN.md` says; the One Page Rule and the no-vermilion rule for the slip hold.
- [ ] App tests against the stub LLM server cover opening a turn's Request, sending a next-turn edit from the composer, a profile-default edit reaching a new topic, and following a reference; `cd app && bun run check` passes.
- [ ] `docs/rebuild/story-agent.md` no longer lists talk pages hosting the slip as not done.

## Scope

In: the topic sheet (`app/src/app/topics.tsx`), its gloss column and masthead Context control, session start from profile defaults, and the tests.
Out: changes to the slip's own parts (`worldcrafter-w4mr`), anchored launch triggers and Talk gloss notes on scene sheets (`worldcrafter-rxvy`), and the prose request slip.
