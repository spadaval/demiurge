---
schema: atelier.item
schema_version: 3
id: worldcrafter-w4mr
title: 'Agent session and prompt inspector: view and edit system prompt, context packet, tool trace, and trace diffs'
status: open
mission: worldcrafter-mtkn
labels:
- ui
- agent
priority: high
blocked_by:
- worldcrafter-if6h
- worldcrafter-667u
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T22:39:02.185113934Z
---

## Goal

Extend the existing Context Viewer component (`app/src/generate/context-viewer.tsx` and gloss-column slip) to serve as the shared prompt, context, tool-trace, and impact inspector for app-owned Story Agent Runner sessions (`worldcrafter-667u`)—so `worldcrafter-aq1r` in `worldcrafter-3z9j` reuses the same viewer component rather than building a second one.

**Edit-scope rules:**
- **System prompt / model profile edits**: explicitly scoped to either *this session only* (persisted on the session record) or *save as profile default*.
- **Assembled context packet edits**: apply to *the next turn only*, stored as an immutable request revision on that turn for exact provenance and replay.

## Done when

- [ ] Extends `app/src/generate/context-viewer.tsx` (as the single shared viewer for both agent sessions and prose generation) to inspect and edit the system prompt (session-only vs. save-as-default), active model/sampler profile, and next-turn assembled context packet (stored as an immutable request revision for replay).
- [ ] Every agent turn displays its typed tool calls, arguments, structured results, kept contradictions, and any `trace` suspects with clickable links to affected records or scenes.
- [ ] Matches the amended `DESIGN.md` (`worldcrafter-if6h`) apparatus rules (hairlines, Source Sans 3 apparatus, vermilion reserved strictly for AI prose segments).
- [ ] Component tests cover session-vs-default prompt edits, next-turn context-revision persistence, inspecting a multi-tool turn, and clicking a `trace` suspect; `cd app && bun run check` passes.

## Scope

In: Agent session inspection and prompt-override UI in `app/src/app/`.
Out: Runner backend (`worldcrafter-667u`) and direct bible CRUD forms (`worldcrafter-o7to`).
