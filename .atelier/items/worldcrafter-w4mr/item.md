---
schema: atelier.item
schema_version: 3
id: worldcrafter-w4mr
title: 'Agent session and prompt inspector: view and edit system prompt, context packet, tool trace, and trace diffs'
status: in_review
mission: worldcrafter-mtkn
labels:
- ui
- agent
priority: high
blocked_by:
- worldcrafter-if6h
- worldcrafter-667u
implementers:
- thread:delegated-task:command%3Amcp%3A3f69cce6-a3b3-462c-8abc-fa3ad7d4dffd%3Adelegate-task%3A8e080806-878a-4774-9e1f-195543b737b4
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T22:39:02.185113934Z
---

## Goal

Extend the existing Context Viewer component (`app/src/generate/context-viewer.tsx` and gloss-column slip) to serve as the shared prompt, context, tool-trace, and impact inspector for app-owned Story Agent Runner sessions (`worldcrafter-667u`)—so `worldcrafter-aq1r` in `worldcrafter-3z9j` reuses the same viewer component rather than building a second one.

**Edit-scope rules:**
- **System prompt / model profile edits**: explicitly scoped to either *this session only* (persisted on the session record) or *save as profile default*.
- **Assembled context packet edits**: apply to *the next turn only*, stored as an immutable request revision on that turn for exact provenance and replay.

## Done when

- [x] Extends `app/src/generate/context-viewer.tsx` (as the single shared viewer for both agent sessions and prose generation) to inspect and edit the system prompt (session-only vs. save-as-default), active model/sampler profile, and next-turn assembled context packet (stored as an immutable request revision for replay).
- [x] Every agent turn displays its typed tool calls, arguments, structured results, kept contradictions, and any `trace` suspects with clickable links to affected records or scenes.
- [x] Matches the amended `DESIGN.md` (`worldcrafter-if6h`) apparatus rules (hairlines, Source Sans 3 apparatus, vermilion reserved strictly for AI prose segments).
- [x] Component tests cover session-vs-default prompt edits, next-turn context-revision persistence, inspecting a multi-tool turn, and clicking a `trace` suspect; `cd app && bun run check` passes.

## Scope

In: Agent session inspection and prompt-override UI in `app/src/app/`.
Out: Runner backend (`worldcrafter-667u`) and direct bible CRUD forms (`worldcrafter-o7to`).

## Report

The context viewer now shows and edits story agent turns as well as prose requests, so `worldcrafter-lhh3` (topic sheets) and `worldcrafter-aq1r` can both use the one component. Nothing in the app hosts it yet: the topic sheet that will is lhh3's, which is building in parallel. Two commits.

**Scope objection, first.** The item puts the runner out of scope, but the runner had no way to take the edits this slip makes: a session's prompt was fixed at start, there was no session sampler, and nothing could send or store an edited packet. So `8c5e6e6` adds the smallest runner support, each piece tested:
- `configure(id, { systemPrompt?, sampler? })` changes a session for its next model calls and keeps the change on the session record. The session's sampler is laid over its role binding's, and `sampler: null` drops it. It is refused while the session runs. Earlier steps keep the requests they sent.
- `send(id, message, { context: { packet, text } })` sends the packet the writer was shown, or their edit of it. An edit is kept on the run as `editedContext`, beside `context` (the packet it came from). Runs are never changed once stored, so the run is the immutable revision: what was assembled and what was sent. A packet for another scope is refused. `replayOptions(run)` makes a replay send the edit again, and a test replays one.
- `defaults.ts` keeps "Profile default" edits per world, profile `name` and role, in localStorage, as the profile itself is kept. `get` returns what a new session starts with: the saved prompt or the built-in one, and the saved sampler if any. `start` takes a `sampler` for that.

**The slip** (`16dd6c9`). `ContextViewer` takes `kind`: absent or `request` is the prose slip as before, `turn` a past or running agent turn, `next` the next turn.
- *Past or running turn* (`AgentTurnSlip`). Head with the title ("Turn 3") and Close, the target line, and a line when the writer edited the context. The system prompt, model parameters and context packet as sent are read-only parts that fold to "as sent" (or "edited · as sent"). The packet's sections list as its breakdown. Then the tool calls, one fold line each: ordinal, name in code, arguments on one ellipsized line, and "212 ms", "running", "waiting" or "failed". Opened, a call lists what it named above the raw arguments and result: records it wrote, as references (removed ones as plain text with "(removed)"), records no ref names such as `constraint/tide-first` by ID, and what it suspects. A refused call shows its error in the notice error form, and a failed model call shows a notice. Then "Kept contradictions" (from edits' `timelineProblems` and `contradictions`, labelled, "kept" at the right, no umber) and "Touched by this change": every suspect from edits' `stale` and `trace` queries, merged by target and sorted likeliest first, each a reference with its reasons. Following a reference calls `onOpen(reference)` (a record ref, or a scene with its document and block), and the slip stays open. The host decides what opens: record detail sheets are wqh0's and scene tabs the workspace's. `describe` lets the host name references ("4 The Ferry"); the default is the ref.
- *Next turn* (`NextTurnSlip`). System prompt, Model (the session's sampler as JSON, with the profile's own sampler shown as what it is laid over) and the context packet, all editable. An edit to the prompt or sampler shows the "This session" / "Profile default" choice, in the existing `.settings-switch` strip, starting on This session. With Profile default chosen it says what it reaches, and the fold line reads "edited · this session" or "edited · profile default". The packet says edits apply to the next turn only and are kept as a revision. "Discard edits" and "Sent with your next message."; no Send. The draft is the host's (`draft`, `onDraftChange`), since the composer's Send sends it: `nextTurnEdits(base, draft)` gives only what changed, or the problem with a sampler that isn't a JSON object, and `sendNextTurn` (`agent/next-turn.ts`) saves a default first, then configures the session, then sends. A Profile default edit applies to this session as well as new ones; otherwise the turn being sent wouldn't use the edit just made.
- `agent/inspect.ts` does the reading, DOM-free: `sessionTurns`, `turnTrace` (calls across a turn's steps, as the model wrote them, with durations and unanswered calls as waiting), `keptContradictions`, `traceSuspects` (checks the shape of `trace` data, since results come back as stored JSON) and `callNamed`.
- `Part` and `count` moved to `slip-parts.tsx`, unchanged, so both views share the fold.

**Design check.** Hairlines (`rule`) between parts, calls and rows. Source Sans 3 apparatus, with the Code setting for names, arguments, results and parameters. No `--ai` anywhere in the slip's CSS, and the test checks no AI segment markup renders. Raised umber only on a refused call, a failed model call and an invalid sampler. Kept contradictions are neutral. New calls and rows fade in at the 140 ms fade, which drops to zero under reduced motion. One gap: story-time values inside raw results aren't set in `time` blue, since they are plain JSON text there.

**Tests.** `agent-slip.test.tsx` drives a real runner against the stub OpenAI-compatible server and memory storage, with a composer harness holding the next-turn draft as a topic sheet will. It covers: a prompt and sampler edit for this session (sent, on the session record, defaults untouched, a new session starts as before); a prompt edit as the profile default (this session sends it, the default is saved, a new session starts with it, the prose role's default is its own); an invalid sampler blocking with discard restoring it; an edited context sent for that turn only, kept on the run beside its packet, the next turn fresh and unedited, and the past turn's slip showing the edit as sent and read-only; a three-call turn (show, constrain, trace) with ordinals, names, argument lines, durations, opened arguments and result, the written constraint, and the kept timeline contradiction; following a trace suspect calling `onOpen` with its target while the slip stays; and a refused call reading "failed" and a call awaiting approval reading "waiting", or "running" while the run goes on. `inspect.test.ts` covers ordinals and durations across steps, merging suspects and skipping malformed data, and naming written records. `runner.test.ts` and `defaults.test.ts` cover the runner additions and the store.

`cd app && bun run check`: tsc and Biome clean, 1620 pass, 0 fail. It prints React act() warnings from the existing Rail tests (`worldcrafter-d93c`); the new tests print none.

For lhh3: start a session with `runner.start({ role, scope, ...defaults.get(profile.name, role) })`, render `ContextViewer kind="next"` beside the composer with a `NextTurnBase` (the session's prompt and sampler, the profile's sampler, and `buildContextPacket` for its scope), and send with `sendNextTurn`. For a model turn's "Request", render `kind="turn"` with `sessionTurns(loadSessionLog(...))[i]`.

Round 2 (`9cfbadb`), all three fix-now findings held:
- *Model.* The Model part now has a model name field above the sampler, with its fold line showing the model that will be sent (the field, else the profile's). A model or sampler edit takes one scope choice. The session (`model`), the defaults store and `sendNextTurn` carry the model, and the runner sends it on the binding's server. Emptying the field goes back to the profile's model, here or as the default. A sampler that sets `model`, `stream`, `messages`, `prompt`, `tools` or `tool_choice` is refused with a reason, since the request builder overwrites those. The tests check the model actually sent, for this session and as a profile default reaching a new session.
- *Query references.* `callNamed` also reads a successful query's data: refs under `ref` or `on` (show, touches, mentions, contradictions) and scene IDs under `scene` (scenes, readerOrder), keeping only what parses as a ref. A component test follows `show`'s `actor:mara` through `onOpen`.
- *Durations.* Each answered call now stores `finishedAt`, and the slip times a call from `at` to it. Calls stored without it show "done" with no duration. A runner test pauses between two calls, lets an hour pass, resumes, and both calls still read 1 ms.

The deferred finding (story-time values inside raw results not set in `time`) stays as noted above.

`cd app && bun run check`: 1624 pass, 0 fail.

Round 3 (`af6c22f`): the rest of the query-reference finding. A query's data is now read for every string that is wholly a ref (so `readerOrder`'s `withheld` list), for refs stored as `{ kind, id }` (a fact's `about`; a candidate's needs its `questionId`), and for scene IDs under `scene`. Only what `parseRef` accepts is kept, and free text is never scanned. A test runs the reviewer's two cases on the lighthouse fixture: `show(fact:oil-runs-out)` names `count:oil` and `object:lamp`, and `readerOrder(before: confession)` names `open-question:why-leave`. `bun run check`: 1625 pass, 0 fail.

### Responses
1-08b5.1: fixed in 9cfbadb
1-08b5.2: fixed in 9cfbadb
1-08b5.3: fixed in 9cfbadb
2-rt52.2: fixed in af6c22f
