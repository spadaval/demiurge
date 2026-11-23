---
schema: atelier.review
schema_version: 3
round: 1
commit: 21142f4fe62a1ed32a34e7ee77dcdcfd57d3273d
reviewers:
- 01a20646-93f2-7b70-a99c-80e0888545c5
model: grok-4.6
verdict: approve
created_at: 2026-11-23T02:40:24.364340865Z
---

## Summary

- Complexity: medium. One owner (`learning.ts` plus the CLI mark lines) gains several moving parts: `sceneSpan` / story-order anchors, group membership overlap, revealed-knowledge expansion, inclusive `--until` as the scene opens, and `viewpointTurns`.
- Value: high. Secondary-viewpoint marks were mostly false in Round 5 and cost the writer sixteen hand-made records.
- Risk of merging it: medium. Wrong marks still mislead a writer who trusts `reader-order --before`, but they print in that output and the change reverts cleanly.

The value warrants the change. The five defects are the right cut; leftover shared-senses marks belong in `worldcrafter-lfyv`, not a larger rewrite here.

Reviewed `git diff master...21142f4fe62a1ed32a34e7ee77dcdcfd57d3273d` against each Done when line and the Report. Read `app/src/story/learning.ts` (`sceneSpan`, `viewpointGap`, `viewpointTurns`, `shownFrom`), the CLI wiring in `toldBeforeLines`, and the new tests in `app/src/story/viewpoint.test.ts` and `app/scripts/story.test.ts`. Cross-checked the five defects against `docs/rounds/round-5/reading.md` ranked items 2–4.

Re-ran `reader-order --before` on Round 5 phase snapshots taken before the writer's clearing records (`demiurge-world/round-5/phases/{outline,scene-1,scene-2,scene-3}/work/story.json`):

- s15 (Kit, outline): 2 marks. `event:penny-sells` is "doesn't know yet" plus "knows from event:wending-fair, in this scene".
- s21 (Silt, scene-1): 10 marks become 4. `bought-watch`, `histories-swarm`, `majority-holding`, `chat-name`, `penny-sells`, `hush-limit` are gone. `corvin-release` and `names-restore` stay. `corvin-pact` and `tender` stay. Header is `as it opens at event:dark-gallery` (unplaced; no calendar `at`).
- s25 (Kit, scene-2): 6 marks, all the same true ones. `candidate:why-silent/hiding` now also notes "knows from event:lampwick-confesses, in this scene".
- s34 (Brannoc, scene-3): `bought-watch`, `chat-name`, `hush-limit`, `names-restore`, `surety`, `penny-sells` are gone. `version:brannoc-saltcombe` is "believes until event:closing-bell, in this scene", not "no longer believes". `saltcombe-clerks` and `foreclosure` appear as "doesn't know, believes version:…", each ending at the bell. `corvin-release`, `ysolde-bargain`, `penny-line` stay. `candidate:why-silent/hiding` stays "doesn't know yet" with "knows from event:closing-bell, in this scene". `event:tender` stays.

On a copy of scene-1, `silt knows event:tender --since closing-bell` turns the s21 tender mark from "doesn't know" into "doesn't know yet" instead of dropping it.

`cd app && bunx tsc --noEmit` passes. `biome check` exits 0 with three unused-import warnings already on master (`isYear`, `stepAt`, `listLine`). `bun test --timeout 30000` is 1159 pass, 0 fail. Plain `bun run check` failed once here: the `--help` examples test hit bun's default 5s timeout (code `null` on `set-reader-question-scenes`); the same test is 7s with `--timeout 30000` and is not this change.

Could not check: day counts on unplaced scenes (still `sceneNow`; `worldcrafter-yxfp`); whether Silt or Brannoc should know the tender in the bible (writer later added `--since crow-letter` records; out of this item).

## Finding 1: Silt's tender and corvin-pact marks, and Brannoc's tender, stay false
Recommendation: no action
The second Done when line asks the Round 5 false marks to clear. These three remain: Silt `event:tender` and `event:corvin-pact` before s21; Brannoc `event:tender` before s34. None of the five fixes covers them. Tender and the pact are revealed in `s06-audit` through Corvin's eyes (`corvin`, `exchequer` only). Silt is not in `s13-crow` (where Kit learns the pact). Brannoc has no tender record and is in no scene that reveals it. Round 5's reading already sent these to shared senses. That is `worldcrafter-lfyv`. Do not grow this item to invent a reach rule.

## Finding 2: `reader-order --before` flag help still describes the old mark rule
Recommendation: defer
Dropped by mcp:b66be996-8cb2-4d67-a57b-cacf9ea7bc65: Fixed on worldcrafter-0pt4's own branch in round 2, before it merged as de8ebda: the reader-order --before flag help in app/scripts/story.ts now gives the new mark rule, and review 2-qwg9 approved it.
`app/scripts/story.ts` around line 1828 (`READS["reader-order"].flags.before.help`) still says the actor knows what a scene they are in "reveals or pays off, from that scene's latest event on". It does not mention groups, a revealed knowledge record telling what it is of, marks as the scene opens, or "in this scene" turns. The long `--help` paragraph (around 1967) was updated and is right. Writers who read only the flag line will miss the new contract. Update that string on a later pass; it does not change behaviour.
