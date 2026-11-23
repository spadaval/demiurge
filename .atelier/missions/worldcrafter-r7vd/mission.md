---
schema: atelier.mission
schema_version: 3
id: worldcrafter-r7vd
title: Unify story bible in app storage and build app-owned story agent runtime
status: open
labels:
- architecture
- storage
- agent
lead: mcp:fc568ec9-7676-4101-b8d0-b66d173f335e
planners:
- ace64553-eec2-406a-84c3-c6360b8f5131
created_at: 2026-11-22T22:38:26.107051905Z
---

## Why

Started from Sumeet's direction on 2026-11-22 (superseding `worldcrafter-2y4g`'s single-file-on-disk trial format and replacing the dropped rebuild mission `worldcrafter-3otd`): a story is a complex typed schema that should live in a typed store rather than plain files on disk, and fiction workflows need full control over system prompts, tool schemas, deterministic context assembly, output formats, and model/sampler routing—things coding harnesses obscure or fight.

Right now `app/src/` holds two disconnected models (`app/src/story/` from Rounds 1–5 vs. `app/src/world/` + `app/src/time/` + `app/src/outline/` from the Oct rebuild), read queries (`show`, `reader-order --before`, `span`, `trace`) live inside the `node:fs`-coupled CLI `app/scripts/story.ts`, and `app/src/llm/` supports single-turn streaming without multi-turn tool calling.

**Unification rule (approved by Sumeet on 2026-11-22, superseding `worldcrafter-ddha`'s entry-document split and `worldcrafter-2y4g`'s single-file trial format):**
- `app/src/story/` is the canonical story-bible schema persisted in `StorageAdapter` (every field of `Story`, including the full `Story.timeline` (`Timeline`: `events`, `positions`, `constraints`, `placements`, `frames`, `correspondences`, `follows`, `reveals`, `worldUnit`) as well as premise, actors, drives + turns + relations, causes, participants, facts, objects, counts, memberships, versions, knowledge, open questions + candidates, reader questions, scenes, and deliberate gaps).
- Each `Scene` record links by `documentId` to a Plate `Document` prose tree (preserving block IDs and AI segments) and carries optional `book`/`chapter` grouping; `worldcrafter-lgz8` also updates `docs/rebuild/story-model.md` (Records) to match. Existing `app/src/world/`, `app/src/outline/`, and `app/src/time/` modules remain intact during this mission (not deleted here) so existing `app/src/app/`, `context/`, and `time/` code keeps working until UI consumers migrate in `worldcrafter-mtkn` and `worldcrafter-3z9j`.
- Non-actor world kinds (`place`, `culture`, `magic_system`, `technology`, `natural_law`, `species`) stay representable via world facts (`--about`) and existing `worldEntries` documents until the UI migration settles whether a dedicated entry-document link is needed.

## Outcome

One unified story-bible store persisted through `StorageAdapter` (memory and IndexedDB) with lossless JSON whole-world export/import, pure store-backed story queries extracted from `app/scripts/story.ts` and exposed with `commands.ts` as native typed LLM tools, multi-turn tool-calling in `app/src/llm/`, and an app-owned, headless-testable Story Agent Runner with full control over system prompts, deterministic scene context, and model/sampler profiles.

## Success criteria

- The full `app/src/story/` bible is persisted through `StorageAdapter` (memory and IndexedDB) with scenes linked to Plate `Document` records, without breaking existing `world/`, `outline/`, or `time/` consumers (`worldcrafter-lgz8`).
- A whole world (documents, annotations, stored requests, story bible, and active legacy collections) round-trips losslessly through JSON export/import, and every allowed content node type has defined `prose`, `addressable`, and `plain+map` projections (`worldcrafter-qizl`).
- Read queries (`show`, `reader-order --before`, `span`, `touches`, `trace`, `contradictions`, `gaps`) are extracted from `app/scripts/story.ts` into pure store-backed functions in `app/src/story/` (with `trace` reading scene prose via `StorageAdapter` + `prose` projection), and all story mutations and queries are exposed as native typed LLM tools (`worldcrafter-7r87`).
- `app/src/llm/` supports multi-turn tool calling and streaming across OpenAI-compatible backends (OpenRouter, featherless, local `llama.cpp`) with full sampler and system-prompt passthrough (`worldcrafter-erje`).
- The Story Agent Runner executes multi-turn sessions against a stub LLM server with editable system prompts (seeded from `craft.md`), deterministic scene context packets (`reader-order --before`, counts, viewpoint marks), full tool-call/request logging, and separate planning vs. prose-finishing profiles (`worldcrafter-667u`).
- Story domain logic, the tool registry, and the agent runner use no DOM or browser-only APIs (IndexedDB stays isolated behind `StorageAdapter`, tested headlessly with the memory adapter); `cd app && bun run check` passes.

## Scope

In:
- Story-bible persistence in `StorageAdapter` and scene-to-document linkage (`worldcrafter-lgz8`).
- Whole-world JSON export/import round-trip and projection coverage (`worldcrafter-qizl`).
- Extracting read queries from `app/scripts/story.ts` and exposing story commands + queries as native typed LLM tools (`worldcrafter-7r87`).
- Multi-turn tool-calling support in `app/src/llm/` (`worldcrafter-erje`).
- App-owned Story Agent Runner with editable prompts, deterministic context assembly, and model profiles (`worldcrafter-667u`).

Out:
- Retiring `app/src/world/`, `app/src/outline/`, or `app/src/time/` (kept intact until UI consumers migrate in `worldcrafter-mtkn` / `worldcrafter-3z9j`).
- Night Edition inspector screens and talk-page UI (`worldcrafter-mtkn`).
- Sync tombstones (`worldcrafter-4t98`), direct-manipulation bible editors, and Cloudflare Worker sync/proxy (`worldcrafter-3z9j`).

## Authority

Agents may choose internal module layout, tool-call JSON schemas, and IndexedDB migration versions within `StorageAdapter`. Changes to the core story primitives or public export format come back to Sumeet; pushing and deploying wait for Sumeet.

## Result
