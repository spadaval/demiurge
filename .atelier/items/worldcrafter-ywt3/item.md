---
schema: atelier.item
schema_version: 3
id: worldcrafter-ywt3
title: 'Host the agent slip on topic sheets: Request, Context and the next-turn slip'
status: changes_requested
mission: worldcrafter-mtkn
labels:
- ui
- night-edition
- agent
- talk
priority: medium
blocked_by:
- worldcrafter-lhh3
implementers:
- thread:delegated-task:command%3Amcp%3A3f69cce6-a3b3-462c-8abc-fa3ad7d4dffd%3Adelegate-task%3A300c279e-c5df-43ca-965c-d31bcfbd3bfe
ready: null
trivial: null
caused_by: null
created_at: 2026-11-23T07:54:32.035107756Z
---

## Goal

Host the agent slip (`ContextViewer` `kind="turn"` and `kind="next"`, merged by `worldcrafter-w4mr`) on topic sheets, so every talk turn's prompt, context packet and tool trace can be read, and the next turn's can be edited, as `DESIGN.md` (Topics, Agent Slip) specifies.

`worldcrafter-w4mr` built the slip but leaves hosting to its caller, and `worldcrafter-lhh3` left prompt and trace UI out of its scope, so nothing in the app shows the slip for an agent session yet. The mission's success criterion on inspecting every agent session does not hold until a topic sheet hosts it. Each talk message already stores the request ID and trace the slip needs. The w4mr Report's "For lhh3" paragraph gives the wiring.

## Done when

- [x] A model turn's "Request" action opens that turn's agent slip in the topic sheet's gloss column, on a leader beside the turn, showing the system prompt, parameters, context packet and tool calls as sent.
- [x] "Context" on the composer line and in the masthead opens the next-turn slip beside the composer; its edits to the system prompt, model or sampler (this session or profile default) and to the context packet are sent by the composer's Send through `sendNextTurn`, and "Discard edits" drops them. The slip has no Send of its own.
- [x] A topic's agent session starts from the saved profile defaults (`app/src/agent/defaults.ts`), so a "Profile default" edit reaches the next new topic.
- [x] A reference followed in the slip opens its record detail sheet or scene, and the slip stays open.
- [x] At 860px and below the slip opens inline after its turn, as `DESIGN.md` says; the One Page Rule and the no-vermilion rule for the slip hold.
- [x] App tests against the stub LLM server cover opening a turn's Request, sending a next-turn edit from the composer, a profile-default edit reaching a new topic, and following a reference; `cd app && bun run check` passes.
- [x] `docs/rebuild/story-agent.md` no longer lists talk pages hosting the slip as not done.

## Scope

In: the topic sheet (`app/src/app/topics.tsx`), its gloss column and masthead Context control, session start from profile defaults, and the tests.
Out: changes to the slip's own parts (`worldcrafter-w4mr`), anchored launch triggers and Talk gloss notes on scene sheets (`worldcrafter-rxvy`), and the prose request slip.

## Report

Every model turn on a topic sheet now shows the request it sent and the tool calls it made, and the next turn's prompt, model, sampler and context can be edited before Send. One commit, `65faf12`.

**Topic sheet** (`app/src/app/topics.tsx`, `styles.css`).
- A model turn with a stored request has "Request" in its head. It opens `ContextViewer kind="turn"` titled "Turn N" (the session's run), read from `sessionTurns(loadSessionLog(...))` by the message's `requestId` (`AppTalk.loadTurn`).
- "Context" on the composer's sees line and in the masthead (topic sheets only) toggles `kind="next"` beside the composer. It reads "Context · edited" while edits wait, so edits kept after Close aren't invisible. It is disabled on a resolved or archived topic. The slip has no Send. Discard edits restores the draft. A sampler that isn't a JSON object holds the composer's Send ("Fix the next turn's request first.").
- Layout: the topic sheet is now on the sheet's four columns. Each turn (and the composer) sits in an entry that spans the prose, gutter and gloss columns as a subgrid; the slip is absolutely placed in the entry's gloss track, level with the turn's head, with a 26px `rule-strong` leader in the gutter. So it takes no room in the turns' flow and is never a pane or overlay. At 860px and below it is static: after its turn, or just above the composer, under a hairline. No `--ai` in any slip rule (tested).
- Following a reference calls `navigate`: a scene with a document opens its tab, anything else its detail in the World tab. Which slip is open lives in `AppTalk.slips`, per topic, so the slip is still open when the writer comes back.

**Talk** (`app/src/talk/talk.ts`, `app/src/app/talk.ts`).
- A topic's new session starts from `defaults.get(profile.name, "plan")`: the saved prompt, model and sampler, with `topicPrompt` after the prompt. `createAppServices` passes the per-world store; `createTalk` keeps one in memory when none is given.
- `TurnOptions.edits` sends the next turn through `sendNextTurn` once the session exists (new or reused), so a new topic's first turn can be edited too. `Talk.nextTurn(id, unsent?)` gives the slip its base: the session's prompt, model and sampler (or what a new session would start with), the profile's model and its sampler with the talk binding's over it, and the packet for the scope.
- The app keeps the draft per topic (`AppTalk.nextTurns`). When the base is read again (a renamed new topic, the slip reopened), fields the writer didn't edit take the new value and edited ones stay; an edited context keeps the packet it was edited from. Once a message is stored, the draft is dropped and the slip reads the session's new state.

**Objection, first: the topic part of the system prompt.** A topic session's prompt is the profile's prompt plus a "# This talk page" part naming the topic. Saving the edited prompt as the profile default as is would put topic A's title into every later topic, and topic B would then carry two topic parts. So a default saved from a topic drops the last "# This talk page" part (`profilePrompt`); a prompt whose part the writer deleted is saved whole. The test checks the next topic's prompt has its own part once and not the first topic's.

**Tests.** `topics.app.test.tsx`, against the stub server: Request opens the slip in the model turn's entry, with the system prompt, parameters and packet equal to what the stub received, the `show` call, no Send and no AI markup, and Close puts it away. Context from the masthead and the composer, Discard edits, an invalid sampler holding Send, then a this-session sampler and an edited packet sent with the message, no default saved, and the packet edit for that turn only. A profile-default prompt edit reaching a new topic, shown in that topic's slip before its first Send and sent with its own topic part. Following `actor:mara` from the slip to Mara's detail, and the slip still open back on the topic. `topics.styles.test.ts`: the slip's placement, leader, 860px inline rules and no vermilion. `talk.test.ts`: `profilePrompt`. Mutation check: making `profilePrompt` a no-op fails the profile-default test.

`cd app && bun run check`: tsc and Biome clean, 1756 pass, 0 fail. The only act() warnings are the existing Rail and generate ones (`worldcrafter-d93c`); the new tests print none.

**Not done, for the lead:**
- A running turn's slip. DESIGN.md's Agent Slip describes one ("read-only and live"); Request appears once the turn is recorded, not on the running turn. The Done-when doesn't ask for it, and `docs/rebuild/story-agent.md` now lists it as not built. It is worth its own item.
- I didn't look at the layout in a browser (AGENTS.md rules out a dev server here). The placement relies on `grid-template-columns: subgrid` and an absolutely placed grid child taking its grid area as containing block; the stylesheet tests check the rules, not the rendering.

Round 1 (`7549fa5`, `d4c0024`). Both fix-now findings held, and I reproduced each with an app test before fixing it.
- *Refused default (1-warp.1).* The cause was the order: `take()` stored the writer's message, then saved the default and changed the session. `sendNextTurn` is now two halves, `prepareNextTurn` (default, then session) and the send. A topic prepares before it stores the message and sends the context edit with `runner.send`. A refused default or session change therefore stores nothing: the composer keeps the text, the slip keeps the edits, and Send delivers the message once. If a turn fails after the message is stored, the app reads the request again and keeps whatever the session doesn't hold yet, such as an edited context. The draft is dropped only when the turn ran. The test covers a new topic and an existing one, refusing and then accepting. That test also exposed an existing bug, fixed separately in `7549fa5`: after a failed turn, a new topic with nothing stored showed "This topic doesn't exist (any more)." in place of the turn's error.
- *Appended instructions (1-warp.2).* `profilePrompt(edited, before, generated)` now removes exactly the topic's own part and keeps the writer's text on both sides. It finds the part as `topicPrompt` writes it now, or, for a topic renamed since its session started, as the session's prompt holds it. An edit inside the part is refused with a reason ("Keep that part as it is, or keep the edit for this session."), since it can't be told from the writer's own text. The app test appends an instruction after the part, saves it as the default, and checks the next topic gets the instruction with its own part only.

Still open, and not new: a stored message whose `runner.send` fails before the run is recorded (a storage error, say) stays in the topic without an answer. Sending again adds a second message. This change makes that path rarer (a refused default no longer takes it) but doesn't remove it.

`cd app && bun run check`: 1761 pass, 0 fail. The topic tests print no act() warnings.

Round 2 (`c3265cd`): 2-nd1g.2 held. After a rename, the topic's part in the session no longer matched what `topicPrompt` writes now, so the fallback took everything after the last heading, including an instruction appended in an earlier turn. `findTopicPrompt` (`talk/scope.ts`) now finds the part by its exact shape: the same template as `topicPrompt`, with the title and scope name left open and a passage's quote exact. The part therefore ends where it ends, whatever follows it. A heading with nothing of that shape under it (the writer edited the part in an earlier this-session edit) is refused with the same reason, not guessed. The app regression appends an instruction and saves it as the default, renames the topic, prepends another and saves again, then checks that a new topic gets both with only its own part. Restoring the old fallback fails it. `talk.test.ts` adds the rename case, a passage quote with regex characters, and both refusals. `bun run check`: 1762 pass, 0 fail.

### Responses
1-warp.1: fixed in d4c0024
1-warp.2: fixed in d4c0024
2-nd1g.2: fixed in c3265cd
