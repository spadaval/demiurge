---
schema: atelier.review
schema_version: 3
round: 3
commit: 887b475a9c99f811435a48c7059b90067880cb96
reviewers:
- thread:delegated-task:command%3Amcp%3A48628c3f-d9c0-4ef7-857d-80684ebced69%3Adelegate-task%3A7fbf43c3-5814-496d-9a1c-1ab8d938c21d
model: gpt-6.1-sol
verdict: approve
created_at: 2026-11-23T07:59:57.813068850Z
---

## Summary

Complexity: medium. The whole change connects the existing scene packet builder to prose generation, stored requests and the shared viewer; this round adds an operation counter to the asynchronous request assembly.

Value: high. Scene prose needs the story bible context, with the writer able to inspect, edit, pin and exclude its sections before sending.

Risk of merging: medium. The request changes reach configured models, but the writer can inspect them before sending and the implementation can be reverted.

The value justifies the scope. Reusing the scene packet builder and shared Context Viewer delivers the requested outcome without a second assembly or viewer implementation. I found no substantially smaller change that delivers it.

I reviewed the changes since round 2, the carried finding and the surrounding generation service, request viewer and UI controls. I also checked the packet builder, bible gathering, budget selection, request persistence and stub-server scenarios against the Done when lines and Report. `cd app && bun run check` passed: TypeScript and Biome clean, 1675 tests passed, 0 failed. The scenarios cover the exact stored and sent bible sections, edited requests, pinning and exclusions, stale selections, unlinking the scene and removal of writer notes.

Independent headless checks used the real application services and lighthouse fixture, with promises gating request persistence to control completion order. They confirmed that an older section rebuild cannot publish or release the assembling state while the newer caret request is pending; that the newer request remains shown when the older one completes afterwards; that a failed newer request releases the assembling state, reports the error and suppresses the old result; and that closing during both pending assemblies prevents either from reopening the slip. The app regression also exercises overlapping assemblies behind a gated bible read. I did not start a dev server, inspect visual layout in a browser or call an external model.

No new findings.

## Finding 1: Keep a pending rebuild from discarding a newer caret request
Recommendation: fix now
Was: 2-qhzw.2
Response: fixed in f76cd26
Now: fixed

`openRequest` now assigns each assembly a counter ticket and publishes only if it is still the latest operation and the slip it started over remains shown. `selectSections` also checks that ticket before restoring its earlier slip after a no-op rebuild. This prevents the earlier section request from replacing the newer caret request or releasing its assembling state. The new app regression and the independent checks in both completion orders confirm the fix, including failure and close invalidation.
