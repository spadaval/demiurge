---
schema: atelier.item
schema_version: 3
id: worldcrafter-xodp
title: 'Generation ergonomics: shortcuts, stale pins, and retarget fixes'
status: building
mission: worldcrafter-3z9j
labels: []
priority: medium
blocked_by: []
implementers:
- thread:delegated-task:command%3Amcp%3A6d73f777-f6d1-4f6c-b6f0-9f634b2c4463%3Adelegate-task%3A161ec601-b25e-4def-ba63-a9c07a6e0e46
ready: null
trivial: null
caused_by: null
created_at: 2026-10-18T05:27:28.188005921Z
---

## Goal

Remaining ergonomics and bug fixes on the shipped prose generation UI (`app/src/app/generation.ts`, `app/src/generate/`):
1. Keyboard shortcuts for generate, send, stop, and accept.
2. Clearing a stale pin in the request slip (currently fails build with `unknown_pin`).
3. Missing-anchor recovery when the block a request continues from has been deleted or unwrapped (offer to rebuild from the caret instead of failing with `block_not_found`).
4. Retarget cleanup: retarget in memory for display (store revision only on send, avoiding duplicate revisions and writes in read-only tabs), strip incompatible sampler keys on provider switch (e.g. `n_probs` sent to OpenRouter), and retarget model-only changes at the same URL. *(Stable profile ID `name` and retarget info notice are already shipped in `app/src/generate/profile.ts`.)*
5. Refresh `.impeccable/design.json` and repoint the surface brief from `writing-workspace` to `app/src/app`.

## Done when

- [x] Each of items 1–5 above is either implemented with unit/component tests or explicitly dropped with a recorded reason in the Report.
- [x] `cd app && bun run check` passes.

## Scope

In: Keyboard shortcuts, stale-pin clearing, missing-anchor recovery, retarget revision/sampler-key fixes, and `.impeccable/` metadata refresh.
Out: Wiring unified story-bible sections into the context builder (`worldcrafter-aq1r`) and shared Context Viewer extension (`worldcrafter-w4mr`).

## Report

Items 1, 3, 4 and 5 are built with tests. Item 2 is dropped: the stale pin it describes can't happen in the shipped app. `cd app && bun run check` passes (1175 tests, 0 failures). Biome's 3 warnings are in `scripts/story.ts` and were already there.

**1. Shortcuts** (`461d35a`). They work in the open document, in its prose and its request slip. They're defined in `app/src/generate/shortcuts.ts` and wired in `GenerationShortcuts` in `app/src/app/shell.tsx`.
- Mod+Enter opens the request for what comes next. With the slip open, it sends the request, edits included. Pressing it twice generates.
- Escape stops a running generation and keeps the text. Escape in a slip that isn't sending still closes the slip, and it claims the key, so it stops nothing.
- Mod+Shift+Enter accepts the ready AI segment holding the caret (`Generation.acceptAtCaret`). With the caret elsewhere, a notice says to put it in the AI text.
- Mod is Ctrl or Cmd. Generate next, Send, Stop and Accept show their keys in `aria-keyshortcuts` and their tooltips.
- Tests: `app/src/generate/shortcuts.test.ts` and three app tests in `app/src/app/generate.app.test.tsx`.

**2. Stale pins: dropped.** The slip has no way to pin a card. `openRequest` always assembles with `pins: []` (`app/src/app/generation.ts`), and so does the demo. Pins are read only while a request is being assembled, so `unknown_pin` can't occur. The original item also asked for a way to pin or exclude world cards in the slip. That part was cut when this mission was planned, and no other item covers it. Once pinning exists, a stale pin needs handling. The lead should decide whether to file pinning as its own item.

**3. Missing anchor** (`008a23f`). Before, when the block a request continues from was deleted, or was an AI segment the writer had since accepted, the slip said "continues the text at the end" and Send failed with `block_not_found`. Now the slip says the text is gone and Send is disabled. It offers "Put it together at the caret", which assembles the request again from the caret. A slip that replaces a segment doesn't depend on that block, so it is not affected. Separately, an empty block the request continues from used to read as "at the end"; it now reads "after an empty paragraph". Test: the app test for a request whose text is gone.

**4. Retarget** (`cd1253e`).
- `segmentRequest` now retargets in memory only. Before, opening a segment's Request stored a revision every time it was opened. The revision is stored once, when the request is sent: either by Regenerate from the caption, or by Send in a slip showing it retargeted, which sends it through `sendEdited`. So looking at a request stores nothing, and a read-only tab writes nothing.
- `retarget` in `app/src/llm/client.ts` drops parameters that only another kind of server reads, such as llama.cpp's `n_probs` sent to OpenRouter. It keeps a parameter the new profile's own sampler sets, and it keeps everything else, the writer's edits included. `addressedTo` now also compares the model and those parameters, so a model change at the same URL retargets.
- `send(requestId)` and `regenerate(segmentId, requestId)` still send exactly the stored request named. Retargeting those too would have rewritten a revision the writer edited on purpose.
- The item says the retarget notice after Regenerate was already shipped. It wasn't: only the slip's note existed. `GenerationResult.retargeted` now carries it, and `describeGenerationResult` adds `RETARGETED` to the notice.
- Tests: `app/src/llm/client.test.ts` ("retargeting a stored request"), `app/src/generate/generate.test.ts` (two new tests, one rewritten), and two app tests.

**5. `.impeccable`** (`44f8d4b`). The narrative, rules and tokens in `design.json` already matched `DESIGN.md`. The rename commit had brought them level. What was missing were four components that `DESIGN.md` documents and the app ships: View Switch, Tabs, Margin Cue and Notices. I added a specimen for each, taken from `app/src/app/styles.css`. The surface brief's `primary_target` is now `app/src/app`; its slug and file name are unchanged, because other items cite the path. `worldcrafter-if6h` is amending `DESIGN.md` right now, so `design.json` will need a sync after it lands.

**Separate fix** (`a496465`). On master too, `bun run check` failed when the host was loaded. The cause is the story CLI test "every example runs" in `app/scripts/story.test.ts`. It starts dozens of CLI processes one after another and took 9.5 s at a load average of 15, over bun's default 5 s timeout. It now has a 30 s budget. The generator's "stays fast" timing test can still fail under load; that is `worldcrafter-08kf`.

