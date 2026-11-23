---
schema: atelier.item
schema_version: 3
id: worldcrafter-ri2r
title: A list paragraph renders <ul> inside <p>, which React warns is invalid HTML
status: open
mission: null
labels: []
priority: medium
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-23T07:14:30.934326189Z
---

## Goal

A paragraph with `listStyleType` (the fixture's `doc-arrival` block `b_arr2`, or any bulleted line the writer makes) renders as Plate's `ListPlugin` wrapper `<ul><li>` inside the paragraph's `<p>` element. React logs "In HTML, <ul> cannot be a descendant of <p>. This will cause a hydration error." every time such a document opens, and a browser may re-parent the list. Found while testing `worldcrafter-wqh0`, whose inspector test opened `doc-arrival`; that test now opens another scene instead.

## Done when

- [ ] Opening a document with a bulleted or numbered paragraph renders valid nesting (no `<ul>`/`<ol>` inside `<p>`) and React logs no nesting warning; a component test opens one and checks both.
- [ ] Lists keep their look, indent and toggling (`app/src/editor/document-editor.test.ts` passes); `cd app && bun run check` passes.

## Scope

In: how list paragraphs render in `app/src/editor/` (the paragraph element for list blocks, or the `ListPlugin` render options).
Out: the content schema and its Markdown projection.
