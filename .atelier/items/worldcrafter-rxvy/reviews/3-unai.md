---
schema: atelier.review
schema_version: 3
round: 3
commit: 2348b3e9b5e1b2b6c44b692b91196f448b64ce86
reviewers:
- thread:delegated-task:command%3Amcp%3A9756aa81-d581-4ad6-b842-b975f9f26726%3Adelegate-task%3A3bbccaa4-f635-479b-96cc-d043676e3cd2
model: gpt-6.1-sol
verdict: approve
created_at: 2026-11-23T08:32:23.251972679Z
---

## Summary

Reviewed the changes from `a9bf5b2` to `2348b3e`, the carried findings, and the passage-selection, stored-scope, staleness and layer callers. Checked the scene/record launch and context-packet integration against the Done when lines and Report. Ran `cd app && bun run check`: typecheck and Biome passed, and all 1,773 tests passed. This includes the scene, passage and bible-record component tests and the new blank-soft-line regressions. Also ran 30,000 exhaustive exact-span round trips over three-block combinations containing repeated text, blank soft lines, empty blocks and surrounding whitespace; every unchanged passage resolved to the selected spans. No browser or visual inspection was performed. React act warnings appeared in `generate.app.test.tsx`; I did not independently compare them with master.

- **Complexity: medium.** The whole change connects existing talk, inspector, context and editor-layer state; this round changes only passage matching and its regression coverage.
- **Value: high.** Starting a conversation from its subject is required by the mission, and preserving the selected words is necessary for passage topics.
- **Risk of merging: medium.** Incorrect anchors could silently mark the wrong prose, but the change is reversible and preserves stored scope fields.

The implementation remains proportionate to the outcome. The revised matcher fixes the carried paragraph-boundary problem without changing the stored format or the single-block path. Scene and record launches, deterministic packets, open-topic links and read-only behavior still pass their component tests. The World inbox restriction follows the existing design. No new problems found. The contradiction omission remains with the mission lead as instructed; this approval does not settle that scope ruling.

## Finding 1: Contradictions have no anchored conversation action
Recommendation: fix now
Was: 2-tqwe.3
Response: not built: a contradiction has no ref or stable identity (it is computed, and its message changes with the bible), and DESIGN.md and the mission's success criteria define a topic's scope as the world, a scene, a passage or a bible record. A contradiction topic needs a new scope kind, an agent scope and packet, an identity that survives bible edits, and a DESIGN amendment, which should be its own item rather than part of this one.
Now: kept
<!-- It waits on the mission's lead, who rules on it: leave it as it is. -->

## Finding 2: Preserve paragraph boundaries separately from soft line breaks
Recommendation: fix now
Was: 2-tqwe.4
Response: fixed in dd3b1a9
Now: fixed

`passageSpans` no longer splits the quote on blank lines. It matches candidate boundaries against the first block's selected occurrence and suffix, the complete intervening blocks, and the last block's prefix. The added tests cover blank soft lines in the first, middle and last blocks, preserve every expected span and layer mark, and reject a changed middle block. Existing single-block and occurrence tests still pass. The additional exact-span round trips also passed, including repeated delimiters and repeated words.
