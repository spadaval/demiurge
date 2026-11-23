---
schema: atelier.review
schema_version: 3
round: 3
commit: 85412fcb021e996288d2afb2968f98ff1667fa5a
reviewers:
- thread:delegated-task:command%3Amcp%3Aca35fb7c-3881-48d4-8598-71f95eebeedf%3Adelegate-task%3Aecbab589-f597-40ab-9f7c-5b873f121ab9
model: gpt-6.1-sol
verdict: changes
created_at: 2026-11-23T07:45:41.451944559Z
---

## Summary

Complexity: high. This adds a persisted talk subsystem, agent-session coordination, and sheet tabs across storage and UI owners.

Value: high. Scoped conversations and the World inbox need the persistence, attribution, and runner integration; a substantially smaller change would not deliver them.

Risk of merging it: medium. The two carried writing/conversation regressions are fixed, but the merge with master removed visible Topics styling required by DESIGN.md.

I checked both carried findings, the changes from 8471e31 through 85412fc in the item's paths, and the merge integration with the live bible service, inspector ledgers, routes, and shared styles. I checked the Done when lines and the updated Report against the code and tests. `cd app && bun run check` passes: typecheck and lint pass, 1723 tests pass, 0 fail. That includes the new held-response component regressions for both carried findings, the topic-to-bible edit scenario, and the persistence, attribution, multi-turn tool-call, status, and inbox scenarios.

I also compared the previous and current stylesheet using happy-dom's parsed CSS rules and computed styles. The merge deletes the active-topic marker and conversation list reset, and removes the rail action padding. No application or test files were changed. I did not run a real browser, a production model, or a deployed sync Worker. The reported exclusions for the agent-slip host, anchored launches, proposals, and the agent's topic-raising tool remain outside this round's changes. The implementation remains worth building, but the new stylesheet regression needs fixing before merge.

## Finding 1: Keep text typed during a new topic's first model turn
Recommendation: fix now
Was: 2-c04g.5
Response: fixed in 2d2cb74
Now: fixed

The first-turn cleanup now clears only the unsent title and preserves text typed after Send. The held-response component regression types the next message while the first response is pending and verifies that it remains after the draft becomes a stored topic. It passes in the full check.

## Finding 2: Do not show a running turn's writer message twice after navigation
Recommendation: fix now
Was: 2-c04g.6
Response: fixed in 2d2cb74
Now: fixed

The running turn records the loaded message count before Send. Its optimistic writer message renders only until the sheet contains the persisted message. This does not compare message bodies, so repeated text remains valid. The component regression navigates away and back with the stub response held, verifies one writer message, then releases the reply and verifies the final conversation. It passes in the full check.

## Finding 3: Restore the Topics styles deleted when merging the inspector
Recommendation: fix now

The merge in 7768301 removes working Topics rules from `app/src/app/styles.css:389` and drops `.turns` from the list reset now at `app/src/app/styles.css:2113`. There is no replacement `.topic-row[aria-current="page"]::before` rule anywhere, so opening a topic no longer shows DESIGN.md's required 3px active bar. There is also no remaining `.turns` rule, so the `<ol className="turns">` used by both topic sheets regains browser list numbering and default margin/padding instead of the specified aligned record of turns. The same merge removes `.rail-more`, `.rail-count`, `.rail-foot-link`, and the standalone `.topic-title` rules, leaving the old hover selector around what used to be the title rule.

I parsed both stylesheets in happy-dom. The active-marker selector and the list reset containing `.turns` exist at 8471e31 and are absent at 85412fc. The computed `.turns` margin/padding changes from explicit zero to unset, and `.rail-more` loses its 20px left padding and 6px top margin. The current component tests assert the active row's `aria-current` attribute but never load the stylesheet, so they pass despite the missing marker and reset.

Restore the Topics-only rules while retaining the inspector's shared ledger styles. Check a populated topic and the Topics rail with the actual stylesheet so the active marker, unnumbered aligned turns, and inset rail actions survive the merge.
