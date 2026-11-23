---
schema: atelier.item
schema_version: 3
id: worldcrafter-lhh3
title: Talk pages and world inbox
status: building
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

- [ ] `StorageAdapter` persists `Topic` and `TalkMessage` records (world, scene, passage, or bible-record scope; `open` / `resolved` / `archived` status; human or attributed model author with stored request ID and tool-call trace reference).
- [ ] The Night Edition `Topics` view lists topics by scope, displays the World Inbox (open AI-started topics and surfaced story contradictions), and runs live multi-turn conversations through the Story Agent Runner (`worldcrafter-667u`).
- [ ] Component and scenario tests (against a stub LLM server) verify creating a topic, running a multi-turn agent turn with tool calls, attributing model messages, resolving/archiving topics, and listing the World Inbox.
- [ ] Matches the `Topics` specification in the amended `DESIGN.md` (`worldcrafter-if6h`); `cd app && bun run check` passes.

## Scope

In: Talk-page persistence in `StorageAdapter`, Night Edition `Topics` and World Inbox UI, and Story Agent Runner integration.
Out: Anchored launch triggers from inspector/scene views (`worldcrafter-rxvy`), prompt/tool-trace editing UI (`worldcrafter-w4mr`), and block-ID prose edit proposals (`worldcrafter-yx9v`).
