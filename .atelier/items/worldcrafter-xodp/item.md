---
schema: atelier.item
schema_version: 3
id: worldcrafter-xodp
title: 'Generation ergonomics: shortcuts, stale pins, and retarget fixes'
status: open
mission: worldcrafter-3z9j
labels: []
priority: medium
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-10-18T05:27:28.188005921Z
---

## Goal

Remaining ergonomics and bug fixes on the shipped prose generation UI (`app/src/app/generation.ts`, `app/src/generate/`):
1. Keyboard shortcuts for generate, send, stop, and accept.
2. Clearing a stale pin in the request slip (currently fails build with `unknown_pin`).
3. Missing-anchor recovery when the block a request continues from has been deleted or unwrapped (offer to rebuild from the caret instead of failing with `block_not_found`).
4. Retarget cleanup: retarget in memory for display (store revision only on send, avoiding duplicate revisions and writes in read-only tabs), strip incompatible sampler keys on provider switch (e.g. `n_probs` sent to OpenRouter), and retarget model-only changes at the same URL. *(Stable profile ID `name` and retarget info notice are already shipped in `app/src/generate/profile.ts`.)*
5. Refresh `.impeccable/design.json` and repoint the surface brief from `writing-workspace` to `app/src/app`.

## Done when

- [ ] Each of items 1–5 above is either implemented with unit/component tests or explicitly dropped with a recorded reason in the Report.
- [ ] `cd app && bun run check` passes.

## Scope

In: Keyboard shortcuts, stale-pin clearing, missing-anchor recovery, retarget revision/sampler-key fixes, and `.impeccable/` metadata refresh.
Out: Wiring unified story-bible sections into the context builder (`worldcrafter-aq1r`) and shared Context Viewer extension (`worldcrafter-w4mr`).
