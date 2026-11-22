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

Started from Sumeet's direction on 2026-11-22: once the unified story store, app-owned agent runtime (`worldcrafter-r7vd`), and Night Edition inspector + scoped conversation UI (`worldcrafter-mtkn`) are working, Demiurge can slide along the Codex → VS Code axis where direct human control earns its keep—connecting the bible to hands-on prose finishing with custom samplers, adding direct-manipulation controls for high-frequency bible edits, and shipping multi-device sync and `demiurge.ink`.

## Outcome

Hands-on prose finishing powered by live story-bible context and ergonomic sampler controls, selective direct-manipulation controls for the bible edits that are faster to click than prompt, sync-ready storage with a Cloudflare Worker sync/proxy backend for laptop-and-phone access, and the hosted app live on `demiurge.ink`.

## Success criteria

- Scene prose generation's editable Context Viewer pulls directly from the unified story bible (`reader-order --before`, active drives, opening counts, viewpoint marks, writer notes excluded) with ergonomic shortcuts, pins, and profile retargeting (`worldcrafter-aq1r`, `worldcrafter-xodp`, `worldcrafter-wknl`).
- High-frequency bible actions (answering/rejecting open-question candidates, reordering scenes, changing viewpoints, updating counts, marking deliberate gaps) work with one-click UI controls calling the same `commands.ts` mutations as the agent (`worldcrafter-o7to`).
- Storage has sync-ready tombstones (`worldcrafter-4t98`), bounded snapshot retention (`worldcrafter-my9t`), and a Cloudflare Worker sync backend + optional inference proxy so one writer can switch between laptop and phone (`worldcrafter-ji5d`).
- Once Sumeet acquires `demiurge.ink`, the hosted app moves to it and retires the old `worldcrafter` Worker name (`worldcrafter-v61k`).

## Scope

In:
- Connecting the unified story bible to the Plate prose Context Viewer and fixing generation ergonomics & writer-notes exclusion (`worldcrafter-aq1r`, `worldcrafter-xodp`, `worldcrafter-wknl`).
- Selective direct-manipulation bible controls (`worldcrafter-o7to`).
- Sync-ready tombstones, snapshot retention, Cloudflare Worker sync + inference proxy, and `demiurge.ink` cutover (`worldcrafter-4t98`, `worldcrafter-my9t`, `worldcrafter-ji5d`, `worldcrafter-v61k`).

Out:
- Multi-user real-time collaboration.
- Full CRUD form builders for rarely hand-edited record types (keep agent-driven unless dogfooding proves otherwise).
- Automated heuristic/LLM entity discovery (`worldcrafter-8agg`) and block-ID prose suggestion diffs (`worldcrafter-yx9v`), which remain separate backlog items.

## Authority

Agents may choose UI ergonomics, sync wire format, and Worker implementation details within this scope. Buying `demiurge.ink`, deploying the Worker, pushing to remotes, or spending money waits for Sumeet.

## Result
