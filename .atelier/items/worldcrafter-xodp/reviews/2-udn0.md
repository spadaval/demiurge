---
schema: atelier.review
schema_version: 3
round: 2
commit: 8731e1d4077ab065c52d0a3d4cf6f264e5215cda
reviewers:
- thread:delegated-task:command%3Amcp%3A0ad1d5b6-a7e5-40a6-8582-01d2d8174e14%3Adelegate-task%3Af35965e4-3595-48e9-8576-d9cd3a554161
model: gpt-6.1-sol
verdict: changes
created_at: 2026-11-23T05:14:01.589697508Z
---

## Summary

Complexity: high. The new persisted `madeFor` contract spans request assembly, retargeting, revisions and the app's Send path.

Value: medium. These fixes improve the shipped generation workflow and preserve deliberate request edits.

Risk of merging: high. Incorrect profile provenance can silently choose a different model from the one the writer requested.

I checked the commits since round 1, the carried finding, the request-store parser and revision inheritance, and the generator/app paths for Request, Regenerate and Send. `cd app && bun run check` passed: 1,179 tests, zero failures; Biome reported the same three warnings in `scripts/story.ts`. The new client, generator and component coverage verifies that an edited model survives Request and Regenerate with an unchanged profile. I also ran two independent in-memory generator probes with stub fetch, exercising the app's retargeted-slip Send sequence without changing repository code. Both reproduce Finding 2. I did not run a browser or contact a real model server.

The work remains worth its scope, but the new baseline must survive every retargeted Send before it merges. The existing tests cover storing that baseline through ordinary Regenerate and miss the slip's separate `sendEdited` path. The recorded drop of stale-pin clearing remains within the Done-when allowance; the other goals remain implemented, subject to Finding 2.

## Finding 1: Preserve a deliberately edited model when the profile has not changed
Recommendation: fix now
Was: 1-7x1e.1
Response: fixed in 9e5bb39
Now: fixed

The original unchanged-profile scenario is fixed. `prepare` records the profile target, writer revisions inherit it, and `current` compares it with the profile instead of treating the edited body as profile settings. The added client, generator and component tests passed, including an edited model surviving both Request and ordinary Regenerate. The distinct retargeted-slip path below still loses the baseline.

## Finding 2: Preserve the new profile baseline when sending a retargeted slip
Recommendation: fix now

`app/src/context/requests.ts:178` inherits the stored parent's `madeFor` unless the caller supplies a replacement. Ordinary Regenerate supplies the new target at `app/src/generate/generator.ts:401`, but the retargeted slip sends only the request body and parent ID (`app/src/app/generation.ts:330` and `:343`). `sendEdited` then calls `requests.revise(parentId, request)` at `app/src/generate/generator.ts:806`, losing the new `madeFor` that `current` computed in memory. The revision is stored with the old baseline even though its URL/model now target the changed profile.

Two independent generator probes confirmed user-visible wrong requests:

1. Generate at server A/model A, change the profile to server B/model B, open the segment's retargeted Request, edit its model to `writer-model`, and Send edited request. This sends `writer-model` correctly once. With no further profile change, Request now reports a retarget again and displays model B; ordinary Regenerate sends model B. The stored revision's `madeFor.baseUrl` still names server A, so every later lookup thinks the server just moved and discards the writer's model.
2. With no manual request edits, generate with profile model A, change the model to B at the same URL, open Request and Send the retargeted slip. Change the profile model again to C and Regenerate. It sends B, not C: the stored baseline still says A, so the B that retargeting supplied is incorrectly classified as a writer edit.

Carry the baseline belonging to the displayed retargeted request through Send and store it with that single revision, while preserving the existing semantics of ordinary writer revisions and explicit request-ID sends. Add coverage through the retargeted-slip Send path for both a subsequent Request/Regenerate with explicit edits and a subsequent real profile model change.
