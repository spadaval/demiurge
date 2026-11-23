---
schema: atelier.review
schema_version: 3
round: 1
commit: 398d604a2e2a46971723b5ac06ff1ffdbf3c317d
reviewers:
- thread:delegated-task:command%3Amcp%3A035e2d67-35e5-4fe7-a8ee-35cad9d9015c%3Adelegate-task%3A4efe4bcc-1c1a-4ac0-a6d0-2f8d96c83d01
model: gpt-6.1-sol
verdict: changes
created_at: 2026-11-23T07:48:29.929147951Z
---

## Summary

Complexity: medium. Five controls share asynchronous edit state and structured warning rendering, while persistence continues through the existing command pipeline.

Value: high. The controls provide all five requested edits without an agent prompt and keep the inspector, rail and apparatus connected to the unified store.

Risk of merging it: medium. These controls write the user's bible, and inaccurate outcome reports can mislead the writer about what changed or what the trace checked.

Reviewed the complete change against master at 398d604a2e2a46971723b5ac06ff1ffdbf3c317d, including the Done when lines, Report and DESIGN.md. Traced every control through Bible.edit, runStoryCommand, runMutation and the corresponding typed command. Checked live refresh wiring, read-only controls, scene ordering, candidate transitions, gap marking and warning rendering. Ran `bun run check`: type checking and Biome passed; all 1,678 tests passed. Used temporary component probes outside the repository to reproduce the two reporting failures below, and a storage-level probe to verify the saved state and the runner's unread-prose metadata. No application source or tests were changed. Did not assess appearance in a browser or start a dev server.

The implementation is worth its size, but its reports must distinguish a saved edit from a failed follow-up read and preserve warnings that the trace was incomplete.

## Finding 1: Preserve the saved outcome when the follow-up prose read fails
Recommendation: fix now

`app/src/app/bible-edit.tsx:96-101` treats every error from Bible.edit as a failed save; `describeEditError` at lines 131-138 explicitly says "The edit wasn't saved." That is not the contract of the runner this provider calls: `app/src/story/tools.ts:1185-1187` first commits executeStoryCommand and then reads scene prose to build the report. A storage error in that second step is returned after the mutation has already persisted.

Reproduced through the inspector with the lighthouse fixture: after rendering Open Questions, made document loads return a storage failure and clicked Choose on "He wanted adventure." The report said "The edit wasn't saved", but loading the bible confirmed why-leave.answer was wanderlust. The component probe kept the memory adapter open solely so the persisted state could be checked after the workspace's reconnect attempt; the same saved-state/error result also reproduces directly with runStoryCommand, without the workspace wrapper.

The writer is told an edit did not happen when it did, and the forms retain their draft as if saving failed. Preserve the successful mutation outcome when post-save reporting fails, and report the trace/read failure separately. Add a regression test that checks both the persisted edit and the user-facing outcome when the follow-up document read fails.

## Finding 2: Show the runner's warnings about prose the trace could not read
Recommendation: fix now

`app/src/app/bible-edit.tsx:108-112` copies only answer.warnings into EditOutcome, discarding answer.proseNotRead. EditReport therefore cannot tell the writer when missing or invalid linked prose was excluded from the trace. This information is separate from EditWarnings and is deliberately returned by the shared tool runner so an incomplete trace is not silently presented as complete (`app/src/story/stored-prose.ts:1-12`, `app/src/story/tools.ts:1197-1199`).

Reproduced by deleting doc-confession from the lighthouse fixture and choosing "He wanted adventure." runStoryCommand returns proseNotRead with scene confession, documentId doc-confession and reason missing. Through the inspector, the edit succeeds and shows the record suspects, but nothing mentions that Confession's prose could not be checked. Invalid document content is discarded through the same path.

Carry proseNotRead into the saved outcome and render the affected scenes/documents and their reasons alongside the trace report. Cover missing and invalid prose in the component tests so writers can see that these passages may still contain the old answer even when no prose suspect is returned.
