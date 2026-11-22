---
schema: atelier.mission
schema_version: 3
id: worldcrafter-3z9j
title: Selective direct editing, prose finishing, and multi-device sync
status: open
labels:
- editor
- sync
- polish
lead: null
planners:
- ace64553-eec2-406a-84c3-c6360b8f5131
created_at: 2026-11-22T22:38:26.476173643Z
---

## Why

Started from Sumeet's direction on 2026-11-22: once the unified story store, app-owned agent runtime (`worldcrafter-r7vd`), and Night Edition inspector + scoped conversation UI (`worldcrafter-mtkn`) are working, Demiurge can slide along the Codex → VS Code axis where direct human control earns its keep—connecting the bible to hands-on prose finishing with custom samplers, adding direct-manipulation controls for high-frequency bible edits, and shipping multi-device sync and an optional inference proxy.

## Outcome

Hands-on prose finishing powered by live story-bible context (reusing `worldcrafter-667u`'s context-packet builder and `worldcrafter-w4mr`'s shared Context Viewer) and ergonomic sampler controls, selective direct-manipulation controls for the bible edits that are faster to click than prompt, device-local snapshot retention, sync-ready storage with tombstones, and a Cloudflare Worker sync backend plus optional inference proxy for laptop-and-phone access.

## Success criteria

- Scene prose generation reuses `worldcrafter-667u`'s scene context-packet builder and `worldcrafter-w4mr`'s shared `app/src/generate/context-viewer.tsx` (no second context builder), with writer notes excluded (`worldcrafter-wknl`) and generation shortcuts, stale-pin clearing, and retarget fixes landed (`worldcrafter-aq1r`, `worldcrafter-xodp`).
- High-frequency bible actions (answering/rejecting open-question candidates, reordering scenes, changing viewpoints, updating counts, marking deliberate gaps) work with one-click UI controls calling the same `app/src/story/commands.ts` mutations as the agent (`worldcrafter-o7to`, after `worldcrafter-lgz8`, `worldcrafter-7r87`, `worldcrafter-wqh0`, `worldcrafter-hqca`).
- Storage has sync-ready tombstones across all synced collections including the story bible (`worldcrafter-4t98`, after `worldcrafter-lgz8`), a device-local snapshot retention policy approved by Sumeet (`worldcrafter-my9t`), a Cloudflare Worker sync backend with last-write-wins + tombstone conflict tests (`worldcrafter-ji5d`), and an optional Cloudflare Worker inference proxy (`worldcrafter-gs9g`).
- `cd app && bun run check` passes.

## Scope

In:
- Connecting the unified story bible to the shared prose Context Viewer and fixing generation ergonomics & writer-notes exclusion (`worldcrafter-aq1r`, `worldcrafter-xodp`, `worldcrafter-wknl`).
- Selective direct-manipulation bible controls (`worldcrafter-o7to`).
- Sync-ready tombstones (`worldcrafter-4t98`), device-local snapshot retention (`worldcrafter-my9t`), Cloudflare Worker sync backend (`worldcrafter-ji5d`), and optional Cloudflare Worker inference proxy (`worldcrafter-gs9g`).

Out:
- Buying `demiurge.ink` and renaming the hosted Worker (`worldcrafter-v61k`, labelled `needs-human` outside this mission so it doesn't block closing).
- Multi-user real-time collaboration.
- Full CRUD form builders for rarely hand-edited record types (keep agent-driven unless dogfooding proves otherwise).
- Automated heuristic/LLM entity discovery (`worldcrafter-8agg`) and block-ID prose suggestion diffs (`worldcrafter-yx9v`), which remain separate backlog items.

## Authority

Agents may choose UI ergonomics, sync wire format, and Worker implementation details within this scope. Destructive snapshot thinning rules (`worldcrafter-my9t`), deploying the Worker, buying `demiurge.ink` (`worldcrafter-v61k`), pushing to remotes, or spending money waits for Sumeet.

## Result
