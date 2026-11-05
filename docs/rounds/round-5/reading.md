# Round 5 reading: how the writer used Demiurge

This is an audit (agent-factory `audit`) of the writer's sessions for mission worldcrafter-gwx3, Round 5 (worldcrafter-hdly), the last round the direction allows. It reports findings with evidence and suggests fixes. It changes nothing in the repository or the round directory apart from this file.

## Sources and method

- **Transcripts.** I read `phases/{outline,scene-1..4}/transcript.jsonl` and extracted every tool call and result with a script. Citations look like `scene-3 L62 CALL#4`: L is the line in the JSONL file and CALL# is the tool-call index within that phase, counting Write calls. As in Rounds 1 to 4, the writer's thinking isn't visible, so its intent comes only from its text, its commands and `model-gaps.md`.
- **Replay.** I re-ran every Bash and Write call from all five phases, in order, in a bubblewrap sandbox laid out like the writer's: `/story`, the round's `tool/` at `/opt/story-tool`, and the CLI called directly, so batch keys match. The replayed `story.json`, `model-gaps.md` and all four scene files are byte-identical to every phase's `work/` snapshot and to `work/`. I did three runs:
  - an exact run, whose output matches the transcript (every trace, mark and refusal quoted below comes from it);
  - a counting run, with a `bun` wrapper that logs its arguments and then `exec`s the real bun (its output also matches);
  - an unfiltered run, with every `| head`, `| tail`, `| grep` and `2>/dev/null` on a CLI call removed. The filters hid other records' lines and earlier count values, and no warning, trace or refusal.
- **Experiments on copies.** On phase snapshots I ran `span`, `trace` and `reader-order --before`. I tested what drives the viewpoint marks by removing one knowledge record, by running a copy of `tool/story.js` with one condition removed, and by adding records with late `--since` values (section 3). I checked every "N days before" in the four pre-scene `reader-order` outputs against the calendar with a script, and ran the same check on Rounds 2 to 4's final models.
- **Other material.** I read the four scenes, the four stories so far (for what judges were told), `model-gaps.md`, the skill as built (`tool/story-sketch/SKILL.md`, identical to `.agents/skills/story-sketch/SKILL.md`), `points.json`, `scene-order.json`, `run.json`, the phase records and git logs, `phases/outline/recheck.json`, Round 4's reading and the Verdict and ranked-issue sections of Rounds 1 to 3, decisions worldcrafter-jeue and worldcrafter-dgkx with notes, worldcrafter-hdly with notes, and the span, viewpoint and trace code in `tool/story.js` (built from `app/src/story/calendar.ts` and `app/src/story/learning.ts`).
- **The transcript-check flag.** The outline's one "outside its directory" flag was on a heredoc appending to `model-gaps.md` (outline L219 CALL#9). The slashes it matched are prose ("bound to / owned by", a rhyme's line breaks). `recheck.json` shows no problems after the check was fixed. I found no read outside `/story` and `/opt/story-tool`.
- **Run shape.** The four scenes ran in the resumed outline session, so the cost figures in `record.json` are cumulative; the per-phase deltas are given here.

  | Phase | Time | Turns | Tool calls | Cost |
  |---|---|---|---|---|
  | Outline | 794 s | 32 | 31 | $2.71 |
  | Scenes 1 to 4 | 112, 130, 163 and 181 s | 7 each | 6 each | $0.47, $0.54, $0.66 and $0.78 |

  Round 4's outline took 1,149 s, 40 turns and $4.03. The scenes are beats 16, 22, 26 and 36 of 38 (`points.json`). `s25-lampwick` (a reveal) and `s34-bell` (a reversal, inside 31..38) were chosen as turns, 10 beats apart. `s15-wending` and `s21-dark` were drawn at random. `s21` and `s25` are 4 beats apart.

## 1. How the writer used the tool

**Shape of use.** The writer made 1,098 CLI calls: 945 in the outline's 31 tool calls and 153 in the scene phases' 24 (28, 45, 34 and 46). Round 4 made 1,402 and Round 3 1,134. It used one pass-through helper, `S() { bun "$STORY_CLI" story.json "$@"; }`, with `P` for `set-participant` and `for` loops for causes, drive relations and knowledge. It built in layers and committed nine times (`phases/outline/git-log.txt`):

1. 19 actors (outline L186 CALL#3), then the history and the main plot, 57 events with positions or constraints (CALL#4, #5), and `contradictions`
2. 54 causes in a loop, which surfaced one kept cause problem it fixed at once (L203 CALL#6, L207 CALL#7); 13 memberships and the participants (CALL#8)
3. 8 objects and 14 world facts (CALL#9)
4. 20 drives with origins and relations (CALL#10), then 3 more and 17 turns (CALL#11)
5. open questions with candidates, tried once with `touches` (L241 CALL#12), answered and rejected with reasons (CALL#13); then versions and knowledge (CALL#14)
6. two counts with 20 values, read back with `show count:` (L259 CALL#15). The read showed `the-count` "205 of 402, reaching more than half" because the Counting House events had no positions yet; the writer placed them to the hour, and the line became "205 of 410, 1 short" (L267 CALL#16)
7. 38 scenes, each with a viewpoint, actors, events, links and pressures (CALL#18 to #24), and 9 reader questions
8. `gaps` (L313 CALL#25) and one round of answers (CALL#26)
9. a `reader-order --before s25-lampwick` read while still outlining (L325 CALL#27), which led to rewriting a world fact (section 2); two `span`s; a last open question with `--conflict` that changed the climax's mechanics (CALL#30, #31)

Subcommand totals from the counting run, with scene-phase counts in brackets:

| Command | Count | Command | Count |
|---|---|---|---|
| set-participant | 158 (12) | add-version | 11 (4) |
| set-scene-links | 81 replace + 26 `--add` (20) + 2 `--remove` (1) | update-scene | 11 (7) |
| add-event / set-position | 65 (3) / 59 (2) | contradictions | 10 (3) |
| add-cause | 60 (3) | add-open-question | 10 (1) |
| add-knowledge | 55 (23) | add-object / add-reader-question / set-reader-question-scenes | 9 each (1 add-object) |
| set-scene-events | 39 (1) + 2 `--add` (2) | answer-open-question | 8 |
| add-scene / set-scene-viewpoint | 38 / 38 | reader-order | 7 `--before` (6 in scenes, 2 of them `\| grep` re-checks) |
| set-scene-actors / -pressures | 38 + 4 `--add` (3) / 38 + 4 `--add` (1) | mark-gap-deliberate | 6 |
| add-candidate | 33 (3) | describe-event / remove-knowledge / update-fact | 3 each (2 / 1 / 2) |
| add-fact | 27 (10) | add-count / gaps / update-knowledge | 2 each (1 update-knowledge) |
| set-count | 27 (4) | init, `--help`, remove-constraint, remove-cause, touches, move-scene, remove-reader-question, list, render | 1 each |
| relate-drives | 25 | scenes, update-actor, update-candidate, update-membership | 1 each, all in scenes |
| set-drive-origins / add-drive | 24 / 23 | | |
| show | 22 (19) | | |
| add-actor | 21 (1) | | |
| add-drive-turn | 17 | | |
| reject-candidate | 16 | | |
| span | 13 (11) | | |
| add-membership / constrain | 13 / 12 (2) | | |

**What it built** (final `story.json`). Round 4's figures are in brackets.

| Kind | Count | Notes |
|---|---|---|
| Actors | 21 (34) | 16 persons and 5 organizations: Chat, the Pale Exchequer, the House of Pale Coin, the Collegium of Pacts and the Order of the Quiet Lamp. Lampwick and Saint Iver are separate actors. |
| Facts | 27 (53) | All with `--about`. 10 were added in the scene phases, from what the prose invented. |
| Events | 65 (80) | 59 placed: 14 by year (1 a year range), 5 by month, 26 by day (2 day ranges) and 14 to the minute, from year 700 (the Concordance) to 23 December 1187. 11 constraints, 59 causes, 158 participants. |
| Drives | 23 (35) | 25 relations and 17 turns: 12 satisfied, 4 replaced and 1 renounced. The Exchequer's drive has no turn (section 5). |
| Counts | 2 (3) | `gallery` (11 values) and `bought` (9 values, `--of gallery`, more-than-half threshold). |
| Memberships | 13 (17) | Chat's regulars, Pennywhistle sold to the Exchequer until Lampnight, Lampwick out of Chat at the bell, Corvin and Maud bound to the Exchequer until the bell. |
| Viewpoints | 38 (37) | 29 Kit, 4 Corvin, 2 Brannoc, 2 Pennywhistle and 1 Silt. |
| Versions | 11 (13) | Kit's Sump story, Maud's "I meant to come back", the Collegium's history of Hollin and Hollin's own account, Brannoc's vision and his Saltcombe belief, the Order's penance, Corvin's offer, Lampwick's account, and the Exchequer speaking as Iver with Iver's answer. |
| Knowledge | 52 (54) | 44 knows and 8 believes; 44 with `--since` and 6 with `--until`. 22 were added in the scene phases, 16 of them to clear false viewpoint marks (section 3). |
| Objects | 9 (11) | The pale coin, the lamp-shield, the pocket ledger, Hollin's roll, Maud's ledger, the Penny rhyme, "'Night, Chat'", Kit's player's memory, and the receipt coins (added in scene 4). |
| Open questions | 10 (11) | 33 candidates, 16 rejected with reasons. 8 answered. `ysolde-end` and `seal-cracks` are left undecided on purpose. |
| Reader questions | 8 (11) | |
| Scenes | 38 (37) | 194 actor entries, 43 depicts, 101 pressures, 93 reveals, 14 implies, 9 withholds, 18 plants and 36 pays-off. |
| Deliberate gaps | 6 (8) | Each with a reason. |

**How rich the world is: rich, with fewer records than Round 4.** The bible is about two-thirds of Round 4's size, and the outline cost two-thirds as much, but the world has the same layers:

- **Institutions and law:**
  - the Thrones and the Concordance (every pact registered, every patron a Throne, no pooled pacts)
  - the Collegium and its wardens
  - majority holding (more than half of a multitude's patrons claims the whole pact)
  - the Lamp's right of the walker in the dark
  - a foreclosed god as collateral
  - the rule that the books close on the factor's entry
- **Economy:**
  - spells bought live in tithes, with requests pinned to them
  - sustenance contracts for starving gods
  - debts, sureties and indentures in the Counting House
  - receipt coins that count only when entered
- **History:** the Concordance, Hollin's fall at Saltcombe (884), the walling of the Marle (1078, added in scene 2), the Debtors' Oak hangings (1089), the Harbour Fire (1141, added to answer a gap prompt), the Salt War and the Order's loan.
- **Places:** Lanthorn, the Sinks and the Sump, the Marle and its fords, the Drowned Lantern, Tanners' Stair, Wending, Orrin Bridge, Fennick, drowned Saltcombe, Iver's Square, the Chandlers' bell tower and the Counting House. As before, they are held in facts and event text.

The scenes draw on this throughout: the scroll's italic lines, the cups and balls and Abel's fiddle, Thimble and the Tollhouse Saint, the Exchequer's clerk-voice ("It is noted that you are hungry"), the Sump plays and the goose, the lamps that hung at Silt's banks, the Walker's Hour, the sleeping face Maud drilled into Kit, the receipt coins on the chapter steps and the white wax seal.

**What it ignored or barely used:**

- `render` ran once, for `--section undecided,contradictions` (L355 CALL#31).
- `trace` and `mentions` never ran; the one inline trace was read.
- `touches` ran once; `leave-for-reader`, `update-count`, `unanswer-open-question` and `update-reader-question` never.
- In scene 1 the writer grepped the raw `story.json` twice (`grep -rn "Wending" story.json`, `grep -rn "Warden" story.json | grep -i since`, scene-1 L19 CALL#2, L29 CALL#4), apparently looking for when Pennywhistle became a Warden, which no record held. It then added `fact:penny-first-laugh`.

## 2. Did the Round 4 fixes take?

**Counts as the scene opens, then each change: yes, and they decided the numbers in every scene.**

| Before | Counts section | Prose |
|---|---|---|
| s15 | `bought` 196 of 489, 49 short, since `penny-sells`; `gallery` 489 since `orrin-bridge` | "Four hundred and eighty-nine… One hundred and ninety-six of them now… Forty-nine short of more than half" (s15:69 to 71) |
| s21 | `bought` 214 of 489, 31 short, then 200 of 402 at `dark-gallery`; `gallery` 489, then 402 | "four hundred and eighty-nine others" (s21:13); the losses in the dark. The writer re-set both values with notes that do the sum: "214 + 6 - 20 = 200 of 402" and "sixty-seven white, twenty grey" (scene-2 L44 CALL#4) |
| s25 | `bought` 200 of 402; `gallery` 402 | "Four hundred and two of them, and two hundred of those were grey" (s25:21) |
| s34 | `bought` 205 of 410, 1 short, then 0 at `closing-bell`; `gallery` 410 | 203, 204 and 205 receipt coins, "two hundred and six" on paper, and "nothing of four hundred and nine" after Lampwick leaves (s34:5 to 87) |

Round 4's opening values came from memory, and one was drafted wrong. This round every opening number in the prose is the value the counts section printed, and no `show count:` call was needed to find it.

**Viewpoint marks: true for Kit, mostly false for the other viewpoints; read and acted on.**

| Before | Viewpoint | Marks | False | Judged false |
|---|---|---|---|---|
| s15 | Kit | 2 | 0 | |
| s21 | Silt | 10 | 8 | majority holding, bought patrons' sight, the Collegium's history, the tender, Corvin's pact, the Chat name, Pennywhistle's sale, the hush's limit: all things Kit learned while Silt watched through her eyes |
| s25 | Kit | 6 | 0 | |
| s34 | Brannoc | 12 | 7, plus 1 at the wrong time | the bought patrons' sight (he was at Ysolde's), the tender, the Chat name (he asked), Pennywhistle's sale and the hush (he was at Wending), the names law (he planned the Naming), Maud's surety (he read the ledger beside Kit); and his Saltcombe belief "no longer believes", though he holds it as the scene opens |

For the main viewpoint the rule now works: 8 of 8 true across s15 and s25, against about half false in Round 4's late scenes and 11 of 12 in Round 3's. For the secondary viewpoints it is wrong most of the time, from causes section 3 sets out.

Unlike Round 4, the writer acted on the marks:

- **In the outline.** Before s25, `fact:small-gods-starve` was marked "Kit Tallow doesn't know yet", because `kit-knows-names` pointed at it from `names-ledger` on (L325 CALL#27). That was a real bible error: Kit has lived with fading gods for eight years, and what she learns in the Counting House is that a true name restores them. The writer rewrote the fact, added `fact:names-restore`, and moved the knowledge record to it (L333 CALL#28). This is the first mark in the mission that found an error.
- **Before s21 and s34.** It added 9 knowledge records for Silt (scene-2 L44 CALL#4 to L57 CALL#6) and 7 for Brannoc (scene-4 L82 CALL#6), each `--since` the event where he or she plainly learned it. Then it re-ran `reader-order --before … | grep` to confirm that only the true marks were left, and logged three entries about it (section 5).
- **In the prose.** The true marks are honoured: Kit doesn't know Ysolde's bargain, and Brannoc doesn't know Lampwick until the bell. The last is the engine of s34, and it was in the outline anyway.

**Trace polish: not exercised.** The whole round printed one inline trace, in the outline (L267 CALL#16, `set-count bought corvin-visit 160`): `saltcombe-clerks` ("a hundred") and `weir-stunt` ("two hundred"). Both are noise, since those numbers count other things ("more than a hundred lesser patrons", "nearly two hundred newcomers"), and the writer rightly ignored them. The scene phases printed none, although they rewrote two events and three facts. I ran `trace fact:foreclosed-god` after the scene-3 rewrite on a copy. Its 20 suspects are all linked or word-sharing records, and none of them is stale. The one stale text I found was a derived number: inserting `gallery` 409 at the bell left `s35-after`'s "three hundred and forty-seven farewells" (410 − 63) stale. The writer fixed it by hand, to 346 (scene-4 L82 CALL#6).

**Spans of months and year ranges as ranges: yes.** The fix showed in the scene output:

- `span foreclosure closing-bell`: "3.5 to 3.6 years (an event placed by its month or year may be any part of it)" (scene-4 L72 CALL#4), used as "Three years and a half" (s34:37).
- reader-order gives "1.2 to 1.3 years before" for the tender (September 1186) and "8.3 to 8.4 years before" for Maud's surety (August 1179).
- `--precision` text is quoted, as fixed: `at year 884, noted "three centuries before the story"`.

Day ranges under four weeks are still measured start to start (section 3). And day counts between whole-day events are often one day wrong, a defect older than this round (section 3).

**`--add`/`--remove` on every scene list: yes.** The scene phases used `set-scene-actors --add` 3 times, `-pressures --add` once and `-events --add` twice, and the outline used `--add` on actors and pressures as well. Nothing was retyped, and there was no refusal of the kind Round 4 had.

**Skill: show the events a scene retells: half followed.** In each scene the writer showed the depicted event and the one the scene opens from:

- s21: `window-closed`
- s25: `upriver`
- s34: `lampnight`

It showed no other event the prose retells:

- s21 tells the Sump nights (`ninth-night`).
- s25 tells the loan, the foreclosure, the last vision, the fen and Saltcombe.
- s34 tells the bell-tower fall, the vision and the fen. It ran `span` for the bell tower only.

I checked each retelling against the model, and they agree:

- fifteen on the Wendmoor fen and Osric's shield
- the carts in the yard on the last night at Wendmoor
- the rhyme on the fourth night, as `fact:penny-first-laugh` holds
- Saltcombe's withheld tithes

The session wrote all those records itself, so memory was enough. One sentence in s34 is open to doubt (section 4).

**Skill: check the numbers the scene opens on: yes in effect.** The opening numbers are all right (above). Post-draft checks ran in 3 of 4 scenes (Round 4: 2 of 4) and caught two real errors (section 4).

**Skill: knowledge for public accounts: yes for Kit.** `kit-believes-swarm` holds the Collegium's history of Hollin from the start until `testament-found`, and Ilse believes it until Lampnight. The Order's penance is held by Brannoc and Osric. The marks on these were true.

**set-count's kept note (worldcrafter-mugi): not exercised, for the third round running.** Every re-set in a scene phase passed a new `--note` (`dark-gallery` twice in scene 2, `after-bell` in scene 4), so no old note was kept. The nearby miss is the derived number above, which no note held.

## 3. Misunderstandings (SKILL/DOCS) and tool stupidity (TOOL)

**Every refusal and error, from the replay's output:**

1. scene-2 L44 CALL#4: `error: event none does not exist`, on `add-knowledge silt-k-pennyline silt believes event:penny-line --until none`. Then `error: knowledge silt-k-pennyline does not exist` from the `remove-knowledge` on the next line. `none` clears a scene list (`plants none`), but `--until` doesn't take it. The writer was trying to say that Silt knows a line was spoken without knowing who spoke it. It then recorded `knows event:penny-line --since penny-line` (L51 CALL#5) and logged the gap. The refusal was correct and clear.
2. **One kept contradiction, fixed at once.** At outline L203 CALL#6, `Cause problem (kept; see contradictions): "Hollin writes her testament" happens before "Hollin the Many-Eyed is bought out", which is recorded as its cause`. The writer's own `before` constraint fought the cause it had just added, and it changed the constraint to `during` (L207 CALL#7). Every later `contradictions` printed "No contradictions".
3. **Notes, all acted on:**
   - 4 "Dropped from … plants" notes, from deliberate `plants none` clears (outline CALL#20 to #22).
   - One "now both implies and withholds" note (scene-4 L75 CALL#5). The writer removed the `implies` in the next call.

That is 2 refusals in 1,098 calls, both from one line (Round 4: 2 in 1,402). There were no non-CLI errors.

**Tool stupidity (TOOL):**

- **Day counts between whole-day events are often off by one.** `span` and the "N days before" in `reader-order` count midnights with `Math.floor(msOf(at) / MS_PER_DAY)` (`calendar.ts:423`). Positions are stored as fractions of a year, so a midnight can come back a hair early or late and floor to the wrong day.
  - In scene 1 the writer got `span penny-sells wending-fair` (30 October to 1 November) "1 day", `span weir-stunt corvin-visit` (14 to 16 October) "1 day" and `span orrin-bridge wending-fair` (24 October to 1 November) "7 days". Yet `span grey-names wardens-ambush` (3 to 5 October) gave "2 days" (scene-1 L29 CALL#4, L35 CALL#5).
  - Before s15, 16 of the 19 day counts in `reader-order` are one short. Before s25, 7 of 30 are one long, and before s34, 9 of 44.
  - The writer noticed and logged it: "I can't tell which figure to trust for a stated time". It guessed wrongly that causes narrow the range, and wrote Gristle's line "yesterday. the day before" vaguely enough to be true either way (s15:95).
  - No wrong day count reached the prose. "a week" (8 days) and "a month" (30) are loose either way, and "thirty-one" and "twelve days" in s25 are right.
  - The defect is older than this round. `describeBetween` is unchanged since Round 2. On each round's final model, with that round's own tool, the pre-scene day counts are off by one in 17 of 144 (Round 2), 47 of 186 (Round 3), 0 of 193 (Round 4) and 39 of 119 (Round 5). No earlier reading caught it, and I haven't re-checked earlier prose against it.

  Confidence: high on the mechanism and the tallies. Cost: the writer's trust, and one hedged line.
- **The new presence rule is cancelled by its own exception.** In `shownFrom` (`learning.ts:371`), an actor present in another viewpoint's scene holds what it reveals, unless the scene's viewpoint has a knowledge record of it (`!theirs(s)`, "not the viewpoint's own secrets"). But the writer records Kit's knowledge of almost everything she learns, including what she learns in company. So whatever Kit learns with Brannoc or Silt beside her is treated as her secret.
  - **Removal test.** On the snapshot before scene 4, removing `kit-knows-surety` alone removes the `event:surety` mark for Brannoc (12 marks become 11). Brannoc was present in `s27-surety`.
  - **Code test.** A copy of `story.js` without the exception cuts the s34 marks from 12 to 7, removing 5 false ones: the bought patrons' sight, the Chat name, the hush, the names law and the surety. Before s21 it removes 2 of Silt's 8 false marks.
  - **What the exception protects.** It guards against a bystander learning a whispered secret, and that case was already covered. In s25 Brannoc is present while Lampwick confesses, and his own `brannoc-knows-lampwick --since closing-bell` kept him marked, as the writer meant (model-gaps "A secret told inside a scene someone else is in"). Own records already decide before presence is consulted.

  Confidence: high. Cost: 16 hand-made records and three model-gaps entries. There was no prose cost.
- **Two further causes leave false marks after that fix.**
  - *Group presence.* Silt sees through Kit's eyes, and `chat`, her group, is listed in `s04` and `s05`, but presence doesn't pass from a group to its members. With that, the history of Hollin, majority holding and the bought patrons' sight would be right for Silt. Her knowledge of the tender and of Corvin's pact needs shared senses, which is the premise of this book.
  - *A revealed knowledge record doesn't reveal its object to those present.* `s15` reveals `knowledge:kit-knows-penny`, not `event:penny-sells`, so Brannoc and Silt, both present, stay marked as not knowing Pennywhistle sold.

  Confidence: high.
- **Marks are taken at the scene's latest event, not as it opens.** Before s34, `version:brannoc-saltcombe` is marked "Sir Brannoc Hale no longer believes". His belief ends `--until closing-bell`, the scene's own event, and he holds it as the scene opens: s25:15 has him say "He answered. At Saltcombe." Round 4's fix moved counts to "as the scene opens" but not the marks. Possibly linked to one sentence in s34 (section 4). Confidence: high on the behaviour, low on the effect.
- **A scene whose depicted events are unplaced drops the time anchor, and its marks then ignore `--since` and `--until`.** `dark-gallery` has only a `during` constraint, so the header before s21 has no "at …" and no day counts. On a copy, I added `silt knows event:tender --since closing-bell` (seven weeks later), and the s21 mark on the tender disappeared. For a placed scene, `s22-dawn`, the same record gives "Silt doesn't know yet". The writer's added records all started before s21, so nothing was hidden this round. Confidence: high. No cost.
- **Day ranges under four weeks are still start to start.**
  - Before s25, `upriver` "at 10 November to 1 December 1187, 10 days before", though s25 (20 November) happens during it.
  - `span the-count lampnight` gives "10 days (start to start)" for a 12-to-20 December range.

  Low.
- **Scene numbers and ids drift apart.** After `move-scene s09b-reave 10`, `reader-order` says "revealed in 13" for `s12-ninth`. The writer logged it ("Scene positions vs ids"). Low.

**Misunderstandings (SKILL/DOCS):**

- **`--until none`** (refusal 1). The writer guessed from `plants none` and was corrected. Low; no action.
- **The post-draft number check was skipped in s21.** `wc` and `contradictions` ran, but no `span` or `show count:`. Its times ("the day before", "eight years", "a hundred years") are right against the model. Low.
- **Retold events were shown only when adjacent** (section 2). Low.
- **Raw JSON grep in scene 1** (section 1). The writer wanted a word search with dates; `mentions` was never tried. Low.
- **A reader question removed rather than left open.** `kiss` ("What happened while the Window was closed?") was added with `--opens` and no answer (outline L307 CALL#24), then removed in the next call. The story keeps it open on purpose ("You'll never know", s22's summary). Whether the writer thought an unanswered reader question was an error isn't visible. Low.
- **`gaps`: answered usefully, and not cleared to empty for the first time.** It listed 13 prompts: 10 drive-unopposed, 1 drive-without-origin, 1 drive-without-scene and 1 event-unreferenced (L313 CALL#25). The writer added the Harbour Fire as the origin of Ilse's drive, a real piece of history her notes already implied, along with 4 relations, 3 pressures and 6 deliberate marks with reasons. It left 2 prompts standing. The final report doesn't mention gaps.

## 4. The scene phase

**Consulting the model before writing:**

| Phase | Before drafting | After drafting |
|---|---|---|
| scene-1 (L2, L19) | `show scene`, `reader-order --before` (whole), `show event:wending-fair`, `show actor:pennywhistle \| head -30`, two raw greps | 6 `span` calls, `show count:bought` and `:gallery` through `grep` (L29, L35) |
| scene-2 (L2, L29) | `show scene`, `reader-order --before` (whole), `show event:dark-gallery`, `show event:window-closed`, `show actor:silt \| head -12`, a grep of s15 for Silt's lines | `wc`, then the re-set counts and `contradictions` (L44); `reader-order \| grep "silt doesn't"` (L51) |
| scene-3 (L2, L48) | `show scene`, `reader-order --before` (whole), `show event:lampwick-confesses`, `show actor:lampwick`, a grep of all scenes for "request\|pinned\|Lampwick", `show fact:foreclosed-god`, `show event:upriver` | 2 `span` calls (L62), `contradictions` (L73) |
| scene-4 (L2, L53) | `show scene`, `reader-order --before` (whole), `show event:closing-bell`, `show event:lampnight`, `show candidate:bell-entry/books`, a grep for "Chandlers" | 3 `span` calls (L72), `contradictions` and `show count:gallery \| tail -3` (L75); `reader-order \| grep` (L82) |

`reader-order --before` was read whole before all four scenes, as in Round 4. The greps of earlier scenes follow the skill's line about reused lines. s25's grep for "pinned" found s15's "No request was pinned to the tithes", and s25 builds its private channel on it.

**Post-draft checks caught two real errors, one of them in meaning:**

- **s25 (scene-3 L62 CALL#4).** The draft had "She had watched him do it forty-nine nights now". 49 is the days since the cistern (`reader-order`: "49 days before"), but Kit has watched Brannoc's nightly office only since the barge left. After `span barge-departs lampwick-confesses` gave 31 days, the writer changed it to "every night since the barge left Lanthorn, thirty-one of them". That is a number checked for what it counts, as Round 3's fix asked.
- **s34 (scene-4 L72 CALL#4, L75 CALL#5).** Lampwick leaves the gallery at the sixth stroke, so the entry and the payment are of 409, not 410. The writer changed two sentences, set `gallery` 409 at the bell, ended Lampwick's membership there, and carried the change on to s35's farewells (347 to 346).
- **s15 (scene-1 L29 CALL#4).** The checks confirmed 489, 196 and "forty-nine short", and exposed the day-count defect (section 3).

**Linking and updating: thorough in every scene, and structural.** Each scene phase:

- set actors, events and links with `--add`
- added the facts the prose invented, 10 in all:
  - in s15, the lurkers' tithes for unperformed joy, the hush's limit and Pennywhistle's first laugh
  - in s21, the ford lamps, the Sump plays and the grey names' clerk-voice
  - in s25, the tithe note, the Walker's Hour and the sleeping face
  - in s34, Iver's chapter
- added back-story events (`river-walled`, `penny-line`, `lampwick-dims`), versions (Lampwick's account, Brannoc's Saltcombe belief, the Exchequer's impersonation and Iver's reply) and knowledge
- rewrote the depicted events and the scene summary

It also fixed the outline where the prose showed it wrong:

- **s25.** The outline had Lampwick confess "alone", but every word Kit hears reaches two hundred bought patrons. The writer invented the one-way tithe note as the private channel and rewrote `fact:foreclosed-god` and `saltcombe-clerks`: Lampwick's power lit the shield through Kit's spell, a gift a creditor can't trace. That keeps s34's "never once lit by itself… Not white, as at Saltcombe" consistent.
- **s34.** The answer to "why does Corvin's entry matter" became specific: the receipts count only when entered, so the false position is 206 of 410.
- **s15.** The 63 who stay at the end became mostly the lurkers who tithed at Wending, and `s36` was updated to match.
- **s21.** Silt now recognises Lampwick in the dark, from the ford lamps' colour (`silt-suspects` moved to `dark-gallery`). The rhyme line spoken from among the grey becomes a plant paid off in s31.

**Continuity errors between the prose and the model, and between scenes:**

1. **Brannoc's view of Saltcombe at the bell** (low; low confidence that it is an error). `s34-bell.md:71`, in Brannoc's eyes: the lantern "which had never once lit by itself, lit by itself. Not white, as at Saltcombe". As the scene opens he believes his god lit it at Saltcombe (`brannoc-believes-answered` until the bell; `s25-lampwick.md:15` and `:115`), and the story so far for s34 says "Lampwick's tithe lit Brannoc's shield" (for s25 it adds "for the first time in three years"). By the fifth stroke he has understood that his god was hiding with Kit, so the line can be read as his new understanding. Nothing in the scene shows him reaching the Saltcombe part. The mark printed before the scene, "no longer believes", took his belief as already gone (section 3).
2. **"four hundred and eighty-nine others"** (trivial). `s21-dark.md:13` has Silt in a dark with "four hundred and eighty-nine others", but the 489 include her. It's a count read slightly off for what it counts, the class Round 3's skill line addresses, and too small to matter.
3. **Bible only** (trivial). "He had heard it once in his life" (`s34-bell.md:33`) fits the prose and the stories so far, but `object:lamp-shield`'s notes ("When Iver answered, the lantern lit by itself") imply earlier answers.

**Clean against the model:**

- **Counts:** 489, 196 and forty-nine short in s15; 489 then 402 in s21; 402 and 200 in s25; 203 to 205 receipts, 206 on paper, 410 then 409, in s34.
- **Spans:**
  - "a month" since the cistern and "a week" of rest after Orrin
  - Ysolde's "dozen words since the crow"
  - "the scriptorium the day before" (7 to 8 November)
  - "twelve days out of Saltcombe" and "thirty-one" nights since the barge
  - "Three years and a half" since the foreclosure, and the fall "at the Midsummer fair the year before"
  - "four hours" of the Naming (20:00 to midnight)
- **Ages and years:** fourteen in the Sump and eight years since; Brannoc fifteen on the fen; Thimble named "in her first year", seven years silent; Pennywhistle a Warden "for six years"; Silt a hundred years under the Sinks (1078 to 1179).
- **Who knows what:**
  - Silt didn't know Pennywhistle had sold (s15), as `s07-penny` set up.
  - Silt keeps Lampwick's name to herself (s21), and Kit already suspects it before the confession (s25).
  - Brannoc learns at the bell, and learns that Kit knew (`brannoc-knows-kit-knew`).
  - Chat never learns about the kiss.
- **Reused lines, all deliberate and placed right:** the Walker's Hour line and "a god is where the light is kept"; the Penny rhyme; Hollin's "Do not shut your eyes" (s21, as its story so far gives it); the three bailiffs and the goose (s21, s25); "the night the carts were in the yard" (s25, s34); "Night, Chat".
- **Typesetting** of the scroll is the same in all four scenes (`*Name: text*`, Gristle in lower case), though no record holds it.

Compared with Round 4 (one object's state on a retold night, in two judged scenes), Round 3 (a count of seats read as gods present, in two scenes, and a quoted line in the wrong scene), Round 2 (two count errors) and Round 1 (two count errors, a two-clock contradiction and a wrong day count), this round's prose has no confirmed continuity error. What is left is one sentence whose reading depends on what the viewpoint character has worked out.

## 5. What model-gaps.md says the writer wanted and couldn't hold

There are 18 entries: 9 from the outline and 2, 2, 2 and 3 from the four scenes (Round 4: 24; Round 3: 21). Grouped against the gaps decision worldcrafter-dgkx deferred:

- **Presence in a scene, and shared senses (recurs strongly; cost in the tool's output).** Four entries:
  - "A collective's knowledge"
  - "A patron who sees everything the viewpoint sees": "a rule like 'this actor perceives everything that actor perceives, from this event'… would cover all 489 patrons at once"
  - "A secret told inside a scene someone else is in"
  - "Records a viewpoint obviously knows": "Scene presence counts only for records nobody has knowledge of, and that heuristic flips the wrong way exactly for the main secrets"

  The last is an exact diagnosis of the exception in section 3. The cost is the false marks and 16 hand-made records, not the prose.
- **Two identities (fifth round in a row; central).** "One being, two actors (Lampwick and Saint Iver)". Both chosen turns, s25 and s34, are about it. The workaround held, with two actors, participations split by name and the identity held as an answered open question that knowledge points at. The prose keeps it straight. The one place it needed care was the bell, where Lampwick leaves Chat as Iver and the count drops to 409, all by hand. No story cost.
- **Defeated drives (fifth round).** "A want that is defeated": the Exchequer's `own-multitude` is left with no turn, "so it reads as still live". No story cost.
- **Recognitions.** Not logged under that name, but present twice: Silt knows Lampwick's light (held as a belief from `dark-gallery`), and Brannoc knows the false voice at the fifth stroke ("A voice that imitates another", held as a version told by the Exchequer). No cost.
- **Rules that decide events (recurs).** Four entries:
  - "A count that drains through an event": the bought patrons fall from 205 to 0 across the Naming, and the file says 205 until midnight.
  - "Time in the Counting House": two clocks.
  - "A one-way private channel as a world rule".
  - "A patron who leaves the gallery mid-event": the twelve strokes as one event.

  The majority threshold, the rule that decides the climax, is held by the count's threshold and is checked, and the climax's arithmetic is consistent (205 receipts left out plus 1 instructed sale is 206 of 410, one over half). No cost.
- **Object holders and state.** Not logged. The lamp-shield's history (dark since 1184, lit at Saltcombe, lit by itself at the bell) lives in event summaries, and the writer rewrote `saltcombe-clerks` to keep it straight. The possible s34 slip (section 4, error 1) is about this object's history crossed with a belief. Low.
- **How knowledge was gained (recurs strongly; five entries):**
  - "Knowing that something happened, not who did it"
  - "A secret told inside a scene someone else is in": "there's no 'does not know' record… This is most of what the scene is about"
  - "The kiss nobody saw": absence of knowledge
  - "A collective's knowledge"
  - "A voice that imitates another"

  Since the presence rule now infers knowledge from being there, this gap has moved from the bible into the tool's output: being in the room is not the same as hearing.
- **Quoted lines.** Not logged. The skill's grep line was followed in three scenes, and every reused line is right (section 4). The cheaper step held for the second round running.
- **The mugi kept-note case.** Not exercised for the third round (section 2). The writer always passed `--note` when re-setting a value. The one stale number this round was a difference of two count values in a summary (347), which no note or trace could have held, and the writer found it.
- **New this round:**
  - prose conventions as records: "How Chat appears on the page" and "A device's rules accrete in prose"
  - a bond relation for servitude, as opposed to membership: "A Throne as a 'group' actor"
  - scene ids that drift from positions
  - an agreed signal between two characters (banking the fire for yes), which echoes Round 4's promises and obligations
  - the day-count defect, logged as "`span` between whole-day events seems to vary"

Of the deferred gaps, none cost this round's prose. Presence and how knowledge was gained now cost the writer's time through the viewpoint marks. The rest had workarounds, as in Rounds 1 to 4.

## Ranked issues

Ranked by how much each likely cost the story or the writer's use of the tool. No item had a confirmed story cost this round; items 1 and 2 cost the writer's trust and time. Item 3 may have cost one sentence. The rest are bible-only or polish.

1. **Day counts off by one between whole-day events** (writer's trust and one hedged line; latent since Round 2; confidence high).
   - **TOOL:** in `describeBetween` (`app/src/story/calendar.ts:423`), round each moment to the whole minute before counting midnights, or count calendar dates; add a test with 30 October to 1 November 1187.
2. **False viewpoint marks for secondary viewpoints** (s21 8 of 10, s34 7 of 12; 16 hand-made records; confidence high).
   - **TOOL:** drop the `!theirs(s)` exception in `shownFrom` (`app/src/story/learning.ts:371`), since a bystander's own records already decide.
   - **TOOL:** count members of a group listed in a scene's actors as present.
   - **TOOL:** let a revealed knowledge record reveal what it knows to those present.
3. **Marks taken at the scene's latest event** ("no longer believes" for a belief the scene itself ends; possibly s34:71; confidence high on the behaviour, low on the effect).
   - **TOOL:** compute marks as the scene opens, as counts now are, and add "until event:X, in this scene".
4. **A scene with unplaced depicted events loses its anchor, and its marks ignore `--since` and `--until`** (no cost; confidence high).
   - **TOOL:** anchor on the depicted event's place in story order when it has no position.
5. **Private reveals and "does not know"** (bible only; the writer: "most of what the scene is about").
   - **Decision** after the mission: a reveal limited to named actors (an aside), or a "doesn't know" knowledge record.
6. **Retold back-story shown only when adjacent** (no cost found). **No action.** The skill line stands, and memory sufficed in a single session.
7. **Post-draft check skipped in one scene** (s21; no cost). **No action.**
8. **Polish (TOOL):**
   - day ranges under four weeks that contain the scene's moment say "N days before"; say "during it, from 10 November"
   - print the scene id beside its position in `reader-order`
   - `--until` could accept `none` as other list commands do, or say it doesn't
9. **Not exercised:** set-count's kept note (worldcrafter-mugi), for the third round. **No action;** it can be closed as not biting in five rounds.
10. **`gaps`** answered usefully and not cleared to empty. **No action.**

Story cost against polish: no item is a confirmed story cost. Item 3 is the only one tied to a sentence of judged prose, at low confidence. Items 1 and 2 cost the writer's trust and time, which matter more in a longer run. Items 4 to 10 are bible-only or polish.

## Verdict

The Round 4 fixes took:

- The counts section gave every opening number in the prose, and the writer did the scene's arithmetic from it.
- Viewpoint marks are now true for the main viewpoint (8 of 8). For the first time the writer acted on the marks: it found and fixed a bible error in the outline, and it cleared the false marks by hand before each secondary-viewpoint scene.
- Month and year spans are ranges, `--precision` text is quoted, and every scene list takes `--add` and `--remove`, with no retyping.
- Post-draft checks ran in 3 of 4 scenes and caught a number counting the wrong thing (49 nights for 31) and a count that changes inside the scene (410 to 409).
- The prose has no confirmed continuity error.

Meaningful tool issues remain, and they are narrow:

- a calculation defect in day counts, older than this round, which the writer noticed and stopped trusting
- the new presence rule cancelled by its own exception, which the writer diagnosed in its own words
- marks taken at the end of the scene rather than its start

Each fix is one line, or close to it. None cost the story this round. Since this is the last round, they become follow-up work (below), with no Round 6.

## Across Rounds 1 to 5: what the changes did

This mission is a demonstration, not a comparison. Each round had a fresh writer and a different story on the same premise, so a round-to-round change can't be credited to the tool alone. What the readings can show is whether a fix was used as intended and whether the class of error it targeted came back.

**How the writer worked**

| | Round 1 | Round 2 | Round 3 | Round 4 | Round 5 |
|---|---|---|---|---|---|
| CLI calls | about 1,110 | 1,065 | 1,134 | 1,402 | 1,098 |
| Warnings seen | none: the writer silenced the CLI after 73 trace blocks, 67 of them on first placements | all | all | all | all |
| Pre-scene read | `show` only; reader-order unusable at 71 KB | `reader-order --before`, cut by `tail` every time | read whole in 2 of 4 | whole in 4 of 4 | whole in 4 of 4, and once in the outline to check a scene before writing it |
| Numbers checked after drafting | none (no span or count existed) | 0 `span`, 0 `show count:` in scenes | all 4 scenes, catching 3 draft errors | 2 of 4 | 3 of 4, catching 2 errors, one in meaning |
| Traces | 73 blocks, 6 real, none seen | 8 blocks, 0 acted on | 8 blocks, 24 suspects, 0 real | 4 blocks, 1 real, acted on (the first) | 1 block, noise; no stale record missed |
| Viewpoint marks | none | none | 11 of 12 false late, never acted on | about half false late, read once | true for the main viewpoint; false ones cleared by hand; one found a bible error |
| `gaps` | 27 of 39 prompts drove ritual linking; "clean gaps" reported | cleared to empty, reported | cleared to empty, usefully | cleared to empty, usefully | answered usefully, 2 left, not reported |
| List edits | retyped whole lists, one silent drop | `--add` on links | | one refusal (no `--add` on pressures) | `--add`/`--remove` everywhere, no refusal |
| Dates | fractional years in output | dated output | invented dates to order events in one year | years as spans, no invented dates | month and year ranges as ranges |

The tool changes that changed behaviour, each with its evidence:

- **Counts** (after Round 1). Every round since has kept counts and checked threshold numbers against them. The count reads in the outline caught errors in Rounds 2, 4 and 5; this round it was an unplaced event that made 205 look like a majority.
- **`reader-order --before`, short labels, and the counts section** (after Rounds 1 to 4). It went from unusable, to cut, to half read, to read whole every time. In Round 5 it was the source of every number the scenes open on.
- **Trace precision** (after Rounds 1 to 3). It went from noise loud enough that the writer silenced everything, to quiet output that was trusted (Rounds 4 and 5).
- **`span`** (after Round 1). Times stated in the prose were checked from Round 3 on, and Round 5's check caught a number that counted the wrong thing. Its day counts carry a defect, latent since Round 2.
- **Viewpoint marks and memberships** (after Round 2, decision dgkx). Membership ended the two-clock errors of Round 1. Marks went from nearly all false (Round 3) to true for the main viewpoint (Round 5), and in Round 5 the writer used them.
- **Advisory gaps** (Round 0, then Round 1). They went from driving contrived links, to being answered with reasons and partly left open.

The skill changes that took:

- reading `reader-order` whole (Rounds 4 and 5)
- checking numbers after drafting, including what a number counts (Rounds 3 to 5)
- grepping earlier scenes before reusing a line (Rounds 4 and 5)
- not reporting gaps as a result

The one that half took is showing the events a scene retells (Round 5).

**The prose's continuity**

| Round | Errors in judged prose, from each reading |
|---|---|
| 1 | 4: two count errors (488 + 8 needing nine; 287 names after sales), a two-clock contradiction (Brindle sold two years before he vanishes) and a wrong day count (26 for 27) |
| 2 | 2 count errors in numbers the writer didn't check (the fifth bead as new; "nearly half" when over half), plus a rules conflict (low) |
| 3 | 1 meaning error in two scenes (hollow seats counted as gods present), and a quoted line moved to the wrong scene |
| 4 | 1 object-state slip on a retold night (the ribbon), in two scenes; numbers clean in value and meaning |
| 5 | none confirmed; one sentence open to doubt about what the viewpoint believes, and one trivial "others" |

Each class of error went away after the round whose fix targeted it, and none came back:

- arithmetic, after counts (Round 2 on, in numbers checked; Round 3 on, in all)
- two clocks, after memberships (Round 3 on)
- what a number counts, after the skill line (Round 4 on)
- a quoted line in the wrong scene, after the grep line (Round 4 on)

What is left in Round 5 sits in what characters believe and know, which is the deferred knowledge and presence gaps. The judges' scores aren't used here (see the round logs).

**Follow-up work** (to be recorded after the mission; no Round 6):

1. Fix the day-count defect, with a test (ranked item 1).
2. Fix the presence rule: drop the exception, add group presence, and let revealed knowledge reveal its object (item 2).
3. Take marks as the scene opens (item 3), and anchor unplaced scenes by story order (item 4).
4. **Decision:** how knowledge reaches people, covering private reveals, "does not know" and shared senses. It recurred in all five rounds, and since Round 5 it costs the writer's time through the marks.
5. **Decision:** the two-identity alias, central in every round from Round 2 and never a prose cost. Either add a minimal alias, or record that the workaround suffices.
6. Cheap model additions that recurred without cost:
   - a `defeated` drive turn (five rounds)
   - ordered sub-steps inside an event, or a count that ramps across one (Rounds 4 and 5)
   - a place for prose conventions (Round 5)
7. Polish: short day ranges, scene ids beside positions, `--until none`.
8. Close worldcrafter-mugi as not biting in three exercised rounds.

## Open items

- I didn't read the judges' outputs (`judging/`). Whether a judge noticed the s34 sentence isn't known here.
- The writer's thinking isn't visible. That the "forty-nine nights" draft came from the cistern's day count in `reader-order` is inferred from the number.
- The "true" and "false" judgements on the viewpoint marks are mine, from scene actors, participants and summaries. For Silt they assume the premise that Chat sees what Kit sees, which the writer also assumed. A different reading of "know" could move one or two marks, not the picture.
- I didn't check earlier rounds' prose against the day-count defect. Their readings found their spans clean, but those checks used the same function.
- The replays ran the round's built `tool/story.js`, not `app/src/`, so they reflect the tool as the writer had it. The source lines cited (`calendar.ts:423`, `learning.ts:371`) are on the current branch.
- That runners stop their sandboxes on a signal can't be seen in these transcripts. The round ran to completion with no failed attempt.
