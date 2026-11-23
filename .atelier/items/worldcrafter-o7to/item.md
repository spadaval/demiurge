---
schema: atelier.item
schema_version: 3
id: worldcrafter-o7to
title: Direct-manipulation controls for high-frequency bible edits
status: changes_requested
mission: worldcrafter-3z9j
labels:
- ui
- story-model
priority: medium
blocked_by:
- worldcrafter-lgz8
- worldcrafter-7r87
- worldcrafter-wqh0
- worldcrafter-hqca
implementers:
- thread:delegated-task:command%3Amcp%3Ae73897d3-5d5f-4e72-a7aa-575ebc1de207%3Adelegate-task%3A4826dece-04b7-48ab-b57f-831e84e856e0
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T22:39:04.518206026Z
---

## Goal

Add lightweight direct-manipulation controls to the Night Edition bible inspector for the high-frequency edits where clicking is faster than prompting: answering or rejecting open-question candidates, reordering scenes, changing a scene's viewpoint, updating a count value, and marking a gap deliberate.

## Done when

- [x] Each control invokes the same typed `app/src/story/commands.ts` mutation as the Story Agent Runner (never mutating storage directly) and surfaces any kept contradictions or `trace` suspects.
- [x] Covers: answer/reject/reopen open-question candidate, move scene in telling order, set scene viewpoint, set count value, mark gap deliberate.
- [x] Component tests verify each action updates the unified store and live inspector/apparatus views; `bun run check` passes.

## Scope

In: Targeted direct-edit actions inside Night Edition inspector views (`app/src/app/`).
Out: Full CRUD form editors for all 12 story record types (add only if dogfooding shows a need).

## Report

The five high-frequency bible edits can now be made from the World inspector without prompting the agent. Each one runs the same story command, through the same code, as the agent's tool call of that name.

What's there:
- **Open questions:** Choose, Reject (asks for a reason inline) and Reopen on each candidate, in the Open Questions ledger and on a candidate's detail. Reopen on the chosen answer runs `unanswerOpenQuestion`, which keeps the answer as superseded. Reopen on a rejected candidate runs `rejectCandidate` with a null reason.
- **Telling order:** "earlier" and "later" on each Reader-Order row (`moveScene`).
- **Viewpoint:** a select of the cast on a scene's detail (`setSceneViewpoint`; "No viewpoint" clears it).
- **Counts:** a value, event and optional note form on a count's detail (`setCount`). With no note, the existing note is kept, as the command does.
- **Gaps:** a new "Gaps" section on any record's detail lists its gaps. Each has Mark deliberate (asks for a reason, `markGapDeliberate`), and kept gaps have Unmark (`unmarkGapDeliberate`).

How it holds to the agent's path: `runStoryCommand(storage, command)` in `app/src/story/tools.ts` is the tool runner's `runMutation` under the command's own name. `Bible.edit` calls it on `bible.storage`, so the inspector, the apparatus and the rail re-read on the write as they do for the agent. A tools test checks that it returns exactly what `executeStoryTool` returns for the same edit and leaves the same stored bible.

What the edit reports: the sheet head shows the outcome. Kept timeline problems and contradictions each link to Contradictions. Trace suspects show as references to records and to scene prose documents, with their reasons, and a count of the rest that are only linked. I rendered the structured `warnings` rather than the CLI `lines`, because those end in "run trace …", which the app has no way to do. A refusal or failed save shows in raised umber. Read-only tabs show no controls.

Tests: `inspector.test.tsx` has a new suite with one test per action. Each checks the stored bible, the live ledger or detail, and the report: suspects linking to `doc-confession`, a kept count contradiction, the rail counts. More tests cover a refusal from a stale sheet and a read-only tab. `layers.test.tsx` sets a viewpoint through the inspector's select and checks that the scene apparatus drops its Irony note. The two existing ledger tests read rows with the controls left out. `bun run check` passes: 1678 tests, no new act warnings.

DESIGN.md: the World Inspector section said the inspector only reads. It now has a "Direct edits" paragraph that sets out these controls and how they look.

Not done, and why:
- Story-wide gaps (ref null) have no control, because no sheet lists them.
- Cast & Drives rows still show "no origin" as text. The drive's detail has the control.
- I didn't check the styling in a browser, since a dev server isn't allowed here. It follows DESIGN.md's tokens: text actions like the rail's, and fields in the slip's setting.

