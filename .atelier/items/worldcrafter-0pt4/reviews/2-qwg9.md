---
schema: atelier.review
schema_version: 3
round: 2
commit: 18bfe057bd75ca366d5856659ecf881268dba193
reviewers:
- 01a20657-07f0-7aa3-9623-7d5c17479ae7
model: grok-4.6
verdict: approve
created_at: 2026-11-23T02:58:23.205771076Z
---

## Summary

- Complexity: medium. One owner (`learning.ts` plus the CLI mark lines) gains several moving parts: `sceneSpan` / story-order anchors, group membership overlap, revealed-knowledge expansion, inclusive `--until` as the scene opens, and `viewpointTurns`. This round's delta is one help string.
- Value: high. Secondary-viewpoint marks were mostly false in Round 5 and cost the writer sixteen hand-made records.
- Risk of merging it: medium. Wrong marks still mislead a writer who trusts `reader-order --before`, but they print in that output and the change reverts cleanly.

The value warrants the change. Round 1's deferred flag-help finding is addressed. The leftover shared-senses marks still belong in `worldcrafter-lfyv`.

This round checked `git diff 21142f4fe62a1ed32a34e7ee77dcdcfd57d3273d 18bfe057bd75ca366d5856659ecf881268dba193` (help string only, plus the item note) and re-read the whole change `git diff master...18bfe057bd75ca366d5856659ecf881268dba193`. Read `app/src/story/learning.ts` (`sceneSpan`, `viewpointGap`, `viewpointTurns`, `shownFrom`), `toldBeforeLines` in `app/scripts/story.ts`, the flag help at `READS["reader-order"].flags.before.help`, the long `--help` paragraph, and the tests in `app/src/story/viewpoint.test.ts` ("round 5's viewpoint mark defects") and `app/scripts/story.test.ts`.

Review 1-5tmu finding 2: the flag help now names groups, a revealed knowledge record telling what it is of, marks as the scene opens, and "in this scene" turns. `--help` prints that string. The phrase "from that scene's latest event on" remains, and it still matches `shownFrom`: presence in another scene attaches just after that scene's latest event. Mark evaluation is the later "as the scene opens". Finding 2 is done.

Re-ran `reader-order --before` on Round 5 phase snapshots taken before the writer's clearing records (`demiurge-world/round-5/phases/{outline,scene-1,scene-2,scene-3}/work/story.json`):

- s15 (Kit, outline): 2 marks. `event:penny-sells` is "doesn't know yet" plus "knows from event:wending-fair, in this scene".
- s21 (Silt, scene-1): 10 marks become 4. `bought-watch`, `histories-swarm`, `majority-holding`, `chat-name`, `penny-sells`, `hush-limit` are gone. `corvin-release` and `names-restore` stay. `corvin-pact` and `tender` stay. Header is `as it opens at event:dark-gallery` (unplaced; no calendar `at`).
- s25 (Kit, scene-2): 6 marks, all the same true ones. `candidate:why-silent/hiding` notes "knows from event:lampwick-confesses, in this scene".
- s34 (Brannoc, scene-3): `bought-watch`, `chat-name`, `hush-limit`, `names-restore`, `surety`, `penny-sells` are gone. `version:brannoc-saltcombe` is "believes until event:closing-bell, in this scene". `saltcombe-clerks` and `foreclosure` appear as "doesn't know, believes version:…", each ending at the bell. `corvin-release`, `ysolde-bargain`, `penny-line` stay. `candidate:why-silent/hiding` stays "doesn't know yet" with "knows from event:closing-bell, in this scene". `event:tender` stays.

On a copy of scene-1, `silt knows event:tender --since closing-bell` turns the s21 tender mark from "doesn't know" into "doesn't know yet" instead of dropping it.

`cd app && bunx tsc --noEmit` passes. `biome check` exits 0 with three unused-import warnings already on master (`isYear`, `stepAt`, `listLine`). `bun test --timeout 30000` is 1159 pass, 0 fail. The `--help` examples test is about 4s here.

Could not check: day counts on unplaced scenes (still `sceneNow`; `worldcrafter-yxfp`); whether Silt or Brannoc should know the tender in the bible (writer later added `--since crow-letter` records; out of this item).

## Finding 1: Silt's tender and corvin-pact marks, and Brannoc's tender, stay false
Recommendation: no action
Same leftover as review 1-5tmu finding 1. The second Done when line asks the Round 5 false marks to clear. These three remain: Silt `event:tender` and `event:corvin-pact` before s21; Brannoc `event:tender` before s34. None of the five fixes covers them. Tender and the pact are revealed in `s06-audit` through Corvin's eyes (`corvin`, `exchequer` only). Silt is not in `s13-crow` (where Kit learns the pact). Brannoc has no tender record and is in no scene that reveals it. Round 5's reading already sent these to shared senses. That is `worldcrafter-lfyv`. Do not grow this item to invent a reach rule.
