# Round 3 reading: how the writer used Demiurge

This is an audit (agent-factory `audit`) of the writer's sessions for mission worldcrafter-gwx3, Round 3 (worldcrafter-lxmj). It reports findings with evidence and suggests fixes. It changes nothing in the repository or the round directory apart from this file.

## Sources and method

- **Transcripts.** I read `phases/{outline,scene-1..4}/transcript.jsonl` and extracted every tool call and result with a script. Citations look like `scene-3 L38 CALL#4`: L is the line in the JSONL file and CALL# is the tool-call index within that phase, counting Write calls. As in Rounds 1 and 2, the writer's thinking is not visible, so its intent comes only from its text, its commands and `model-gaps.md`.
- **Replay.** I re-ran every Bash and Write call from all five phases, in order, in a scratch repo, using the round's `tool/story.js`. The replayed `story.json`, all four scene files and `model-gaps.md` are byte-identical to `work/` and to each phase's `work/` snapshot. I did three replays:
  - a logging-shim run, to count every subcommand;
  - an exact run with the CLI called directly;
  - an unfiltered run, with every `| head`, `| tail`, `| sed -n`, `| grep` and `>/dev/null` on a CLI read removed.

  The shim moves the CLI one process down, so the batch key changes (`batchKey()` walks `process.ppid`), and some trace output differs from what the writer saw. The direct-call runs match the transcript exactly, so every trace quoted below comes from those.
- **Reads on copies.** I ran `reader-order --before` for each written scene on the model as it stood before that scene's phase, using the phase snapshots. On the final model I ran `show`, `scenes`, `contradictions`, `gaps` and `render`. In a throwaway file I tested how positions and constraints behave (section 3).
- **Other material.** I read the four scenes, `model-gaps.md`, the skill as built (`tool/story-sketch/SKILL.md`), `points.json`, `so-far/`, the git logs, Round 2's reading (`docs/rounds/round-2/reading.md`) and parts of Round 1's. I also read decision worldcrafter-dgkx, review findings worldcrafter-5b6m and worldcrafter-mugi, and the batch and trace code in `tool/story.js`.
- **Run shape.**

  | Phase | Time | Turns | Tool calls | Cost |
  |---|---|---|---|---|
  | Outline | 852 s | 38 | 37 | $3.12 |
  | Each scene | 124, 143, 132 and 129 s | 8, 8, 8 and 6 | 7, 7, 7 and 5 | |

  Round 2's outline took 878 s, 35 turns and $2.77, and its scenes took 121 to 136 s with 4 to 7 tool calls each. The scenes ran in the resumed outline session. They are beats 10, 25, 26 and 29 of 35 (`points.json`): `nobody-unmasked` (25) and `last-evening` (29) were chosen as turns, and `lists` (10) and `ember-tells` (26) were drawn at random.

## 1. How the writer used the tool

**Shape of use.** The writer made 1,134 CLI calls: 995 in the outline's 37 tool calls and 139 in the scene phases' 26 tool calls. Round 2 made 1,065. It used one pass-through helper, `S() { bun "$STORY_CLI" story.json "$@"; }`, with `L` for `set-scene-links`, and a `for` loop for 56 `add-cause` calls (outline L254 CALL#7). It built in layers and committed ten times (`phases/outline/git-log.txt`):

1. cast, facts, back-story and present-day events, causes, objects, participants, and **30 memberships** (outline L264 CALL#9)
2. drives and relations, then two counts (L273 CALL#12), with the expulsion split into two events (L280 CALL#13)
3. open questions with candidates, tried with `touches` (L290 CALL#16), then answered and rejected with reasons (L299 CALL#17)
4. versions and knowledge
5. 35 scenes, then links and a **viewpoint for every scene** (L334 to L356, CALL#23 to #27)
6. reader questions, then `gaps`, clearing the gaps (L359 to L372)
7. a full `reader-order`, used to add reveals for back-story no scene told (L378 to L387, CALL#31 to #33)
8. a late drive for Chat (`chat-kin`, L397 CALL#34)

Subcommand totals from the shim log, with scene-phase counts in brackets:

| Command | Count | Command | Count |
|---|---|---|---|
| set-participant | 159 (11) | span | 9 (6) |
| set-scene-links | 90 replace (15) + 16 `--add` (5) | answer-open-question / add-open-question | 9 / 9 |
| set-position | 71 (8) | list | 9 |
| add-event / add-cause | 65 (3) / 65 (4) | add-object / add-version | 8 / 7 |
| set-scene-actors / -events / -pressures | 39 (4) / 38 (3) / 38 | reader-order | 6 (4, all `--before`) |
| add-knowledge | 35 (9) | gaps / describe-event | 4 / 4 (4) |
| add-scene / set-scene-viewpoint | 35 / 35 | update-actor | 3 (3) |
| set-count | 34 (4) | add-count, touches, constrain, update-object | 2 each (constrain and update-object both in scenes) |
| show | 32 (28) | trace, scenes, update-membership, update-fact, remove-constraint | 1 each, all in scenes |
| add-fact / relate-drives | 31 (7) / 31 | init, `--help`, render, update-count, update-event, leave-for-reader | 1 each |
| add-membership / add-actor | 30 / 29 | | |
| add-drive / add-candidate / set-drive-origins | 28 / 24 / 23 | | |
| contradictions | 20 (7) | | |
| add-drive-turn / reject-candidate | 19 / 15 | | |
| update-scene | 12 (5) | | |
| add-reader-question / set-reader-question-scenes / mark-gap-deliberate | 11 / 11 / 11 | | |

**What it built** (final `story.json`). Round 2's figures are in brackets.

| Kind | Count | Notes |
|---|---|---|
| Actors | 29 (23) | 24 persons and 5 organizations: Chat, the Least, the Thrones, the Exchange and the Drowned Choir. The masks Benefice and Nobody-in-Particular are separate actors. |
| Facts | 31 (42) | All with `--about`. None were added to clear `gaps`. |
| Events | 65 (61) | All placed, from about 700 to 1 July 1131, most to the day or the minute. 1 constraint, 64 causes, 158 participants. |
| Drives | 28 (22) | 31 relations and 19 turns: 9 satisfied, 4 replaced, 2 flipped and 4 renounced. |
| Counts | 2 (3) | `seats` has 23 values against a quorum of 100. `benefice-seats` (`--of seats`, more-than-half threshold) has 8 values. |
| Memberships | 30 (new) | Chat's members with since/until (Gnash leaves at the ring job and rejoins at the flood; Saltlick leaves at the tide-wraith; Ember leaves at the ruling), plus Exchange staff and the Thrones. |
| Viewpoints | 35 (new) | 33 scenes are Merrit's and 2 are Ilse's. |
| Versions | 7 (11) | Agathe's and the Undertow's accounts of the bargain, Ember's, Merrit's staged-ambush lie, Quayle's, Benefice's, and Chat's suspicion of Gnash. |
| Knowledge | 35 (27) | 26 knows and 9 believes. All 35 have `--since` and 4 have `--until`. |
| Objects | 8 (11) | Form XIV-c, the hearthstone, Quell's chalk, the seat-ledger, the physician's note, the bell of St Ide's, the Hound's collar and the eel. |
| Open questions | 9 (9) | 24 candidates, 15 rejected with reasons. All 9 are answered and 1 is also left for the reader. `touches` was used twice to try candidates. |
| Reader questions | 11 (9) | Each has an opening and an answering scene. |
| Scenes | 35 (34) | 185 actor entries, 40 depicts, 101 pressures, 111 reveals, 14 implies, 22 withholds, 15 plants and 20 pays-off. |
| Deliberate gaps | 11 (8) | Each with a reason. |

**How rich the world is: rich, on a par with Rounds 1 and 2, and tighter.**

- **Institutions and law:**
  - the Pact Exchange and its Charter, the Court of Seals and the Grey Room
  - Clause Fourteen, the commons clause, buried since 934, with form XIV-c printed once and filed
  - stewards and polls (more than half binds; seven days' notice for a poll on the warlock's person)
  - the quorum (100 seats from sunset to sunset), the occupied-soul rule, the fraud clause that voids every pact made under a fraudulent one, and standing to testify
- **Economy:**
  - boons spent from a patron's own essence, and surges of attention spent like money
  - seats sold for Undertow essence through a broker
  - an Exchange funded by fees the Thrones pay
  - Mother Sorrel's jobs
- **History:** the tidepool that ate its neighbours (about 700), the Consolidation (870 to 930), the Charter (931), Wyck's removal (934), St Ide's sinking (1009), and the first Foy bargain (1052).
- **Places:** Cantle, Tallowgate, Seal Street, Gutter Market, Quarrel Field, Lantern Quay, Gannet Reach, Sallowmarsh, the Brack and the Stews. As before, they are facts and event text, without complaint.

The scenes draw on this throughout: the chandler's flat, the grate that smokes, the iron flue-door, Amsel's casebook leaf, Termin's rules of the Lists, the weathervane who misunderstood the poll, and the cats called Biscuit.

**What it ignored or barely used:**

- `trace` ran once, cut to `| head -20` (scene-2 L34 CALL#3).
- `mentions`, `move-scene`, `unanswer-open-question`, `update-open-question`, `update-reader-question` and `--conflict` were never used.
- `render` ran once, sectioned (outline L299 CALL#17).
- The only `remove-*` was `remove-constraint`, in scene-3.

## 2. Did the Round 2 fixes take?

**Checking numbers and stated times after drafting: yes, in all four scenes, and it caught real draft errors.** Round 2 ran 0 `span` and 0 `show count:` in its scene phases. This round:

| Phase | After drafting | What it caught |
|---|---|---|
| scene-1 (L26 CALL#4) | `span tide-wraith spring-lists`: 8 days | Confirmed "eight days ago". Seats 332 to 610 and Benefice 1 to 12 came from the counts section of `reader-order --before`. |
| scene-2 (L51 CALL#5) | three `span` calls | The draft's "eight weeks ago" (51 days) became "seven weeks", and Nobody's two "careful"s, "two months apart", became "a week apart" (13 and 20 April). These two edits sit in the same call as the spans, before them, so the figures probably came from `reader-order --before`, which prints "N days before" for every event. |
| scene-3 (L29 CALL#3) | `span birth sallowmarsh-razed`: 11.8 years | The prose's "when you were twelve" was wrong against a razing in "1118", so the writer moved the razing to June 1118 (L38 CALL#4). |
| scene-4 (L27 CALL#3) | `show count:seats \| grep` | The count had 1,400 seats from the first morning of the ten-day walk, against the scene's "you'd just passed a thousand" on 12 June. The writer split the walk with point events at 1,003 and 1,400 (L38 CALL#4). It also fixed "the morning he struck Benefice" to noon, and removed a weekday the story has no calendar for. |

Every count the prose states matches the model's count, and every day and month span checks out (section 4). That fixes Round 2's two count errors. One number is right as a seat count but wrong as a count of who is present (section 4, error 1). The check can't catch that, because it compares the figure with the wrong quantity.

**`reader-order --before`, read whole: in 2 of 4 scenes, then cut again.**

| Phase | How it was read |
|---|---|
| scene-1 (L2 CALL#1) | Whole (53 lines) |
| scene-2 (L2 CALL#1) | Whole (109 lines) |
| scene-3 (L2 CALL#1) | `\| sed -n '/Held back/,$p'`, which hid 106 of 117 lines |
| scene-4 (L2 CALL#1) | The same filter, which hid 124 of 133 lines |

Round 2 cut it with `tail` all three times it was run. In scenes 3 and 4 the writer therefore never saw the told list or the viewpoint marks. The section it did read is itself wrong in places (section 3). The new counts section was used every time: the writer quoted 610 and 12, 400 to 399, 399, and 1,400.

**Traces: seen and read, still almost all noise, none acted on.** The writer filtered no edit's output, apart from a `>/dev/null` on a `set-participant` loop that printed nothing. So it saw all 8 inline trace blocks, with 24 suspects:

| Where | Edit | Suspects | Real? |
|---|---|---|---|
| outline L280 CALL#13 | `set-position vote-day` | `ring-job`, `fact:stewards`, `fact:quorum` ("choru, termin, expel") | Noise |
| outline L280 CALL#13 | `set-count benefice-seats vote-day 0` (was 172) | `count:seats` note "172", the `vote-day` summary "a hundred and seventy-two", Termin's notes "two hundred" | None stale. The 172 is the pre-expulsion figure, still true. The number-in-words match works. |
| scene-2 L34 CALL#3 | `set-position agathe-bound 1103` (was 1081) | `drowned-chapel` ("a week old", "Midsummer"), `claim-fails`, `agathe-door` ("five, twenty, stair") | Noise. The real dependent, Agathe's notes, was rewritten in the same batch. |
| scene-3 L38 CALL#4 | `set-position sallowmarsh-razed 1118-06` | `ember-tells.md:45` ("'three years later' matches the 3 years between Sallowmarsh is razed and Quell is born"), `ember-tells.md:85` ("when you were twelve"), `scene:hearth` | :85 is the line the change was made for, now true. :45 is a coincidence of durations. |
| scene-3 L50 CALL#6 | `set-position agathe-bound`, then `agathe-vow` | `agathe-vow`, `drowned-chapel`, `claim-fails`; `ember-tells.md:35`, `scene:ember-tells`, `agathe-bound` | Noise |
| scene-4 L38 CALL#4 | `set-count seats recruitment none` and the new values | `last-evening.md:3, :5, :55` ("fourteen hundred") | Noise. 1,400 still holds at the scene's event. |
| scene-4 L38 CALL#4 | `describe-event ember-eve` | `fact:swear-essence` (added in the same batch), `scene:court`, `last-evening.md:17` | Noise |

Precision improved where it was aimed:

- count traces fired only when a value changed (the re-set in each Round 2 scene phase would print nothing now)
- numbers in words were matched
- the depicted scene's record was left out of its own batch (scene-4's `last-evening` record)

Three sources of noise remain:

- **Word stems.** Matches on "choru, termin, five, twenty, stair" are still most of the suspects.
- **The scene's own prose.** The batch rule leaves out only the scene's *record*: `staleTextLines` filters `target.kind === "record"` (`tool/story.js` around line 8091). So the prose just drafted is listed in all four scene-phase blocks.
- **Duration coincidences.** A duration in prose is matched against any pair of events that touches the changed one.

0 of 24 suspects were stale, and 0 led to a fix (Round 2: 8 blocks, 0 acted on).

Did the traces miss anything? I found one stale record. Inserting 399 at `agathe-caught` (scene-2 L59 CALL#6) made the `poll-morning` note "Seventy have left in fear of the poll since it was called" off by one, since 399 less 330 is 69. No trace fired, because `countWas` traces only a value that already existed at that event. The cost is trivial and confined to the bible.

**Viewpoint: set everywhere; its marks were mostly wrong and were never acted on.** All 35 scenes got a viewpoint in the outline. `reader-order --before` marked "Merrit Foy doesn't know" on:

- 1 record before `lists`
- 12 before `nobody-unmasked`
- 12 before `ember-tells`
- 12 before `last-evening`

For `last-evening` I judge about 11 of 12 false, and for `nobody-unmasked` 7 of 12 false (detail in section 3). The writer saw only the first two lists. It never mentioned a mark, and no edit followed one. Viewpoint did not help this round.

**Membership: used thoroughly, consistent, and quietly useful.**

- 30 memberships with since/until (outline L264 CALL#9) and one update in the scenes: `update-membership m-nobody-chat --until agathe-caught` (scene-2 L59).
- The prose agrees with them throughout:
  - Saltlick is gone after the tide-wraith.
  - "Gnash's old seat had been sold weeks ago" (`nobody-unmasked.md:69`; he left at the ring job, 9 May).
  - Ember is a steward until the ruling.
- `show actor:ember` (scene-3 L2) showed her membership.

Round 1's two-clock membership error did not recur. There is no evidence that membership caught anything the writer would otherwise have got wrong. The writer logged two limits:

- a membership lives on the mask actor, not the person
- a membership can't pass from one actor to another

**The "both implies and withholds" note: took.** It fired once (outline L351 CALL#26, `binding-poll`), and the writer fixed it in the next call (L356 CALL#27).

**`gaps`: still cleared to empty, but more usefully, and not reported as a result.**

- The first run (L359 CALL#28) listed 22 prompts: 10 drive-without-origin, 9 drive-unopposed, 2 drive-without-scene and 1 event-unreferenced.
- They were cleared across CALL#29, #30 and #37 (`No gaps found`, L409) with:
  - 11 `mark-gap-deliberate` calls, each with a reason
  - 6 relations
  - 1 cause
  - 4 real origins, two of them new back-story events (`quayle-refused`, `fields-built-over`) that CALL#33 then gave to scenes to reveal
- The final report doesn't cite a clean `gaps` (outline L411), so the skill's "not a result to report" took.

## 3. Misunderstandings (SKILL/DOCS) and tool stupidity (TOOL)

**Every refusal and error, from the replay's stderr:**

1. scene-3 L38 CALL#4: `error: <start>: "1103-03 02:00" is not a time: write a year (1954 or 1954.8) or a date (...)`. The writer gave a month with a time but no day. The refusal was correct. The batch went on: `constrain vow-before-bound agathe-vow before agathe-bound` succeeded against an event that now had no position.
2. scene-3 L38 CALL#4: `error: event fever already causes birth-bargain`. A redundant `add-cause`, harmless.
3. **Kept contradictions** (not refusals):
   - outline L274 CALL#12: Benefice's count above its total, and falling though it "only rises". The writer split the event and removed the direction (L280 CALL#13), and logged both.
   - scene-3 L44 CALL#5: the two-events-in-one-year clash below.

That is 2 refusals in 1,134 calls, both the writer's own sequencing (Round 2: 2 in about 1,065). There were no non-CLI errors.

**Tool stupidity (TOOL):**

- **Viewpoint marks ignore what the viewpoint character did, said, found or was shown.** A record is marked when someone holds knowledge of it and the viewpoint character holds none. So the marks fire on:
  - events Merrit took part in: `staged-danger` (she staged it), `ring-job` and `heist` (participant "protagonist")
  - the version she told (`v-staged`, `--by merrit`)
  - the object found in an event she was in (`seat-ledger`, participant "found" at `heist`)
  - the fact she felt (`benefice-cold`, her own fingers in `lists`)
  - things revealed in scenes told through her eyes: `v-undertow-bargain` (scene 4), `agathe-vow` and `birth-bargain` (scene 26), `allies-clash/benefice-buys` (scene 27)
  - `event:fever` after she knows the candidate answer about it

  It also says "no longer knows" for a version she only *believed* (`v-agathe-bargain`). The true marks were the scene's own reveal (`who-nobody/agathe`, "doesn't know yet" before scene 25) and one belief she gave up. Evidence: `reader-order --before` on the phase snapshots, and the participants, versions and knowledge in `work/story.json`. Confidence: high. The cost was no story error, but the feature built for dramatic irony gave the writer nothing usable, and the writer stopped reading that part (next item).
- **`reader-order --before` keeps revealed answers as "held back", and shows each record only at its first telling.** This is the section scenes 3 and 4 actually read. Before `last-evening`:
  - "Held back and not told yet" lists `open-question:who-benefice`, `who-nobody` and `ember-first`, though `show open-question:who-nobody` says "revealed in scene:nobody-unmasked" and `who-benefice` "revealed in scene:seal-street".
  - The told list gives `candidate:who-nobody/agathe` as "implied in 16", `who-benefice/undertow-broker` as "planted in 10" and `ember-first/birth-hearth` as "implied in 25", without the later reveals (`scenes candidate:who-nobody/agathe` lists the reveal in 25).

  Confidence: high. The cost was low this round, because the writer had written those scenes itself in the same session.
- **A year is a point, not the span the skill says it is.** The skill says `set-position` takes "a year (`1954`) or a date … each the span it names". In a throwaway file:
  - two events at `1103` with `constrain a before b` give a contradiction, and `span a b` says "they start at the same time"
  - the same at `1103-04` with `--gap 1d`, or at `1103-04-13`, is accepted
  - `span birth sallowmarsh-razed` measured a year to 1 January ("11.8 years")

  To make the writer's meaning ("the vow, the night before the binding, sometime in 1103") hold, it had to invent 13 and 14 April 1103 (scene-3 L50 CALL#6). It had already moved the razing to an invented "June 1118" so that "twelve" holds. This took three calls, one refusal and one kept contradiction, and it is logged in `model-gaps.md`: "Ordering two events inside a year". `--precision` text didn't help. Confidence: high.
- **Trace noise** (section 2): word stems, the scene's own just-drafted prose, records created in the same batch, and duration coincidences. Confidence: high.
- **A count at a ranged event takes effect at the range's start.** 1,400 at "8 to 18 June" read as 1,400 on the first morning. The writer found it only through its post-draft `show count:` and split the event (scene-4 L38). Confidence: high. Low cost, since it was caught.
- **Small output noise:**
  - Adding a constraint reprints an existing contradiction as a new "Timeline problem (kept)" (two identical lines at scene-3 L44).
  - `show count:benefice-seats` and the counts section still print "0 of 118, 60 short of more than half" after the expulsion, and a "below the threshold at:" line repeating 7 of 8 values.
  - The `--precision` free text prints as if it placed the event ("year 1103, the night before the binding").

**Misunderstandings (SKILL/DOCS):**

- **"Read it whole" was dropped after two scenes.** In scenes 3 and 4 the writer jumped to "Held back" (above). I can't see why. The told list was 106 and 124 lines, mostly unchanged from the scene before, and its viewpoint marks were mostly false. The skill gives the rule but nothing that keeps it in a resumed session.
- **Checking a number against the wrong quantity.** The skill says to check each number with `show count:`. The writer did, against `seats`, and it matched. But the prose was counting gods *present* (section 4, error 1). The skill doesn't say that the number has to be the same quantity as the count.
- **A `sed` slip.** In scene-4 L2, `show scene:walking | sed -n 3p` (and for `expulsion` and `court`) printed the telling-order line, not the summary (scene-2 had used `3,4p`). So the writer wrote `last-evening` without re-reading the summaries of scenes 27, 28 and 30. I found no continuity error from it.
- **Layered links: 7, in 4 scenes, all defensible setups.** `wyck` reveals and plants three rules that pay off at court. The others are `seal-street`'s note, `ember-tells`'s `speak-through` and `last-evening`'s winters. Round 2 had 4 such links. Low.
- **One quiet drop.** `nobody-unmasked reveals` lost `event:nobody-joins` (scene-2 L60 "Dropped from…"). It was harmless, because scene 4 reveals it.

**Duration-unit wording (worldcrafter-5b6m): exercised once, read correctly.** `constrain vow-gap … --gap 1d` printed "constraint vow-gap puts 24 hours give or take 12 hours between agathe-vow and agathe-bound, but their positions put 0 hours between them" (scene-3 L44 CALL#5). `show event:agathe-vow` printed "gap 1 day ± 12 hours" in the same output. This is the case the finding predicted, with the unit dropped one step. The writer read it correctly ("The year-only dates were clashing with the one-day gap", L49). No misreading, so no action is needed. Saying "1 day give or take 12 hours" would be polish.

**set-count's kept note (worldcrafter-mugi): not exercised.** Only two value re-sets happened:

- `benefice-seats vote-day` went from 172 to 0 with a new `--note` (outline L280).
- `seats recruitment` was cleared with `none` (scene-4 L38).

No kept note ever stated an old value. No action.

## 4. The scene phase

**Consulting the model before writing:**

| Phase | Before drafting | After drafting |
|---|---|---|
| scene-1 (L2, L15) | `show scene:lists`, `reader-order --before lists` (whole), `show event:spring-lists`, `actor:corwin`, `object:hound-collar`, `scenes actor:benefice`, `fact:boons` | `span` (L26) |
| scene-2 (L2, L6, L34) | `show scene`, `reader-order --before` (whole), `show event:agathe-reveals`, `event:agathe-caught`, `actor:agathe`, and summaries of six earlier scenes. It also fixed Agathe's age before writing: she was 50 at the birth, so it moved her binding from 1081 to 1103 and ran `trace` | three `span` calls (L51) |
| scene-3 (L2) | `show scene`, `reader-order --before \| sed` from "Held back", `show event:ember-remembers`, `fever`, `birth-bargain`, `actor:ember`, `fact:undertow-pattern` | two `span` calls (L29) |
| scene-4 (L2) | `show scene`, `reader-order --before \| sed`, `show event:ember-eve`, three summaries attempted (got telling order instead) | `show count:seats` (L27) |

**Linking and updating: thorough in every scene, as in Round 2.** Each scene phase:

- set actors (adding the Chat voices who speak), depicts, and all five link kinds
- added facts the prose invented, such as `lists-rules`, `benefice-cold`, `throne-mark`, `sallowmarsh`, `speak-through`, `swear-essence` and `sallowmarsh-winters`
- added knowledge (9 records), e.g. Agathe knows she is Nobody, Chat know from the unmasking, and who knows of Ember's poll
- rewrote the depicted events and the scene summary
- linked forward: `seal-street` pays off the cold clue, `court` pays off `speak-through`, `hearth` pays off the winters, and `walking` withholds Ember's poll

It also fixed outline errors the prose exposed: Agathe's age, the razing date, the fever night's details, and the ten-day count.

**Continuity errors between the prose and the model, and between scenes:**

1. **Hollow seats counted as gods present** (medium-high confidence; it costs two judged scenes):
   - On 2 June, Benefice holds 190 of 399 seats. Its note says "Benefice watches from none of them". The `release-scene`, `ring` and `binding-poll` summaries call those seats hollow. The counts section the writer read before both scenes printed "190 of 400".
   - The prose counts every seat as a watching god:
     - `nobody-unmasked.md:7` "four hundred small gods behind her eyes, every one of them looking at the same eleven words"
     - `nobody-unmasked.md:27`, `:69` and `:127` ("the four hundred", "out of four hundred voices")
     - `ember-tells.md:15` "All three hundred and ninety-nine were there. Merrit could feel them crowded behind her eyes"
     - `ember-tells.md:71` "three hundred and ninety-nine small gods understanding the same thing"
     - `ember-tells.md:111`
   - By the model, about 209 were there.
   - The stories so far for scenes 2 and 3 tell the reader that seats were sold to Benefice and went hollow (`so-far/2.md`, `so-far/3.md`).
   - The scene itself treats a cut seat as not counting ("We are three hundred and ninety-nine"), which makes counting 190 unwatched seats as present look more like an error.
2. **A quoted line moved to the wrong scene** (low; medium confidence). `ember-tells.md:71`: "And the very next day, at the wake, warm and witty and generous, Benefice. *Let me hold the reins. Just this once.*" In `lists.md` that line is spoken at the Lists, a week after the wake. It can be read as a montage, but the sentence ties it to the wake. Nothing in the model holds who said what where (the quoted-lines gap).
3. **A belief record lags the prose** (low; bible only). `k-agathe-suspects-benefice` has Agathe believing the full answer, including "swallow the whole chorus", from `benefice-arrives`. In the prose she says "I didn't understand until it posted that poll that it wants all of them" (`nobody-unmasked.md:99`). Not updated.
4. **Trivial:**
   - "the same eleven words" (`nobody-unmasked.md:7`): the note has twelve or thirteen, depending on "cradle-rail".
   - The `poll-morning` note's 70 is now 69 (section 2).
   - `walking-ends` is "the tenth day" on 18 June of an 8-to-18 June walk.

**Clean against the model:**

- **Seat counts:** 332 before the Lists and 610 after, 278 new seats, Benefice 1 to 12, 400 to 399, and 1,400 with 1,397 + 2 + 1.
- **Spans:**
  - 8 days since the wraith, and seven weeks
  - a week between the two "careful"s, three weeks since the plea, ten days of Ember's silence, two months since the crossroads, "the night before last" for the break-in
  - seven days old on the fever night, three years from the binding to the birth, twelve at the razing
  - the poll posted on the 12th with seven days' notice
- **Ages:** Agathe 25 at her binding, 28 at the birth and 53 now; seven years a clerk.
- **Who knows what:**
  - Merrit learns Nobody is Agathe at 25 and the fraud at 26, as the knowledge records say.
  - Agathe can't hear Chat after the thread is cut.
  - Merrit doesn't know of Ember's poll until 19 June (`k-merrit-poll`); Termin has known since the 12th.
  - Gnash, Saltlick and Ember match their memberships.

Compared with Round 2 (two count errors in unchecked numbers) and Round 1 (two count errors, a two-clock contradiction and a wrong day count), the arithmetic is now clean. The remaining error is about what a number means, not its value.

## 5. What model-gaps.md says the writer wanted and couldn't hold

There are 21 entries: 10 from the outline and 2, 3, 3 and 3 from the four scenes (Round 2: 28). Grouped against the gaps deferred by decision worldcrafter-dgkx:

- **Two identities (Round 2 new: recurs, central).** "Masks and handles: one actor wearing another's name" and "The mask comes off". Two of the plot's three big reveals are masks: Benefice is the Undertow, and Nobody is Agathe.
  - `show actor:agathe` lists no seat in Chat.
  - Her membership lives on `nobody`.
  - The viewpoint marks can't connect them.

  This is the second round in a row whose plot turns on an alias (Round 2: Mothlight is Hesper). No story cost was seen.
- **Quoted lines (recurs; first story cost).**
  - Logged twice: "Speaking through someone else" and "Speaking through Merrit, again", on whose voice dialogue is in.
  - Unlogged but used: Nobody's "Careful", threaded through three scenes by participant roles ("says Careful again").
  - The misplaced "Let me hold the reins" (section 4, error 2) is the first small cost in prose. By dgkx's own criterion (recurred in both earlier rounds, and has cost the story at least once), quoted lines now qualify, weakly.
- **Presence in a scene (recurs).** "An audience inside the story": who of Chat is watching, who looked away (the bath), and who couldn't see (the Grey Room). Nobody's absence during Agathe's plea is a clue held only in a summary.
- **Recognition (recurs).** "Knowing but not remembering" (Ember), "Seen but not let herself know" (Agathe's frost), and "A clue by taste".
- **How knowledge was gained (recurs).**
  - "A clue by taste": knowledge has no "because of".
  - "A secret kept by a steward for a week": concealment as a relation.
  - "Secrets told to a hearth": knowledge of an open class of things.
- **Rules that decide events (recurs, strongly).**
  - "Polls: votes with tallies and outcomes": "Nothing ties a poll's threshold to the seat count at that time, which is the rule that makes Benefice dangerous".
  - "A threshold that is a floor": the quorum's sunset-to-sunset rule.
  - "A poll's tally, abstentions, and a vote cast on purpose to lose".
- **Object holders and state (mild).**
  - "Seats as things that change hands": a membership passing to another actor.
  - The hearthstone's crack and its scratched letters, held in notes.
- **Defeated drives (recurs silently).** All 4 `renounced` turns are defeats:
  - `quayle-throne`: "Stripped of office"
  - `undertow-chorus`: "shrinks back down the Brack"
  - `undertow-foy`: "Voided back to 1052"
  - `wyck-commons`: "Removed"

  None is logged. Round 2 had 5 of 7.
- **Counts:**
  - "Two values of a count at one moment"
  - "Direction of a count that rises and then is wiped out"
  - "A count that climbs within one scene"
  - "A count over a ten-day event" (TOOL behaviour, section 3)
- **Time:** "Ordering two events inside a year known only as a year" (TOOL, section 3).
- **Other:**
  - "A death that is also a birth": Ember and Kindle, a successor relation.
  - "A clue for one answer to an open question": it worked through `plants candidate:…`.

Of the deferred gaps, only quoted lines had a visible cost, and it was small. The rest had workarounds, as in Rounds 1 and 2.

## Ranked issues

Ranked by how much each likely cost the story or the writer's use of the tool. Items 1 and 2 cost this round's prose; the rest cost the bible, the writer's time or trust in the output, or are polish.

1. **Numbers checked against the count, not against what they count** (story cost). Six sentences in `nobody-unmasked` and `ember-tells` count 400 or 399 gods present while the model has 190 of those seats hollow (section 4, error 1). Confidence medium-high.
   - **SKILL:** "Check that a number in the prose counts the same thing as the count you check it against: when it counts who is there or acting, subtract what isn't (with `--of`, the rest is the total less it), or keep a count of that quantity."
2. **A quoted line moved to the wrong scene** (small story cost). `ember-tells.md:71` puts the Lists line at the wake. This is the deferred quoted-lines gap, now meeting dgkx's criterion weakly. Confidence medium.
   - **Decision for the orchestrator:** whether this one slip justifies a minimal quoted-line record (who said it, in which scene). Otherwise, **SKILL:** "before reusing a line from an earlier scene, `grep` the scene files for it".
3. **Viewpoint marks are mostly false.** About 11 of 12 before `last-evening` and 7 of 12 before `nobody-unmasked` are false; 0 were acted on, and the section was read only twice (sections 2 and 3). Confidence high. No prose cost, but the round's new feature gave no usable signal.
   - **TOOL:** treat the viewpoint character as knowing:
     - an event they take part in, and the objects in it
     - a version they tell
     - what a scene told through their eyes reveals, from that scene's latest event

     Say "no longer believes" for a belief.
4. **`reader-order --before` lists revealed answers as "held back" and shows only the first telling**, and scenes 3 and 4 read only that section. Confidence high on the bug, medium on why the writer cut it. Cost low this round.
   - **TOOL:** show each record at its strongest or latest telling ("planted in 10, revealed in 24"), and drop from "Held back" a question whose chosen candidate a scene has revealed.
   - **SKILL:** keep "read it whole", and add that this applies in every scene, including the next one in the same session.
5. **A year is treated as a point.** Ordering two events within one year is a contradiction, and the writer had to invent 13 and 14 April 1103 and June 1118. Confidence high. Bible cost: invented specifics, plus three calls and a kept contradiction.
   - **TOOL:** treat a year position as its span, as months and days already are, and make `span` give a range for year-precision ends ("11.2 to 12.2 years").
6. **Trace suspects are still noise.** 24 of 24 were not stale, and 0 were acted on. Confidence high. No story cost yet, but in a longer run it teaches the writer to skip the traces.
   - **TOOL:**
     - apply the batch exclusion to the writing scene's prose file, not only its record
     - leave out records created in the same batch
     - match a prose duration only against spans that include the changed event
     - raise the bar for word-share-only suspects, perhaps to two uncommon stems
7. **A count value at a ranged event takes effect at its start.** Found by the writer's own check and worked around with point events. Confidence high; low cost.
   - **TOOL:** in `show count:` and the counts section, print a ranged event's value as "from 8 June"; or allow `set-count … --at-end`.
8. **`gaps` is still cleared to empty** (22 prompts), though usefully this time. Confidence medium; low cost.
   - **No action.**
9. **Polish (TOOL):**
   - don't reprint an existing contradiction as new
   - drop "short of" for a count at 0 and the redundant "below the threshold at:" line
   - say duration mismatches in the gap's own unit ("1 day give or take 12 hours"; worldcrafter-5b6m, exercised once and read correctly)
10. **Not exercised:** set-count's kept note (worldcrafter-mugi). **No action**, but keep the check.

## Verdict

The Round 2 fixes mostly took:

- After drafting, the writer checked numbers and times in every scene, with 6 `span` calls and 1 `show count:` (Round 2: 0), and caught three real draft errors and an outline error.
- The counts in `reader-order --before` were used before every scene.
- Count traces fire only on a change, and numbers in words are matched.
- The implies-and-withholds note was acted on.
- Memberships were used thoroughly, with no clock errors.
- "Read `reader-order --before` whole" held for two scenes, then lapsed.

Meaningful tool and skill issues remain:

- One skill gap (item 1) produced this round's main continuity error, in two judged scenes. The writer checked the number but not what it counted.
- The round's new viewpoint output (item 3) is mostly wrong.
- The one section the writer kept reading in scenes 3 and 4 misreports what has been revealed (item 4).
- Year precision (item 5) forced invented dates.
- Trace precision (item 6) still yields no real suspects.

So the round does **not** show "no meaningful tool or skill issues", and by the strategy's rule the mission should not stop early. A small fix increment of items 1, 3, 4, 5 and 6, with the polish in 9, is proportionate. Item 2 is a decision for the orchestrator under dgkx. The arithmetic of counts and spans no longer costs the story; what is left is whether a number means what the prose says it means, plus tool output that is wrong rather than merely noisy.

## Open items

- I didn't read the judges' outputs (`judging/`), which are out of scope. I read the stories so far only to check what readers of scenes 2 and 3 were told about hollow seats.
- The writer's thinking isn't visible. Why it cut `reader-order --before` in scenes 3 and 4, and where the scene-2 week figures came from, are inferred from the surrounding calls.
- The judgements "false" and "true" on the viewpoint marks are mine, from participants, tellers, and what Merrit-viewpoint scenes reveal. A different reading of "know" could move one or two marks, not the overall result.
- The replays ran the round's built `tool/story.js`, not `app/scripts/story.ts`, so they reflect the tool as the writer had it.
- Point choice: beats 25 and 26 are adjacent again (one chosen, one random), and nothing from beats 30 to 35 was judged. Finding worldcrafter-fja2 raised the same pattern for Round 2, so the orchestrator may want to weigh it for Round 4.
