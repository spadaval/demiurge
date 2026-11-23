---
schema: atelier.review
schema_version: 3
round: 2
commit: a9bf5b22eabb388a1150ca19952a2a0940df6896
reviewers:
- thread:delegated-task:command%3Amcp%3A9756aa81-d581-4ad6-b842-b975f9f26726%3Adelegate-task%3A7adf3107-0471-4338-9522-09617a53c758
model: gpt-6.1-sol
verdict: changes
created_at: 2026-11-23T08:26:41.163290341Z
---

## Summary

Reviewed the commits between `e2306b7` and `a9bf5b2`, the carried findings, the item and mission criteria, and the surrounding editor, scope, layer and context-packet integration. Ran `cd app && bun run check`: typecheck and Biome passed; all 1,771 tests passed. The new component tests prove that equal quotes at different occurrences get different drafts and that a selection across paragraphs is quoted in the model request. Ran an additional in-memory editor probe through `selectedPassage`, `passageStale` and `talkLayers` using valid text with soft line breaks. No browser or visual inspection was performed, and I did not independently compare the React act warnings against master.

- **Complexity: medium.** The change connects existing talk, inspector and layer state; this round extends passage scopes with optional occurrence and end-block fields.
- **Value: high.** Starting a scoped conversation from its subject is required by the mission.
- **Risk of merging: medium.** Passage anchoring reaches the writing surface and can silently lose the selected location, but these changes are reversible and do not migrate stored data.

The implementation remains reasonably sized for the outcome. Both earlier passage findings are fixed, including their requested component coverage. Scene and record launches, context packets, target links, draft reuse and read-only behavior remain covered by passing tests. Restricting the World inbox to model-raised topics follows the existing design; the rail aggregates all open topics. Finding 3 is left for the mission lead as instructed. Finding 4 identifies a new ambiguity in multi-block passage storage that prevents the passage-surfacing requirement from holding for valid prose.

## Finding 1: Preserve which occurrence of repeated words was selected
Recommendation: fix now
Was: 1-9b2c.1
Response: fixed in 0f14534
Now: fixed

The selection now records its quote's occurrence, `sameScope` compares it, and the rendered anchor preserves it. The new component test selects the first and second `Echo` separately, checks distinct drafts, stores `occurrence: 1`, and checks that the second occurrence is marked. It passes.

## Finding 2: A selected passage across paragraphs becomes a scene topic
Recommendation: fix now
Was: 1-9b2c.2
Response: fixed in 0f14534
Now: fixed

`selectedPassage` now takes endpoints in different blocks; the passage scope keeps the last block and every block's selected text. The new component test launches a passage across two paragraphs and checks its stored scope, complete quote in the model request, and non-stale status. Layer tests cover marks in each paragraph and a key on the last. These pass. The separate delimiter problem below concerns how those parts are encoded, rather than the original scene-topic fallback.

## Finding 3: Contradictions have no anchored conversation action
Recommendation: fix now
Was: 1-9b2c.3
Response: not built: a contradiction has no ref or stable identity (it is computed, and its message changes with the bible), and DESIGN.md and the mission's success criteria define a topic's scope as the world, a scene, a passage or a bible record. A contradiction topic needs a new scope kind, an agent scope and packet, an identity that survives bible edits, and a DESIGN amendment, which should be its own item rather than part of this one.
Now: kept
<!-- It waits on the mission's lead, who rules on it: leave it as it is. -->

## Finding 4: Preserve paragraph boundaries separately from soft line breaks
Recommendation: fix now

`app/src/talk/passage.ts:122` joins selected block parts with `"\n\n"`, and `:143-145` splits the quote on the same delimiter to recover them. That delimiter is also legal text within a paragraph, so the encoding is ambiguous. I created a valid document with paragraph `a` containing `First\n\nSecond.` and paragraph `b` containing `Third.`, then selected from `[0,0]:0` through `[1,0]:5`. `validateDocument` returned success and `selectedPassage` returned `{ blockId: "a", quote: "First\n\nSecond.\n\nThird", through: "b" }`. Without any edit to that document, `passageSpans` returned null, `passageStale` returned true, and `talkLayers` produced no marks and moved the note to scene placement. The topic therefore tells the writer that a passage has changed immediately after it is created, and never surfaces it on the selected words.

Keep block-part boundaries in a lossless representation, or locate the quoted text without treating in-block soft breaks as paragraph boundaries. Preserve compatibility with stored single-block topics. Add a regression covering a multi-paragraph selection whose first, middle or last paragraph contains a blank soft line, and verify that the unchanged passage is not stale and has the expected marks.
