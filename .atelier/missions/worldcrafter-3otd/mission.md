---
schema: atelier.mission
schema_version: 3
id: worldcrafter-3otd
title: Rebuild WorldCrafter around clear data boundaries
status: draft
labels:
- rebuild
lead: null
ready: null
created_at: 2026-10-17T07:07:33.753013235Z
---

## Why

Demiurge is meant to be an AI-native writing and worldbuilding tool that is
not a chatbot. The old codebase came out of a chat app, was redesigned several
times, and kept losing data at the boundary between Plate's rich tree and the
plain text LLMs read and write. Its "Generate Next" sends no world context at all,
and it detected entities with a news-trained NER model that handles invented names
worst. The field has since settled on alias-matched lore injection and
reviewable AI edits, which confirms the direction. AI
upkeep of the world, a typed world graph, and editable context are still
underserved, and those are where Demiurge can stand out
(`docs/rebuild/prior-art-2026.md`).

It is also about control over the model. Coding harnesses and chat frontends
decide the samplers, the system prompt and the prompt format for you, and
they're built for frontier chat models. Writing well with experimental
finetunes means choosing those yourself. The project started from wanting the
XTC sampler, which almost no frontend offers, but the goal is control in
general, not any one sampler.

The story model (decision worldcrafter-ok5a, `docs/rebuild/story-model.md`)
makes the app structure-first, not manuscript-first. This mission finishes the
foundation: content projections, stable IDs, generation with visible context,
the storage adapter, story time, and retiring the old app. The story model
continues in `docs/strategies/structure-first.md`.

## Outcome

A rebuilt app with a sound foundation. Content has stable IDs and AI
projections, and round-trips exactly. Generation uses world context the writer
can see and edit, and its output arrives as attributed, reviewable AI segments.
Story time can say what holds and what has been revealed at any scene. Storage
goes through an adapter. The old app is gone, and the checks pass.

## Success criteria

- S1: Every allowed content node type has defined `prose`, `addressable`
  and `plain+map` projections, and a world round-trips exactly through
  save and load and through every export and import adapter. Shown by projection
  tests and round-trip tests over fixtures. Normal editing never re-parses a
  whole document from text, shown by there being no such call path outside
  import.
- S2: Every block has a stable ID that survives reload, split, merge and
  paste. Shown by headless editor tests.
- S4: Generation assembles a request from a window of the document, cards for
  entities mentioned nearby, and explicit pins. The request is stored and can
  be viewed and edited before it is sent. Output lands in an AI segment with
  provenance in the sidecar, and accept and regenerate work. Shown by a
  scenario test against a stub OpenAI-compatible server.
- S10: For any scene, the app can say which facts hold at its event and which
  have been revealed by its position in narrative order, including under a
  stasis or time-dilation frame. Shown by tests over a fixture world with a
  flashback and a paused frame.
- S7: Every action the app exposes (generation, accepting and regenerating
  AI segments, story-time queries) is a typed command callable without the
  UI. Shown by tests that call the commands directly.
- S8: The old paths are removed: distilbert-NER, tiptap, global chat,
  template leftovers and unused dependencies. Typecheck, lint, tests and build
  are clean on `master`.
- S9: Persistence goes through a storage adapter, with IndexedDB as the
  first implementation. There is no direct IndexedDB access outside the
  adapter, shown by a contract test and a search for direct access. Records
  are ready for sync: client-generated IDs, a change time on each record
  (`updatedAt`, or `createdAt` for stored requests, which never change), and
  tombstones for deletes, shown by the contract test. Snapshots are
  device-local history and are not synced.

## Scope

In scope:

- the editor
- world entries and relations
- generation and context
- the storage adapter
- story time
- removing the old app

Out of scope:

- the story model (`docs/strategies/structure-first.md`)
- the entity pipeline, discovery and bookkeeping, AI edit proposals and talk
  pages (moved out on 2026-10-29, to be re-planned under the story model)

- multi-user collaboration
- the sync backend, the inference proxy and server-side jobs (a likely next
  mission; records are sync-ready in this one)
- an MCP server (the commands make it possible later)
- strict continuity checking against a canon (a non-goal; see
  `docs/strategies/structure-first.md`)
- tables, media, callouts and other node types beyond the schema list
- desktop packaging

Environment: one user (the author), using desktop Chromium and a phone, with
local llama.cpp and hosted OpenAI-compatible providers (OpenRouter,
featherless). It should be usable by others later, but it is not
being hardened for them yet.

## Authority

The orchestrator may change, without asking:

- the increments, their sequencing and the issues
- libraries within the Shape
- how keep-list modules are ported

These must come back to the human:

- the success criteria
- reopening the platform, the rebuild approach, or time-indexed facts
- the story-position model behind time-indexed facts
- adding node types beyond the schema list
- dropping a keep-list item
- adding a backend service
