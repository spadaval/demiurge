---
schema: atelier.review
schema_version: 3
round: 1
commit: 05b89c88e9f9e4c250344fc6e099d662bbcd500c
reviewers:
- 01a20669-1048-7c20-b995-9240e5ae5eb0
model: grok-4.6
verdict: approve
created_at: 2026-11-23T03:18:08.643751013Z
---

## Summary

- Complexity: high. A new schema combinator, a 79-tool registry whose mutation fields are checked against `StoryCommand` at compile time, store-backed prose for `trace`, and a ~1,500-line extraction of CLI queries and edit reports. This is the contract `worldcrafter-667u` will keep.
- Value: high. Mission `worldcrafter-r7vd` names store-backed queries and typed story tools as a success criterion, and the agent runner is blocked on this item.
- Risk of merging it: medium. Wrong structured results would look like the story to the runner; the CLI still prints the same lines, the registry and store-backed `trace` are tested, and nothing in the UI calls these tools yet.

The value warrants the change. A thinner registry that omitted queries, or left edit reports in the CLI, would not give the runner a single store-backed path.

Reviewed `git diff master...05b89c88e9f9e4c250344fc6e099d662bbcd500c` against every Done when line and the Report. Read `tools.ts`, `tool-schema.ts`, `queries.ts`, `edit-report.ts`, `stored-prose.ts`, `refs.ts`, the `store.ts` `before` return, `scripts/story.ts` dispatch, and `tools.test.ts` / `tool-schema.test.ts`. Walked `MatchesFields` / `mutation()`, the `setPosition` / `constrain` / `fromOne` converts against the CLI builders, `executeStoryTool` / `runMutation` refusal vs storage-error split, `editReport` + untruncated `warnings`, and `storedProse` missing/invalid/block mapping against `projectProse` spans. Compared extracted `showRecord`, `changedRef`, `parseRef`, and `newTimelineMessages` to `master`'s CLI copies; they match, with `staleText` now returning data and `countNote` skipping a null first value.

`cd app && bun test src/story/tools.test.ts src/story/tool-schema.test.ts src/story/store.test.ts scripts/story.test.ts scripts/round/round.test.ts` passed (119). `cd app && bun run check` passed: `tsc --noEmit` clean, biome 180 files no fixes, 1275 tests / 0 fail across 59 files. "every example runs" took 4.1s here against bun's 5s default.

Could not check a live model calling the tools, or the author's claimed `tsc` failures for a dropped/extra/wrong-typed mutation field (the `MatchesFields` intersection would refuse those). Filed the CLI example-timeout flake as [worldcrafter-ko6g](.atelier/items/worldcrafter-ko6g/item.md), beside `worldcrafter-08kf`.

## Finding 1: markGapDeliberate does not accept the form `gaps` lists
Recommendation: defer
`gapsQuery` prints `[drive-without-origin drive:calm]` and `[no-reader-question story]` (`queries.ts:1170-1184`, via `gapName` in `refs.ts:73`). `markGapDeliberate` / `unmarkGapDeliberate` (`tools.ts:896-908`) take `oneOf(GAP_KINDS)` (`drive_without_origin`) and `ref: null` for the whole story. The mutation description says to "Give the kind and ref as the gaps tool lists them." Structured `data.kind` / `data.ref` already match the schema; a model that copies the lines or `data.gap` is refused. The CLI converts with `gapKind` and `refOrStory` (`scripts/story.ts:255-262`). Accept the hyphenated names and `story`, as the CLI does, or point the description at `data.kind` and `data.ref`.

## Finding 2: Query refusals still name CLI commands
Recommendation: defer
`spanQuery` refuses an unplaced event with `(set-position)` (`queries.ts:1111`). `renderQuery` refuses unknown sections with `--section takes …` (`queries.ts:1263-1266`). Both strings are now the tool result the model reads; the tools are `setPosition` and `render` with `sections`. Keep CLI wording in `scripts/story.ts` if needed, and map it at the tool boundary.

## Finding 3: Every mutation loads every scene document
Recommendation: defer
`mutation()` sets `readsProse: true` for all 68 commands (`tools.ts:285`). `runMutation` then calls `storedProse` after the save (`tools.ts:1137-1143`), so `addActor` reads every linked document and will attach `proseNotRead` for an unrelated missing file. A `StorageFailure` from that load also turns a write that already landed into `err`. Load prose when `changedRef` can produce stale suspects, or treat a post-save prose failure as empty prose plus `proseNotRead` rather than failing the call.
