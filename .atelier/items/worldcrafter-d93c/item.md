---
schema: atelier.item
schema_version: 3
id: worldcrafter-d93c
title: Wrap the generate app tests' profile saves in act so bun run check prints no React warnings
status: open
mission: null
labels: []
priority: medium
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-23T05:25:10.012122487Z
---

## Goal

Taken from deferred finding worldcrafter-xodp/3-xg9o.2, in .atelier/items/worldcrafter-xodp/reviews/3-xg9o.md:

> Finding 2: Wrap the new tests' profile saves in act
> Recommendation: defer
>
> `app/src/app/generate.app.test.tsx:789` and `:850` call `services.generation.profile.save` outside `act`. Those calls notify React subscribers synchronously, and the full check now prints four "An update to Rail inside a test was not wrapped in act(...)" warnings while running the two new tests. Wrap these saves in the existing `act` helper so new React warnings remain visible. This does not block this item: subsequent awaited UI actions flush the updates, and both regression tests assert the outgoing model and pass.

## Done when

## Scope
