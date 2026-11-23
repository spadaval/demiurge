---
schema: atelier.item
schema_version: 3
id: worldcrafter-lhh3
title: Talk pages and world inbox
status: changes_requested
mission: worldcrafter-mtkn
labels:
- ai
- talk
- feature
priority: medium
blocked_by:
- worldcrafter-if6h
- worldcrafter-667u
implementers:
- thread:delegated-task:command%3Amcp%3A3f69cce6-a3b3-462c-8abc-fa3ad7d4dffd%3Adelegate-task%3A92a6a651-2527-4b20-8645-8e2ee9697ffa
ready: null
trivial: null
caused_by: null
created_at: 2026-10-17T07:07:33.752391106Z
---

## Goal

Build scoped talk pages and the World Inbox inside the Night Edition `Topics` view (`DESIGN.md`, `docs/rebuild/talk-pages.md`) backed by the app-owned Story Agent Runner (`worldcrafter-667u`) and persisted through `StorageAdapter`.

Every topic is scoped to the world, a scene, a passage, or a bible record, has status (`open` / `resolved` / `archived`), and records author attribution (human or model + profile + stored request ID + tool calls). Open AI-raised topics and unresolved story problems/contradictions aggregate in the World Inbox. This replaces the old global chat without depending on block-ID prose edit proposals (`worldcrafter-yx9v`, which remains out of scope for `worldcrafter-mtkn`).

*(Supersedes the 2026-10-29 and 2026-11-05 backlog notes, which predate `worldcrafter-jeue` and Sumeet's 2026-11-22 typed-store + app-owned agent direction.)*

## Done when

- [x] `StorageAdapter` persists `Topic` and `TalkMessage` records (world, scene, passage, or bible-record scope; `open` / `resolved` / `archived` status; human or attributed model author with stored request ID and tool-call trace reference).
- [x] The Night Edition `Topics` view lists topics by scope, displays the World Inbox (open AI-started topics and surfaced story contradictions), and runs live multi-turn conversations through the Story Agent Runner (`worldcrafter-667u`).
- [x] Component and scenario tests (against a stub LLM server) verify creating a topic, running a multi-turn agent turn with tool calls, attributing model messages, resolving/archiving topics, and listing the World Inbox.
- [x] Matches the `Topics` specification in the amended `DESIGN.md` (`worldcrafter-if6h`); `cd app && bun run check` passes.

## Scope

In: Talk-page persistence in `StorageAdapter`, Night Edition `Topics` and World Inbox UI, and Story Agent Runner integration.
Out: Anchored launch triggers from inspector/scene views (`worldcrafter-rxvy`), prompt/tool-trace editing UI (`worldcrafter-w4mr`), and block-ID prose edit proposals (`worldcrafter-yx9v`).

## Report

The writer can now open a topic from the rail's Topics view, name it, and
talk with the model about the world, a scene, a passage or a bible record.
Each turn runs through the story agent runner with the story tools, and the
model's turns are signed and traceable. Open topics the model raised and the
story's kept contradictions gather in the World inbox.

- **Storage** (`app/src/storage/`): a new `talkRecords` collection
  (IndexedDB version 5, `byTopic` and `byKind` indexes) with `listForTopic`,
  `listOfKind` and a `saveTalkRecord` batch write, wired through memory,
  IndexedDB, connected storage, sync, dump and restore. The world file moves
  to version 3; version 1 and 2 files still import, with no talk records.
- **Talk module** (`app/src/talk/`): `records.ts` holds `Topic` and
  `TalkMessage` with their checks on read. A topic has one scope (`world`,
  `scene`, `passage` with document, block and quote, or `record` by ref)
  and a status (`open`, `resolved` or `archived`). An author is the writer,
  or a model with its profile label, model ID, agent session, `requestId`
  (the agent step record it answers) and `trace` (every step record of the
  run). `talk.ts` has the commands: `start`, `send`, `resume` (Try again),
  `rename`, `setStatus` and `raise` (a model-started topic). Each topic runs
  one `plan` agent session, `talk-<topic>`, whose system prompt is the
  default plus a paragraph naming the topic and its scope. `inbox.ts` lists
  open model-raised topics, newest first, then `storyContradictions`.
  `scope.ts` maps scopes to agent scopes, names them ("Scene · 2 The night
  the light failed"), and finds a stale passage anchor.
- **UI** (`app/src/app/topics.tsx`, `talk.ts`, `tab-routes.ts`): the rail's
  Topics view, with the World inbox (count, first three rows, "Open the
  inbox"), open topics grouped World / Scenes / Passages / Records ("New
  topic" on the World label, the active topic's 3px bar), and "Resolved and
  archived". The rail foot's inbox count links to the inbox sheet. Topics,
  the World inbox and the resolved-and-archived ledger open as sheet tabs
  under the `Topics ›` crumb, at `/topic/$topicId`, `/inbox` and
  `/topics/closed`. The workspace now holds `sheet:` tabs beside document
  tabs (`openSheet`; closing a sheet tab just closes it).
- **The topic sheet**: scope line (a scene with a document is a link), the
  passage quote and stale line, the editable title, status with Resolve,
  Archive or Reopen, and the started line. Turns are signed "You" or
  "Model · <profile>", with the left rule on model turns and the tool-call
  fold. A running turn shows Stop, a live status line and streamed text. A
  stopped turn shows its error with Try again. The composer shows what the
  model sees, and Send (or Ctrl/⌘+Enter) waits for a title and text. New
  topic stores nothing until the first Send, and closing its tab discards it.
- **Demo**: `layerSource.topics` (fixtures only) is gone. The demo world
  seeds two stored world topics instead, one of them raised by the model.

Tests: `app/src/talk/talk.test.ts` (12, stub LLM server and memory
storage) covers starting a topic with tool calls and the signed answer
(request ID equals the stored step, whose request is byte-identical to what
the stub received), a second turn carrying the conversation and signed
with its own run, a refused call, nothing stored without title, message,
model or valid scope, a failed call tried again (the failed step stays in
the trace), Stop cancelling a streaming turn, resolve, archive, reopen and
rename, a failed first save being sent again, and the inbox.
`app/src/app/topics.app.test.tsx` (7) drives the running app: the rail
view, New topic through two turns, discarding an unsent topic, resolve,
reopen and archive with the closed ledger, the inbox sheet, Try again, and
Send with no model. Storage contract, IndexedDB upgrade (4 to 5), world
file and connected-storage tests cover the collection. `cd app && bun run
check`: 1648 pass, 0 fail, no warnings.

Where it departs from DESIGN.md's Topics section, and why:
- **Not built, other items' scope**: the "Request" action on a model turn,
  "Context" on the composer and in the masthead, and the agent slip in the
  gloss column (`worldcrafter-w4mr`; each message stores the request ID and
  trace that slip needs). Opening a contradiction's detail in the World
  inspector (`worldcrafter-wqh0`): inbox contradiction rows aren't links yet,
  and record scopes show as plain text rather than references. Launching
  scene, passage and record topics, and Talk gloss notes (`worldcrafter-rxvy`).
- **Not built, no item yet**: proposals in a turn ("Record as fact"). No
  structured proposal exists in the agent's output to render. Also missing:
  a tool for the agent to raise a topic itself (`Talk.raise` is the command
  it would call, so today only code raises topics); Markdown in turn bodies
  beyond paragraphs (shown as plain paragraphs); and keeping a running
  turn's end in view while the writer is at the foot. The lead may want
  items for the first two.
- **Choices**: topic turns use the world's one profile with `max_tokens`
  raised to 2000 and streaming on, because the profile's own sampler is
  tuned for 400-token prose continuations. The topic sheet sits on the
  margin and prose columns without a grid gloss column, since nothing goes
  there until w4mr's slip.

