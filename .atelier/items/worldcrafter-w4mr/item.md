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
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T22:39:02.185113934Z
---

## Goal

Build the prompt, context, tool-trace, and impact inspector for app-owned Story Agent Runner sessions so the writer can view and edit the system prompt and assembled context packet before/between turns, inspect every typed tool call and its result/contradictions, and review `trace` impact suspects after structural changes.

## Done when

- [ ] Before or during any agent session, the writer can inspect and edit the system prompt, active model/sampler profile, and deterministic context packet without leaving the workspace.
- [ ] Every agent turn displays its typed tool calls, arguments, structured results, kept contradictions, and any `trace` suspects with clickable links to affected records or scenes.
- [ ] Matches `DESIGN.md` apparatus rules (hairlines, Source Sans 3 apparatus, vermilion reserved strictly for AI prose segments).
- [ ] Component tests cover editing a prompt, inspecting a multi-tool turn, and clicking a `trace` suspect; `bun run check` passes.

## Scope

In: Agent session inspection and prompt-override UI in `app/src/app/`.
Out: Runner backend (`worldcrafter-667u`) and direct bible CRUD forms (`worldcrafter-o7to`).
