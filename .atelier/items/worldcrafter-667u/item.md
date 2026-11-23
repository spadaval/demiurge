---
schema: atelier.item
schema_version: 3
id: worldcrafter-667u
title: Build app-owned story agent runner with editable system prompt, deterministic scene context, and model profiles
status: building
mission: worldcrafter-r7vd
labels:
- agent
- context
priority: high
blocked_by:
- worldcrafter-7r87
- worldcrafter-erje
implementers:
- thread:delegated-task:command%3Amcp%3A51564328-ab55-47e2-a228-a246e1757d43%3Adelegate-task%3A75462b19-5424-4689-8d4b-58711f4caff4
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T22:39:00.451015354Z
---

## Goal

Build the app-owned Story Agent Runner: a DOM-free, headless-testable multi-turn agent loop over `app/src/llm/` and the story tool registry (`worldcrafter-7r87`) that gives full control over system prompt, deterministic scene/record context assembly, tool execution trace, and separate model/sampler profiles for planning/conversation vs. prose finishing.

## Done when

- [ ] The runner accepts a scope (world, scene, or bible record), an editable system prompt (defaulting to craft guidance derived from `.agents/skills/story-sketch/craft.md`), a model/sampler profile, and a deterministic context packet assembled from the store (including `reader-order --before`, opening counts, viewpoint marks, and relevant records).
- [ ] Every turn's assembled request, model output, tool calls, tool results, and story-record mutations are recorded in storage for inspection and replay.
- [ ] Supports human-in-the-loop pause/cancel, max-step guardrails, and separate profile bindings (e.g., reasoning model for structural/talk sessions vs. finetune/local model for prose drafting).
- [ ] Scenario tests against a stub OpenAI-compatible server verify a multi-turn outline/rework session and a scene-context turn end-to-end.
- [ ] `bun run check` passes in `app/`.

## Scope

In: Headless agent runner, context-packet builder, session/turn persistence types, and scenario tests in `app/src/`.
Out: Browser UI (`worldcrafter-mtkn`) and Cloudflare Worker execution (`worldcrafter-ji5d`).
