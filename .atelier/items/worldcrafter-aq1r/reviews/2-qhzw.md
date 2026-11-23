---
schema: atelier.review
schema_version: 3
round: 2
commit: a89daa31e3f6150ae17351abef6bf77f1c06a792
reviewers:
- thread:delegated-task:command%3Amcp%3A48628c3f-d9c0-4ef7-857d-80684ebced69%3Adelegate-task%3A00ff7658-d557-439d-b1dc-3bb51eca6ac4
model: gpt-6.1-sol
verdict: changes
created_at: 2026-11-23T07:53:52.119934793Z
---

## Summary

Complexity: medium. The whole change connects the existing scene packet builder to prose generation, stored requests and shared viewer controls; this round adds asynchronous slip state and completion checks.

Value: high. Scene prose needs the bible context the story agent uses, with the writer able to inspect and select its sections.

Risk of merging: medium. Request selection reaches configured models, and the new completion guard can discard a newer request for a different insertion point.

The value justifies the scope. Reusing the packet builder and shared Context Viewer avoids a second implementation, and I found no substantially smaller change that delivers the outcome.

I reviewed the diff since round 1 and its surrounding service, viewer, UI and storage paths. I also checked the builder, packet gathering, request parsing and stub-server scenarios against the Done when lines and Report. `cd app && bun run check` passed: TypeScript and Biome clean, 1674 tests passed, 0 failed. This includes the exact stored/sent bible text, edited requests, section selection, writer-note removal, stale-pin clearing and the new gated-read app regression.

Separate headless checks against the real generation service and lighthouse fixture confirmed that a successful section rebuild blocks the previous request from sending, ignores a second section action, publishes the requested sections, and stays closed if dismissed. A failed rebuild clears `assembling`, preserves the displayed record and reports the error. A further gated check exposed Finding 2; I repeated it with the pre-fix generation service to confirm that this round introduced the regression. These checks use promises to control completion, with no timing sleeps. I did not start a dev server, check visual layout in a browser or call an external model.

## Finding 1: Prevent section rebuilds from sending or restoring the previous request
Recommendation: fix now
Was: 1-9m41.1
Response: fixed in 65b320b
Now: fixed

`selectSections` now marks the slip as assembling before awaiting the rebuild. The service blocks Send and further section actions, and the viewer disables their controls. Closing or replacing the slip object invalidates the pending result. The app regression and independent gated checks confirm the reported send-and-close failure is fixed.

## Finding 2: Keep a pending rebuild from discarding a newer caret request
Recommendation: fix now

`app/src/app/generation.ts:296,319` uses the slip object as the identity of an assembly operation, but starting another `openRequest` does not change that object. Two pending assemblies therefore capture the same `startedOver`; the first completion replaces the slip, and the guard discards the newer request when it finishes. The slip's "Put it together at the caret" and "Put it together again" controls remain available during section assembly (`app/src/app/generation-ui.tsx:125-153`), so a writer can request an updated insertion point or editor snapshot and have that action ignored.

I reproduced this deterministically with `createGeneration` on the lighthouse fixture: open the arrival request at the end (`after: null`), hold the next `storyRecords.list()` read, call `selectSections({ pinned: [], excluded: ["People in it"] })`, then call `openRequest("doc-arrival", "b_arr1")` before releasing the read. After both promises finish, the displayed request still has `after: null`, instead of the requested `b_arr1`. Running the same sequence with the generation service from the previous review commit, `1cb93d9`, leaves `after: "b_arr1"` as expected. No failed storage operation or sleep is needed.

Give each accepted assembly its own operation identity so a newer request supersedes an older one, while preserving close/send invalidation and the section-action lock. Alternatively, explicitly prevent overlapping assemblies in both the service and its UI controls. Add a gated regression that starts a newer caret or snapshot rebuild while a section rebuild is pending and checks the resulting request.
