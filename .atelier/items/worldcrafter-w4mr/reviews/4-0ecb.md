---
schema: atelier.review
schema_version: 3
round: 4
commit: 5f3f0edb83998696ac4b5fcdd8ee86775ee54838
reviewers:
- thread:delegated-task:command%3Amcp%3Afb709a79-8afe-4d0d-8db8-c35012fc9da6%3Adelegate-task%3A0d740bcc-7e0c-4b14-abff-be9dbd6123e0
model: gpt-6.1-sol
verdict: approve
created_at: 2026-11-23T07:35:16.251363076Z
---

## Summary

Complexity: high. The whole change adds persistent session overrides, profile defaults, replay input and a shared inspection contract across the runner and composer.

Value: high. Writers need the shared inspector to control agent requests and follow their effects into the story.

Risk of merging it: medium. The request and navigation changes reach users and persist configuration, but failures show and the changes can be reverted.

I read the changes from bef1e14 to 5f3f0ed, the surrounding extractor, reference parser and query result producers. I also checked the viewer, edit/default contracts, component coverage and apparatus CSS against the Done when lines, Report and DESIGN.md. The change since the last review is confined to reference extraction and its regression coverage, plus tracking records. No smaller change is needed to deliver the intended outcome; this targeted fix completes the carried finding without changing the shared viewer contract.

`cd app && bun run check` passed: TypeScript and Biome clean, 1,626 tests passed, zero failed. `git diff --check` passed. The existing Rail act() warnings still appear. The suite retains coverage for session/default prompt and model edits, immutable next-turn context revisions, multi-tool inspection and following a trace suspect.

I independently ran real tools against memory storage containing the lighthouse fixture. Adding and showing `actor:old man` now yields that reference. After changing the first scene's ID to `act:one`, then separately to `actor:mara`, `scenes(actor:mara)` yields `scene:act:one` and `scene:actor:mara` respectively, without interpreting either scene ID as another record kind. The earlier examples also still work: `show(fact:oil-runs-out)` includes `count:oil` and `object:lamp`, and `readerOrder(before: confession)` includes `open-question:why-leave`.

I found no new blocking problem. No application sheet hosts the new modes yet, as the Report states; I checked component contracts and tests, not a complete topic-sheet flow, browser-rendered layout or live model service. The previously deferred story-time styling gap remains unchanged.

## Finding 1: Preserve valid IDs when extracting typed query references
Recommendation: fix now
Was: 3-aflb.2
Response: fixed in 36fbea4
Now: fixed

`dataRefs` now validates complete `ref` and `on` fields with `parseRef` and always prefixes the bare ID in a `scene` field with `scene:`. Stored `{ kind, id }` references and reference arrays remain supported. The new regression test and independent real-tool reproductions above confirm both valid-ID failures are fixed and the earlier reference cases still work.
