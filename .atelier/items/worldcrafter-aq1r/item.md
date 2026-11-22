---
schema: atelier.item
schema_version: 3
id: worldcrafter-aq1r
title: Feed unified story bible context into the scene prose Context Viewer
status: open
mission: worldcrafter-3z9j
labels:
- context
- editor
priority: high
blocked_by:
- worldcrafter-lgz8
- worldcrafter-667u
- worldcrafter-w4mr
- worldcrafter-wknl
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T22:39:04.439988908Z
---

## Goal

Feed `worldcrafter-667u`'s deterministic scene context-packet builder directly into the scene prose generation pipeline (`app/src/context/builder.ts`, `app/src/generate/`, `app/src/app/generation.ts`) and display/edit it in the shared Context Viewer (`app/src/generate/context-viewer.tsx`, extended by `worldcrafter-w4mr`)—without creating a second context builder or a second viewer component.

## Done when

- [ ] `app/src/context/builder.ts` consumes `worldcrafter-667u`'s scene context-packet builder (scene summary, viewpoint, dramatic-irony marks, opening counts, active drives/objects, and nearby prose) rather than duplicating context assembly.
- [ ] Prose generation renders and edits the assembled request through the shared `app/src/generate/context-viewer.tsx` (`worldcrafter-w4mr`), supporting pinning/excluding bible sections (and preserving/porting `worldcrafter-xodp`'s stale-pin clearing test) before sending to any configured model/sampler profile.
- [ ] Scenario tests against a stub OpenAI-compatible server verify that the stored request holds the exact bible sections as sent, edited requests pass through, and no `[[ ... ]]` writer notes (`worldcrafter-wknl`) reach the request.
- [ ] `cd app && bun run check` passes.

## Scope

In: Wiring `worldcrafter-667u`'s context-packet builder into `app/src/context/builder.ts`, `app/src/generate/`, and `app/src/app/generation.ts` using the shared `context-viewer.tsx`.
Out: Keyboard shortcuts, stale-pin clearing, and profile retarget fixes (`worldcrafter-xodp`), and writer-notes representation (`worldcrafter-wknl`).
