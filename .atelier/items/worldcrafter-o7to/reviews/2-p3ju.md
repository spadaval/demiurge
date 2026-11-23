---
schema: atelier.review
schema_version: 3
round: 2
commit: 7843e38ef3dc58ea3903e7f2b8a7fde14f2fb9d1
reviewers:
- thread:delegated-task:command%3Amcp%3A035e2d67-35e5-4fe7-a8ee-35cad9d9015c%3Adelegate-task%3A262759fa-4984-4af0-9adf-73352c731979
model: gpt-6.1-sol
verdict: approve
created_at: 2026-11-23T07:57:09.144571722Z
---

## Summary

Complexity: medium. Five direct controls share asynchronous edit state and warning rendering; the follow-up also separates a saved command from a failed prose read in the shared tool runner.

Value: high. All five requested edits can be made without prompting, and the reports now show when the trace could not check linked prose.

Risk of merging it: medium. The controls write the user's bible, but they use the existing typed commands and storage path, with component tests covering the live results and reporting failures.

Reviewed the changes since round 1, from 398d604a2e2a46971723b5ac06ff1ffdbf3c317d to 7843e38ef3dc58ea3903e7f2b8a7fde14f2fb9d1, and checked both carried findings against the implementation and regression tests. Traced the shared mutation runner's save, follow-up prose read, error recovery and warning conversion, then checked the inspector's saved outcome and unread-prose rendering. Rechecked the Done when lines and Report against the command wiring and tests for candidate transitions, scene order, viewpoint, count values, deliberate gaps, live inspector/rail updates and the scene apparatus.

Ran `bun run check`: TypeScript and Biome passed, and all 1,681 tests passed. This includes the new tests for a persisted edit after a failed prose read and the component test reporting missing and invalid prose. The full suite emitted React act warnings in generation tests outside this change; the inspector and apparatus tests passed without warnings in their output. No browser appearance check was performed, and no dev server or watch command was started.

Both carried findings are fixed. No new findings. The implementation is worth its size and is approved.

## Finding 1: Preserve the saved outcome when the follow-up prose read fails
Recommendation: fix now
Was: 1-mhpc.1
Response: fixed in cae9adb: the cause was in the shared runner. `runMutation` now keeps a saved edit as a mutation result when the prose read after it fails, listing each linked scene in `proseNotRead` as `unreadable`, so the agent is no longer told it failed either. Covered by a tools test and an inspector test that both check the stored edit.
Now: fixed

The recovery is confined to the prose read after `executeStoryCommand` succeeds. `unreadProse` supplies an empty trace source and lists every linked scene as unreadable, while the runner retains the successful mutation and its record changes. The tools and inspector regression tests check that the chosen answer remains persisted and the report says it was saved. Save failures and command refusals retain their separate paths.

## Finding 2: Show the runner's warnings about prose the trace could not read
Recommendation: fix now
Was: 1-mhpc.2
Response: fixed in cae9adb: the saved outcome carries `proseNotRead`, and the report lists those scenes as "Not traced" with the reason. Component tests cover a missing document, invalid content and a failed read.
Now: fixed

`BibleEditsProvider` now carries `proseNotRead` into the saved outcome, and `EditReport` renders each affected scene reference with the document ID and reason under "Not traced". The component tests verify missing documents, invalid content and a storage read failure, so an incomplete trace is visible alongside the saved edit and its other warnings.
