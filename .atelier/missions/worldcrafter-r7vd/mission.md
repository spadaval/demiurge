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
lead: null
planners:
- ace64553-eec2-406a-84c3-c6360b8f5131
created_at: 2026-11-22T22:38:26.107051905Z
---

## Why

Started from Sumeet's direction on 2026-11-22: a story is a complex typed schema that should live in a typed store rather than plain files on disk, and fiction workflows need full control over system prompts, tool schemas, deterministic context assembly, output formats, and model/sampler routing—things coding harnesses obscure or fight. Right now `app/src/` holds two disconnected models (`app/src/story/` from Rounds 1–5 vs. `app/src/world/` + `app/src/time/` + `app/src/outline/` from the Oct rebuild), and `app/src/llm/` supports single-turn streaming without multi-turn tool calling.

## Outcome

One unified typed story bible persisted in `StorageAdapter` (IndexedDB + exact JSON export/import), linked to scene Plate documents, paired with an app-owned, headless-testable Story Agent Runner that invokes `app/src/story/commands.ts` as native typed LLM tools with full control over system prompt, deterministic scene context, and model/sampler profiles.

## Success criteria

- The story bible (`app/src/story/`) is persisted through `StorageAdapter` with scenes linked to Plate documents, replacing the split with `app/src/world/` and `app/src/outline/`, and every world round-trips losslessly through JSON export/import (`worldcrafter-lgz8`, `worldcrafter-qizl`).
- Every story mutation and query in `app/src/story/commands.ts` is exposed as a typed LLM tool returning structured results, validation errors, kept contradictions, and `trace` suspects (`worldcrafter-7r87`).
- `app/src/llm/` supports multi-turn tool calling and streaming across OpenAI-compatible backends (OpenRouter, featherless, local `llama.cpp`) with full sampler and system-prompt passthrough (`worldcrafter-erje`).
- The Story Agent Runner executes multi-turn sessions against a stub LLM server with editable system prompts (seeded from `craft.md`), deterministic scene context packets (`reader-order --before`, counts, viewpoint marks), full tool-call/request logging, and separate planning vs. prose-finishing profiles (`worldcrafter-667u`).
- `bun run check` in `app/` passes with no browser-only APIs inside the store, tool layer, or runner.

## Scope

In:
- Unified story-bible persistence in `StorageAdapter` and scene-to-document linkage (`worldcrafter-lgz8`, `worldcrafter-qizl`).
- Native typed tool registry over `app/src/story/commands.ts` (`worldcrafter-7r87`).
- Multi-turn tool-calling support in `app/src/llm/` (`worldcrafter-erje`).
- App-owned Story Agent Runner with editable prompts, deterministic context assembly, and model profiles (`worldcrafter-667u`).

Out:
- Night Edition inspector screens and talk-page UI (`worldcrafter-mtkn`).
- Direct-manipulation bible editors and Cloudflare Worker sync/proxy (`worldcrafter-3z9j`).
- Dropping `app/src/time/`'s relativistic/stasis frame math (keep modular so story events can attach to frames when needed).

## Authority

Agents may choose internal module layout, tool-call JSON schemas, and IndexedDB migration versions within `StorageAdapter`. Changes to the core story primitives or public export format come back to Sumeet; pushing and deploying wait for Sumeet.

## Result
