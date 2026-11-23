---
schema: atelier.review
schema_version: 3
round: 3
commit: bef1e14771c3a17f3e314468922800a82bed8660
reviewers:
- thread:delegated-task:command%3Amcp%3Afd33f6af-9cef-48fb-8801-17c5e61b5d87%3Adelegate-task%3A946cc86e-9556-4936-a42b-a9cab8f1f605
model: gpt-6.1-sol
verdict: changes
created_at: 2026-11-23T07:30:12.060837209Z
---

## Summary

Complexity: high. The whole change adds persistent session overrides, profile defaults, replay input and a shared viewer contract across the runner and composer.

Value: high. The shared inspector lets writers control agent requests and follow their effects into the story.

Risk of merging it: medium. The request and navigation changes reach users and persist settings; the remaining issue drops or misdirects result links and is reversible.

I read the changes from d09405e to bef1e14, the surrounding extractor, reference parser, query result producers and viewer, and the component tests against the Done when lines and DESIGN.md. `cd app && bun run check` passed: TypeScript and Biome clean, 1,625 tests passed, zero failed. The reported existing Rail act() warnings still appear.

I ran real story tools against memory storage containing the lighthouse fixture and passed their results to `callNamed`. Both carried reproductions now produce the expected references: `show(fact:oil-runs-out)` includes `count:oil` and `object:lamp`, and `readerOrder(before: confession)` includes `open-question:why-leave`. Finding 1 is fixed. The new recognition rules also regress valid IDs that the previous extractor supported, as Finding 2 describes. That small extractor fix is worth doing; the shared viewer and runner contracts do not need to change.

The suite retains coverage for session/default edits, immutable next-turn context revisions, multi-tool inspection and reference callbacks. No application sheet hosts the new modes yet, as the report states. I checked the component contracts and tests, not a complete topic-sheet flow, browser-rendered layout or live model service. The previously deferred story-time styling gap remains unchanged.

## Finding 1: Ordinary query results have no clickable record or scene references
Recommendation: fix now
Was: 2-rt52.2
Response: fixed in af6c22f
Now: fixed

`storedRef` recognizes stored `{ kind, id }` references, including the special candidate shape. Traversing reference strings in arrays now includes readerOrder's withheld question. The new regression test uses actual tool results for both examples, and my independent reproductions confirm the expected deduplicated links reach `callNamed`.

## Finding 2: Preserve valid IDs when extracting typed query references
Recommendation: fix now

`app/src/agent/inspect.ts:339-341` replaces the former handling of known `ref`, `on` and `scene` fields with string heuristics that reject valid IDs. Story IDs are unrestricted strings, and `parseRef` accepts spaces and further colons in an ID. Reproductions with real tools:

- `addActor({ id: "old man", name: "The old man", kind: "person", notes: "" })` succeeds. `show({ ref: "actor:old man" })` then returns `data.ref: "actor:old man"`, but `callNamed` returns `[]`: `REF_FORM` rejects its space. This link worked before this commit.
- With the first lighthouse scene's ID set to `act:one`, `scenes({ ref: "actor:mara" })` returns `data[0].scene: "act:one"`. The extractor omits `scene:act:one` because the ID already contains a colon. The query's `scene` field holds a bare ID, regardless of its contents. An ID such as `actor:mara` would instead be misinterpreted as an actor reference.

Preserve the schema meaning of known reference fields before applying the generic whole-string fallback: validate complete `ref`/`on` values with `parseRef`, and always prefix scene IDs with `scene:`. Keep the stored-ref and array support from this round. Add regression coverage for a spaced reference and a scene ID containing a colon so the new extraction does not remove previously working links or navigate to the wrong kind of record.
