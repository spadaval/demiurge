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
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T22:39:04.439988908Z
---

## Goal

Wire the unified story bible directly into the scene prose Context Viewer and generation pipeline (`app/src/context/`, `app/src/generate/`, `app/src/app/generation.ts`) so hands-on prose drafting with local `llama.cpp` or hosted finetunes automatically receives `reader-order --before`, opening counts, viewpoint dramatic-irony marks, active drives, and planted objects—all visible and editable before sending.

## Done when

- [ ] `app/src/context/builder.ts` assembles scene generation requests from the unified story bible (scene summary, viewpoint, dramatic-irony marks, opening counts, active drives/objects, and nearby prose) with a clear breakdown in the Context Viewer.
- [ ] The writer can inspect, edit, pin, or exclude bible sections in the request slip before sending to any configured model/sampler profile.
- [ ] Scenario tests against a stub OpenAI-compatible server verify assembled context, edited request passthrough, and vermilion AI segment provenance.
- [ ] `bun run check` passes in `app/`.

## Scope

In: `app/src/context/`, `app/src/generate/`, and `app/src/app/generation.ts`.
Out: Generation shortcuts/profile retargeting (`worldcrafter-xodp`) and writer-notes representation (`worldcrafter-wknl`).
