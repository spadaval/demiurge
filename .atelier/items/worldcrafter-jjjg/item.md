---
schema: atelier.item
schema_version: 3
id: worldcrafter-jjjg
title: Story tool texts name CLI forms the model cannot use
status: open
mission: null
labels: []
priority: low
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-23T04:13:38.311674347Z
---

## Goal

Taken from deferred finding worldcrafter-7r87/2-w96f.1, in .atelier/items/worldcrafter-7r87/reviews/2-w96f.md:

> Finding 1: markGapDeliberate does not accept the form `gaps` lists
> Recommendation: defer
> Was: 1-bkw1.1
> Now: kept
>
> `gapsQuery` still prints `[drive-without-origin drive:calm]` and `[no-reader-question story]` (`queries.ts:1188-1210`, via `gapName` in `refs.ts:73`). `markGapDeliberate` / `unmarkGapDeliberate` (`tools.ts:896-908`) take `oneOf(GAP_KINDS)` (`drive_without_origin`) and `ref: null` for the whole story. The mutation description still says to "Give the kind and ref as the gaps tool lists them." Structured `data.kind` / `data.ref` already match the schema; a model that copies the lines or `data.gap` is refused. The CLI still converts with `gapKind` and `refOrStory` (`scripts/story.ts:257-262`). Accept the hyphenated names and `story`, as the CLI does, or point the description at `data.kind` and `data.ref`.

Also covers finding 2 of the same review (worldcrafter-7r87/2-w96f.2): `spanQuery` refuses with `(set-position)` and `renderQuery` with `--section takes …`, texts the model reads as tool results.

## Done when

- [ ] `markGapDeliberate` and `unmarkGapDeliberate` accept a gap in every form the `gaps` tool prints it (hyphenated kinds and `story`), or their description names the `data.kind` and `data.ref` fields to copy; a test copies a gap from a `gaps` result into the call.
- [ ] No story tool result names a CLI command or flag (`set-position`, `--section`); refusals name the tool and argument instead, and the CLI output in `app/scripts/story.test.ts` is unchanged.
- [ ] `cd app && bun run check` passes.

## Scope

In: `app/src/story/tools.ts`, `app/src/story/queries.ts`, `app/scripts/story.ts` where CLI wording has to move to it.
Out: new tools or queries.
