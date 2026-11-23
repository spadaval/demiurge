---
schema: atelier.item
schema_version: 3
id: worldcrafter-aq1r
title: Feed unified story bible context into the scene prose Context Viewer
status: changes_requested
mission: worldcrafter-3z9j
labels:
- context
- editor
priority: high
blocked_by:
- worldcrafter-lgz8
- worldcrafter-667u
- worldcrafter-w4mr
- worldcrafter-wknl
implementers:
- thread:delegated-task:command%3Amcp%3Ae73897d3-5d5f-4e72-a7aa-575ebc1de207%3Adelegate-task%3Af3dd5620-e4d9-4577-a969-3e88fc0d4461
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T22:39:04.439988908Z
---

## Goal

Feed `worldcrafter-667u`'s deterministic scene context-packet builder directly into the scene prose generation pipeline (`app/src/context/builder.ts`, `app/src/generate/`, `app/src/app/generation.ts`) and display/edit it in the shared Context Viewer (`app/src/generate/context-viewer.tsx`, extended by `worldcrafter-w4mr`)—without creating a second context builder or a second viewer component.

## Done when

- [x] `app/src/context/builder.ts` consumes `worldcrafter-667u`'s scene context-packet builder (scene summary, viewpoint, dramatic-irony marks, opening counts, active drives/objects, and nearby prose) rather than duplicating context assembly.
- [x] Prose generation renders and edits the assembled request through the shared `app/src/generate/context-viewer.tsx` (`worldcrafter-w4mr`), supporting pinning/excluding bible sections (and preserving/porting `worldcrafter-xodp`'s stale-pin clearing test) before sending to any configured model/sampler profile.
- [x] Scenario tests against a stub OpenAI-compatible server verify that the stored request holds the exact bible sections as sent, edited requests pass through, and no `[[ ... ]]` writer notes (`worldcrafter-wknl`) reach the request.
- [x] `cd app && bun run check` passes.

## Scope

In: Wiring `worldcrafter-667u`'s context-packet builder into `app/src/context/builder.ts`, `app/src/generate/`, and `app/src/app/generation.ts` using the shared `context-viewer.tsx`.
Out: Keyboard shortcuts, stale-pin clearing, and profile retarget fixes (`worldcrafter-xodp`), and writer-notes representation (`worldcrafter-wknl`).

## Report

A prose request for a scene's document now carries that scene's story bible, built by the same code the story agent reads it with, and the writer can pin or leave out each bible section in the request slip before sending. One commit, `b18cda1`. `cd app && bun run check`: tsc and Biome clean, 1673 pass, 0 fail.

**How the bible gets in.**
- `gatherBibleContext(storage, documentId)` (`app/src/context/gather.ts`) finds the scene whose `documentId` is the document and calls `buildContextPacket` (`app/src/agent/context.ts`) for it. No second context builder. If two scenes name the document (sync can do that), the first in telling order wins. With no linked scene, there is no bible.
- The packet is built with a new `{ prose: false }` option, which drops "Its prose so far". The request's window already carries the prose before the cursor from the open editor, with writer notes cut. The stored prose would add text after the cursor and lag the editor. This is the one deliberate difference from the agent's packet, and the scenario test checks both shapes.
- On the lighthouse fixture the sections hold the scene record (title, actors, viewpoint, pressures/drives, reveals), `reader-order --before` (what has been told, what is held back, objects planted, counts as the scene opens and as they change), the events it depicts and the people in it. That covers the item's list. "Nearby prose" is the builder's window.
- `buildContext` takes `bible: { packet, selection }`. It lays the sections out in the system message (or the completion prompt's head) as `BIBLE_NOTES` followed by `packetText` of the included sections, so the text is exactly the agent's packet text. Budget order is now: fixed text and minimum window, then pinned sections, pinned cards, the other sections not left out, then the window's growth, then mentioned cards. Each group is claimed in order and stops at the first that doesn't fit, as cards already were. The header comment and `docs/rebuild/data-model-boundaries.md` describe this.
- The breakdown gains an optional `bible: { scene, sections[], cleared[] }`. Each section has its text, size, `pinned`, `excluded` and `included`. `requests.ts` stores and checks it, and requests stored before this change have no `bible`.
- The generator takes an optional `bible` loader and a new error, `bible_context_failed`. `createGeneration` wires it to the storage it already gets, which in the app is `services.bible.storage`.

**The slip.** `ContextViewer` (kind `request`) lists the sections under "Story bible for scene:…". Each row shows the title and size, with Pin and Leave out as quiet text actions (`onSelectSections`). Generation keeps a selection per document for the visit. `selectSections` stores it and assembles the request again, so edits in the slip are discarded, as with any new request. A segment's past request shows its sections read-only. DESIGN.md's Agent Slip section describes the rows.

**Stale pins.** `worldcrafter-xodp` dropped its stale-pin test because pins didn't exist, so there was nothing to port. I built the behaviour the test would have covered. A pin or exclusion naming a section the packet doesn't have is cleared rather than failing like `unknown_pin`, the breakdown lists it in `cleared`, and generation drops it from the selection. When no scene holds the document any more, the whole selection is cleared and a notice says so. Both cases are tested. Section keys are titles, which are fixed for scene packets.

**Tests.**
- `app/src/generate/bible.test.ts` (5) runs against the stub OpenAI-compatible server (`agent/stub-llm.ts`) on the lighthouse fixture, with a `[[ ... ]]` note in the scene's document. It checks:
  - the stored request contains `BIBLE_NOTES` plus `packetText` of the agent's packet exactly, the record round-trips through storage, and the stub receives the stored body byte for byte;
  - an edited request (the bible text changed) is received exactly as edited and stored as a revision;
  - leave-out removes a section;
  - a pinned section wins a tight budget that, unpinned, goes to the first section;
  - stale pins are cleared;
  - unlinking the scene removes the bible;
  - no `[[` and no note text reach the server.
- `app/src/app/generate.app.test.tsx` has one new app test. It checks that the slip lists the four sections, that Leave out reassembles without one, that Pin shows Unpin, and that unlinking the scene clears the selection with a notice.

**Worth a look.**
- Unpinned bible sections claim budget before the window grows past its minimum. At the app's 16,000-character budget the lighthouse packet and a full 6,000-character window both fit. A very large bible could shorten the window, and the breakdown would say "limited by the budget". The other choice would put sections after the window, which risks dropping the bible to keep prose.
- The selection lives in memory per document and is lost on reload. Keeping it in the key-value store, as profile defaults are kept, would be a small follow-up if it's wanted.
- World cards (`world/` entries) are unchanged and still sit beside the bible. Card pinning still has no UI.


**Round 2** (`65b320b`). The finding holds: with a delayed bible read, the old request stayed sendable and a closed slip came back. Two changes fix it at the cause:
- A slip now has `assembling`. `selectSections` sets it before rebuilding. While it is set, `sendSlip` and another `selectSections` do nothing, and the viewer disables Send and the section actions and says "Putting the request together again…". A rebuild that fails, or that gives up before it starts, restores the slip as it was.
- `openRequest` now remembers the slip it started from and publishes only if that slip is still the one shown. A slip that was closed, replaced or sent meanwhile stays that way. This applies to every `openRequest`, not just section changes.

A new app test holds `storyRecords.list` behind a gate during a Leave out. It checks that Send is disabled, that `sendSlip` and a second change send and change nothing, that closing the slip before the gate opens keeps it closed, and that the next request carries the change. `bun run check`: 1674 pass, 0 fail.

### Responses
1-9m41.1: fixed in 65b320b
