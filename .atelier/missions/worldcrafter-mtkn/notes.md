# Notes

## 2026-11-23: worldcrafter-w4mr, ruling after round 3

Round 3 asked for changes, so the item reached the review cap and came to the lead.
The open finding is `3-aflb.2`: the round 3 reference extractor in
`app/src/agent/inspect.ts` accepts only strings shaped like a spaceless `kind:id`,
so a reference whose ID has a space (`actor:old man`) lost its link, and a scene ID
with a colon (`act:one`) is dropped or opens the wrong kind of record.

Ruling: fix it. The finding holds, it is a regression the round 3 fix introduced,
and the fix stays inside `inspect.ts`: check each whole `ref`/`on` value with
`parseRef`, always prefix a `scene` value with `scene:`, keep the `{kind, id}` and
reference-list support, and add tests for both cases. The implementer then submits
round 4.
