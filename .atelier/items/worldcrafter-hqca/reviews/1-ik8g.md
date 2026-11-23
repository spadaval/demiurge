---
schema: atelier.review
schema_version: 3
round: 1
commit: 113b8827c97ad38da3441692584def302993380e
reviewers:
- thread:delegated-task:command%3Amcp%3A5f222b3c-4e10-472c-93a6-086e284463e6%3Adelegate-task%3A0fcf7beb-b221-4b35-af1c-333627afd871
model: gpt-6.1-sol
verdict: changes
created_at: 2026-11-23T07:20:16.903649812Z
---

## Summary

Complexity: high. This adds a reactive story store, a storage-write contract for every bible writer, passage matching, and scene-level gloss layout across several owners.
Value: high. These computations are needed for the requested live Night Edition apparatus, and the implementation covers all requested record types.
Risk of merging: high. The apparatus presents story facts as authoritative, so missing notes or incorrect ordering can silently mislead even though these changes do not rewrite the prose or bible schema.

I reviewed the full diff against master at 113b8827c97ad38da3441692584def302993380e, traced the calculations through the existing calendar, counts, learning and story-store functions, and checked each Done when line. The change's value warrants the added projection and reactive store; I found no substantially smaller change providing the same outcome.

Validation: `cd app && bun run check` passed (typecheck, Biome, 1,621 tests across 76 files); `bun run build` passed; `bun scripts/measure-layers.ts` measured nine toggles, 0 px prose movement, slowest click-to-paint 32.2 ms, and up to 14 visible notes. The focused component suite also passed independently. Existing tests exercise command and scripted-agent updates. The new pure tests cover record matching, scene fallback, count values, versions versus truth, calendar spans and viewpoint gaps.

I additionally ran two component reproductions from `/tmp/hqca-review-feeejb3b/collision.test.tsx`, using the demo and real app services. Both fail on the reviewed tree as detailed below. No implementation files were changed. I did not perform a manual visual review or test a live model service; the agent test uses scripted completions. The main report's check and paint-only claims hold, but the merged-source attachment and scene-level ordering guarantees have the exceptions below.

## Finding 1: Preserve source notes when a bible key lands on the same character
Recommendation: fix now

`app/src/layers/bible.ts:145` reserves key positions only among bible notes, while `app/src/layers/model.ts:138` appends those marks to the existing source marks without resolving collisions. `Sheet` uses this combination at `app/src/app/gloss.tsx:121`. Two notes can therefore end on the same character, each emitting the same one-character decoration with a different `wcKey` and `wcAnchor`. Slate keeps only the later bible anchor. `Gloss` cannot find the source anchor (`gloss.tsx:350`) and leaves the source note permanently hidden, even with its layer enabled.

Reproduction: keep the normal demo source, add one stable source Time note on `{ blockId: "p-tide", quote: "the tide turned" }`, and open the demo with all layers on. This is also the bible event's natural match. `assignKeys` assigns both notes a key, but the rendered prose contains only `data-anchor="bible/event/tide-turns"`; the source note's article has `data-visible="false"` and no position. A component expectation that both notes remain visible fails. Different quotes sharing an ending character have the same failure.

Resolve key positions across the combined sources, rather than within the bible alone. For example, reserve existing source-note endpoints when finding bible anchors, then use the already-supported scene fallback when no free match remains. Add a component regression covering the overlap so neither note disappears.

## Finding 2: Keep scene-level notes in assigned order after the key reaches aa
Recommendation: fix now

The new scene-note path in `app/src/editor/layer-plugin.tsx:348` correctly assigns keys after the anchored notes, but `app/src/app/gloss.tsx:313` sorts their letter strings lexicographically. `numeric: true` does not make letters positional: `aa` sorts between `a` and `b`, rather than after `z`. This older comparator now breaks the new arbitrary-length scene-level list. Every scene-level note has the same end-of-scene anchor, so `stackNotes` preserves this incorrect input order on screen as well as in the DOM; it cannot recover the intended order from separate text positions.

Reproduction: add 28 distinct objects to the bible, plant them in scene 4.2 in numerical order, and give them names absent from the prose so they become scene-level entries. After the reactive update, the component renders objects 14–27 first with keys `aa`–`an`, then objects 0–13 with keys `m`–`z`. An expectation that the scene entries preserve their assigned order fails. This also affects the narrow-screen keyed list.

Order notes by their index in the `assignKeys` map (or another numeric ordinal), rather than comparing the display letters. Cover a scene with more than 26 total notes, including unanchored entries.
