---
schema: atelier.review
schema_version: 3
round: 1
commit: 8934ed75b476f63379635e73a4d0967dac992ea4
reviewers:
- 01a20570-a389-7ab2-94b1-c44d4b7be661
model: grok-4.6
verdict: changes
created_at: 2026-11-22T22:46:44.540915835Z
---

## Summary

- Complexity: high. Five items add bible inspector chrome, live apparatus, talk pages, and an agent-session inspector on top of a store and runner that are not in this tree.
- Value: high. Sumeet asked on 2026-11-22 for inspection of the bible beside live prose and for grounded agent conversation; that is the human-facing half of the typed-store direction.
- Risk of merging it: high. Agreeing this plan as written lets `atelier start` open `worldcrafter-wqh0`, `worldcrafter-hqca`, `worldcrafter-w4mr`, and `worldcrafter-lhh3` against `app/src/world/` + fixture `LayerSource`, and it licenses a chat/inspector surface `DESIGN.md` forbids.

The outcome is worth building. The plan is not startable until sequencing, the unre-planned talk item, and the Night Edition contract are fixed.

Checked commit `8934ed7` (`git show`, mission.md, all five item bodies), `atelier list` / `atelier show worldcrafter-mtkn` / `atelier show worldcrafter-r7vd`, sibling plans on `worldcrafter-r7vd`, `worldcrafter-k7uh`, and `worldcrafter-3z9j`, `DESIGN.md`, `.impeccable/surfaces/writing-workspace.md`, `docs/rebuild/talk-pages.md`, `PRODUCT.md`, and the live app: `app/src/app/{rail,pages,router,layers,gloss,shell,main,manuscript,world}.tsx`, `app/src/layers/model.ts`, `app/src/story/{commands,story,learning,touches,trace,viewpoint.test}.ts`, `app/scripts/story.ts`. Confirmed no `app/src/` UI module imports `~/story`.

Could not check: a spike (none is named), a merged r7vd store/runner (branch is still proposed, plan reviews none), or visual layout of the five inspector views in the 300px rail.

## Finding 1: Unblocked items depend on unmerged store, runner, and mark fixes
Recommendation: fix now
The Why treats `worldcrafter-r7vd` as already present ("even with a strong typed story model and app-owned agent runner"). `atelier show worldcrafter-r7vd` says that mission is still proposed, unreviewed, with `worldcrafter-lgz8` (persist `app/src/story/` in `StorageAdapter` and link scenes to Plate) and `worldcrafter-667u` (Story Agent Runner) both open. Sibling `worldcrafter-k7uh` is also still proposed and owns the Round 5 viewpoint-mark defects (`worldcrafter-0pt4`) that `hqca` would paint.

On this tree the app does not use the story bible. `app/src/app/world.ts` and `app/src/app/manuscript.ts` read `app/src/world/` + `app/src/outline/` + `app/src/time/`. `app/src/app/layers.ts` documents that the app's own `LayerSource` is empty and the demo supplies fixtures. `app/src/app/main.tsx:50` constructs `createLayerSource()` for IndexedDB worlds. `git grep` of `from "~/story` / `from "../story` under `app/src/app` is empty. Story queries live in `app/src/story/` and the CLI (`app/scripts/story.ts` `reader-order --before`).

Despite that, these items have `blocked_by: []` and `atelier list` shows them startable on this branch: `worldcrafter-wqh0` (inspector "backed by the unified story store", fixture "imported Round 5 bible"), `worldcrafter-hqca` (live bible layers, "updates reactively when the agent mutates the story bible"), `worldcrafter-w4mr` (inspect/edit runner sessions; Out even names `worldcrafter-667u`), `worldcrafter-lhh3`. `worldcrafter-rxvy` is blocked on `lhh3` and `wqh0` only, not on `667u`.

`worldcrafter-r7vd`'s own Out already names this UI as `worldcrafter-mtkn`; `worldcrafter-667u`'s Out says "Browser UI (`worldcrafter-mtkn`)". The split is right. The missing `blocked_by` on `lgz8`/`667u` (and `0pt4` for `hqca`'s viewpoint marks) is what will start the work against the wrong model.

Set `blocked_by` so no mtkn item starts until the store and runner it names actually exist, and so `hqca` does not paint `0pt4`'s false viewpoint marks. Rewrite the Why so r7vd is a predecessor, not a given.

## Finding 2: worldcrafter-lhh3 was attached, not re-planned
Recommendation: fix now
`git show 8934ed7 -- .atelier/items/worldcrafter-lhh3/item.md` only changes front matter: `status: open`, `mission: worldcrafter-mtkn`, and it deletes `blocked_by: [worldcrafter-yx9v]`. Goal, Done when, Design, and Notes are the 2026-10-17 rebuild item.

Done when is still "Provisional: scenario tests for both scopes, attribution, and proposals applying only when accepted. Delivers S6." Goal still requires "Messages can carry proposals (edit, fact, relation, record decision)". Design is `docs/rebuild/talk-pages.md` (status: proposal, 2026-10-17). Notes still say (2026-11-05) not to re-plan this under the typed story model and to leave it in the loose backlog until notes-first shows the product needs an app.

That contradicts this mission: `worldcrafter-yx9v` is explicitly Out ("Block-ID prose suggestion diffs … remains independent backlog"), yet dropping the `yx9v` blocker leaves the proposals requirement in place. `rxvy` then has to implement "talk pages" on top of an item whose done-line is S6 of the old rebuild.

Rewrite `lhh3` for this mission: world/document talk topics, status, attribution, world inbox, running the app-owned runner; drop or re-scope proposals so they do not secretly pull `yx9v` back in; replace the 2026-11-05 "do not re-plan" note with why this mission is the re-plan. Keep `rxvy` as the anchoring increment.

## Finding 3: Inspector and talk pages break Night Edition rules the plan does not amend
Recommendation: fix now
`.impeccable/surfaces/writing-workspace.md` thesis: "Refuses the binder-editor-inspector triptych and any chat panel." `DESIGN.md` Overview: "there are no panels, no cards around notes, and no chat surface." Named layout is a 300px rail with exactly three views (Manuscript / World / Topics), gloss notes as lettered keys, Topics as an inbox list, and generation context as the existing Context Viewer (`app/src/generate/context-viewer.tsx`). Authority says breaking `DESIGN.md` waits for Sumeet.

The items as written do not stay inside that. `wqh0` asks for "dedicated inspector views" for Cast/Drives, Open Questions, Timeline/Counts, Reader-Order, and Contradictions. `lhh3`/`rxvy` ask for talk-page conversation. `w4mr` asks to inspect and edit system prompt, context packet, and tool traces "without leaving the workspace." None of those surfaces is specified as an extension of World / Topics / Context / gloss. `DESIGN.md` is not in Scope as a document to amend.

Sumeet did ask for bible inspection and grounded conversation, and `PRODUCT.md` already plans talk pages as topics rather than global chat. That is reconcilable with Night Edition if World grows bible lists, Topics stays the talk surface, gloss carries live marks, and prompt inspection reuses the Context Viewer — and if `DESIGN.md` is updated for whatever new chrome is actually needed. The plan currently leaves an implementer free to add a Codex-like chat/inspector pane, which is the named refusal.

Name the surfaces against the existing rail and gloss, and put a `DESIGN.md` amendment in scope (or an explicit wait for Sumeet) for anything that adds a chat panel, a fourth rail view, or dashboard inspector chrome.

## Finding 4: Live layers have no mapping from bible records onto prose anchors
Recommendation: defer
`hqca` wants opening a scene to display story-time stamp, opening counts, viewpoint dramatic-irony marks, planted/paid-off objects, and time spans in apparatus and gloss, with zero reflow.

The Night Edition layer model (`app/src/layers/model.ts`) attaches marks by `TextAnchor` `{blockId, quote, occurrence?}` in the Plate tree. The story bible's `reader-order --before`, `viewpointGap`, counts, and plants (`app/src/story/learning.ts`, `counts.ts`, scene `plants`/`paysOff` links) are record-level, not quote-level. `lgz8` has not yet linked `Scene` records to Plate documents. Speakers, World name underlines, and Subtext remain the bookkeeping pass (`worldcrafter-8agg` / `worldcrafter-vw7x`), which `hqca` correctly leaves Out.

Without a mapping rule, an implementer will either invent quote-finding heuristics (the Out of `8agg`) or dump bible facts as unanchored gloss, which breaks "attached to the words it is about." After the store exists, specify which facts become keyed gloss vs masthead stamp vs Time/World paint, and that speakers/subtext stay fixtures until `8agg`.

## Finding 5: Prompt inspector duplicates generation Context Viewer with no reuse rule
Recommendation: defer
`w4mr` builds a new prompt/context/tool-trace inspector in `app/src/app/`. The workspace already has an editable assembled-request surface (`app/src/generate/context-viewer.tsx`, masthead Context button in `shell.tsx`). `PRODUCT.md` already describes that as the power-control pattern.

`667u` will persist turn logs; `w4mr` should be the Night Edition view of those logs plus prompt override, not a second editor. Record that it extends the Context Viewer / request-slip grammar and that tool-trace chrome stays apparatus (Source Sans, hairlines, no vermilion except AI prose segments — already in Done when).
