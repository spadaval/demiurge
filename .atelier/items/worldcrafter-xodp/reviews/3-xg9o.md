---
schema: atelier.review
schema_version: 3
round: 3
commit: c5e2e80fdf0766f20a11776ccf3e4b03cafea29f
reviewers:
- thread:delegated-task:command%3Amcp%3A0ad1d5b6-a7e5-40a6-8582-01d2d8174e14%3Adelegate-task%3A7494a7ff-6fff-4b92-9d0a-421bf2eb9f26
model: gpt-6.1-sol
verdict: approve
created_at: 2026-11-23T05:18:23.624575610Z
---

## Summary

Complexity: high. The whole change spans generation controls, request revisions and a persisted profile baseline that several paths must preserve.

Value: medium. It improves the shipped generation workflow and keeps the writer's request edits intact.

Risk of merging: high. Incorrect profile provenance can silently choose a different model from the one the writer requested.

I reviewed the commits since round 2, traced the carried finding through `sendSlip`, `sendEdited`, request revision storage and subsequent Request/Regenerate, and checked that ordinary edits and explicit request-ID sends keep their existing behavior. I also checked the other goals and their existing coverage against the Report. `cd app && bun run check` passed: 1,181 tests, zero failures. Biome reported the three existing warnings in `scripts/story.ts`; the new app tests also emit the React warnings noted below. I did not run a browser or contact a real model server; the app tests use a local stub server.

The fix preserves the displayed baseline without another storage write or another retarget pass. Both requested regression sequences pass through the actual slip UI. The work remains worth its scope, the recorded stale-pin drop remains allowed by the Done-when line, and no fix-now finding remains.

## Finding 1: Preserve the new profile baseline when sending a retargeted slip
Recommendation: fix now
Was: 2-udn0.2
Response: fixed in f023da5
Now: fixed

`sendSlip` now supplies `shown.record.madeFor` whenever it sends a retargeted request, whether edited or unchanged. `sendEdited` passes that target to `requests.revise`, which stores it instead of inheriting the parent's older target. Ordinary edits still inherit their parent's baseline. The two added app tests pass: after moving the server, a model edited in the retargeted slip survives a later Request and Regenerate; after sending an unchanged retargeted slip, a further profile model change applies to Regenerate.

## Finding 2: Wrap the new tests' profile saves in act
Recommendation: defer
Taken: worldcrafter-d93c by mcp:7d857dc0-4a0b-4b45-94fa-b528d1f91a2b

`app/src/app/generate.app.test.tsx:789` and `:850` call `services.generation.profile.save` outside `act`. Those calls notify React subscribers synchronously, and the full check now prints four "An update to Rail inside a test was not wrapped in act(...)" warnings while running the two new tests. Wrap these saves in the existing `act` helper so new React warnings remain visible. This does not block this item: subsequent awaited UI actions flush the updates, and both regression tests assert the outgoing model and pass.
