---
schema: atelier.review
schema_version: 3
round: 2
commit: 0edf0696677c0e0b6f966211c7fec5739bc720dd
reviewers:
- 01a20586-f41d-7c12-906f-c72c5dd487ef
model: grok-4.6
verdict: approve
created_at: 2026-11-22T23:11:08.239067240Z
---

## Summary

Complexity: high. Six items add a DESIGN.md grammar pass, bible inspector chrome, live apparatus, talk pages, and an agent-session inspector, sequenced on store, runner, and mark-fix work in other missions.
Value: high. Sumeet asked on 2026-11-22 for bible inspection beside live prose and for grounded, scoped agent conversation; that is the human-facing half of the typed-store direction.
Risk of merging the plan: low. The startable item after agree is `worldcrafter-if6h` (DESIGN.md only). `wqh0`, `hqca`, `w4mr`, and `lhh3` are blocked on existing open items (`lgz8`, `7r87`, `667u`, `yxfp`, `0pt4`, `if6h`), and `atelier show worldcrafter-mtkn` reports those blockers.

Checked `git diff 8934ed7..0edf069` on the six plan files in the brief, then the items and mission at 0edf069 against the tree: `DESIGN.md:134` and `:244`, `.impeccable/surfaces/writing-workspace.md`, `docs/rebuild/talk-pages.md`, `app/src/app/layers.ts`, `app/scripts/measure-layers.ts`, `app/src/generate/context-viewer.tsx`, sibling items `worldcrafter-lgz8`, `667u`, `7r87`, `0pt4`, `yxfp`, mission `worldcrafter-r7vd`, and `atelier show` / `atelier list` for startability. Round 1 reviews 1-5c22 and 1-dbs8.

Could not check: a merged r7vd store/runner (lgz8 and 667u are still open), or whether Sumeet will accept the DESIGN.md amendment `if6h` writes. `atelier show worldcrafter-lhh3` still reads master's copy (mission none, blocked by yx9v) because that item exists on the base; the rewrite is in the plan files at 0edf069 and is what this review judges.

Round 1's sequencing, unre-planned talk item, Night Edition contract, mark-fix blockers, hqca Done when, and w4mr edit-scope findings are addressed. No remaining fix-now. Two leftovers are real and can wait: lhh3 still names the 2026-10-17 talk-pages proposal, and w4mr's Scope section never mentions `aq1r`.

## Finding 1: Nothing orders this mission after the store and runner it is built on
Recommendation: fix now
Was: 1-5c22.1
Now: fixed
`wqh0` is blocked on `if6h`, `lgz8`, `7r87`. `hqca` is blocked on `lgz8`, `7r87`, `yxfp`, `0pt4`. `w4mr` and `lhh3` are blocked on `if6h` and `667u`. Those blocker items exist on this tree (`atelier show` reports them open). The Round 5 fixture-import path on `qizl` is gone: `wqh0` tests on "a committed fixture story", which `lgz8` already commits. `if6h` is the only mtkn item with empty `blocked_by`, and it only amends `DESIGN.md`.

## Finding 2: `worldcrafter-lhh3` was moved into the mission without being re-planned
Recommendation: fix now
Was: 1-5c22.2
Now: fixed
Goal, Done when, and Scope are rewritten for story-bible scopes, `StorageAdapter` persistence, the Night Edition `Topics` view, and the Story Agent Runner. Edit proposals and `yx9v` are Scope Out. The 2026-10-29 and 2026-11-05 notes are marked superseded. The leftover pointer to `docs/rebuild/talk-pages.md` is Finding 10.

## Finding 3: `DESIGN.md` has no form for three of the four surfaces, and its "no chat surface" line needs a ruling
Recommendation: fix now
Was: 1-5c22.3
Now: fixed
`worldcrafter-if6h` is the first item: it amends `DESIGN.md` (and the `.impeccable/` brief if stale) to place the `World` inspector, scoped `Topics` talk pages, and the Context Viewer prompt/tool-trace slip, and to distinguish scoped talk from global chat. `wqh0`, `lhh3`, and `w4mr` are blocked on it. Mission Authority records Sumeet's 2026-11-22 direction for the Codex-style inspector and scoped talk-page UI, and keeps "no global chat" as a core rule that still waits for him.

## Finding 4: `hqca` would paint viewpoint marks that are known to be wrong
Recommendation: fix now
Was: 1-5c22.4
Now: fixed
`hqca` `blocked_by` lists `worldcrafter-0pt4` and `worldcrafter-yxfp`. Done when names those fixes for viewpoint marks and time spans.

## Finding 5: `hqca`'s Done when misses part of its Goal and doesn't name the measurement tool
Recommendation: fix now
Was: 1-5c22.5
Now: fixed
Done when now covers versions vs. truth and names `app/scripts/measure-layers.ts` plus `app/src/app/layers.test.tsx`. Both paths exist.

## Finding 6: `w4mr` doesn't say where prompt and packet edits apply or persist, and it overlaps `aq1r`
Recommendation: fix now
Was: 1-5c22.6
Now: fixed
Goal states edit-scope rules (session-only vs. save-as-default for prompt/profile; next-turn-only immutable request revision for the packet) and names `app/src/generate/context-viewer.tsx` as the shared viewer `aq1r` reuses. Done when tests those scopes. The `## Scope` In/Out lines still omit `aq1r`; that remainder is Finding 11.

## Finding 7: Unblocked items depend on unmerged store, runner, and mark fixes
Recommendation: fix now
Was: 1-dbs8.1
Now: fixed
Same blockers as Finding 1. `atelier list --startable` does not offer `wqh0`, `hqca`, `w4mr`, or `lhh3`. `r7vd` is agreed on this tree; `lgz8` and `667u` exist and are open. Outcome and success criteria name `r7vd` / `667u` as predecessors the UI wires to.

## Finding 8: worldcrafter-lhh3 was attached, not re-planned
Recommendation: fix now
Was: 1-dbs8.2
Now: fixed
Same rewrite as Finding 2. `rxvy` stays the anchoring increment (blocked on `lhh3` and `wqh0`).

## Finding 9: Inspector and talk pages break Night Edition rules the plan does not amend
Recommendation: fix now
Was: 1-dbs8.3
Now: fixed
Surfaces are named against the existing rail: bible lists in `World`, talk in `Topics`, prompt inspection as an extension of `app/src/generate/context-viewer.tsx`. Amending `DESIGN.md` is in mission Scope via `if6h`. Downstream UI items check the amended spec.

## Finding 10: `lhh3` still names the 2026-10-17 talk-pages proposal as a design source
Recommendation: defer
`.atelier/items/worldcrafter-lhh3/item.md` Goal still points at `docs/rebuild/talk-pages.md` (status: proposal, 2026-10-17). That document still specifies document/world-facts scopes, `proposals?: ProposalRef[]`, and "Propose edit: AI edit operations against block IDs". The item's own Goal and Scope Out exclude `yx9v`, and Done when has no proposal line, so this does not start the wrong work. Drop or annotate the pointer when `lhh3` is implemented so the old proposal is not read as the spec.

## Finding 11: `w4mr`'s Scope section never names sharing with `aq1r`
Recommendation: defer
`.atelier/items/worldcrafter-w4mr/item.md` Goal and Done when assign `context-viewer.tsx` as the single shared viewer. `## Scope` In/Out still only mention `app/src/app/`, `667u`, and `o7to`. Add the sharing line when `w4mr` starts, or when `aq1r` is planned, so the two items cannot drift.
