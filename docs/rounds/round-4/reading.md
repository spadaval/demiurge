# Round 4 reading: how the writer used Demiurge

This is an audit (agent-factory `audit`) of the writer's sessions for mission worldcrafter-gwx3, Round 4 (worldcrafter-lsu3). It reports findings with evidence and suggests fixes. It changes nothing in the repository or the round directory apart from this file.

## Sources and method

- **Transcripts.** I read `phases/{outline,scene-1..4}/transcript.jsonl` and extracted every tool call and result with a script. Citations look like `scene-3 L66 CALL#5`: L is the line in the JSONL file and CALL# is the tool-call index within that phase, counting Write calls. As in Rounds 1 to 3, the writer's thinking is not visible, so its intent comes only from its text, its commands and `model-gaps.md`.
- **Replay.** I re-ran every Bash and Write call from all five phases, in order, in a bubblewrap sandbox laid out like the writer's: `/story`, the round's `tool/` at `/opt/story-tool`, and the CLI called directly, so batch keys match. The replayed `story.json`, `model-gaps.md` and all four scene files are byte-identical to every phase's `work/` snapshot and to `work/`. I did three runs:
  - an exact run, whose output matches the transcript (every trace quoted below comes from it);
  - a counting run, with a `bun` wrapper that logs its arguments and then `exec`s the real bun, so the process chain and batch keys don't change (its output also matches);
  - an unfiltered run, with every `| head`, `| tail`, `| sed -n`, `| grep`, `>/dev/null` and `2>/dev/null` on a CLI call removed. It breaks the writer's `$(S show … | sed …)` summary edits, so I used it only to compare what reads showed. In the scene phases the filters hid nothing but other records' fields: no warning, trace or refusal.
- **Reads on copies.** On the phase snapshots and the final model I ran `show`, `span`, `trace`, `contradictions` and `gaps`. I tested what drives the viewpoint marks by removing a knowledge record on a copy (section 3).
- **Other material.** I read the four scenes, `model-gaps.md`, the skill as built (`tool/story-sketch/SKILL.md`, identical to `.agents/skills/story-sketch/SKILL.md`), `points.json`, `scene-order.json`, the phase git logs, Round 3's reading (`docs/rounds/round-3/reading.md`), decisions worldcrafter-jeue and worldcrafter-dgkx with notes, and the batch, trace and viewpoint code in `tool/story.js`.
- **The failed attempt** (`round-4-failed-1/`, outline only) isn't used. Round 4's repository starts with `init` at 10:43 (`phases/outline/git-log.txt`), and the replay from an empty repository reproduces `work/` exactly, so nothing carried over from it.
- **Run shape.** The four scenes ran in the resumed outline session, so the cost figures are cumulative; the per-phase deltas are given here.

  | Phase | Time | Turns | Tool calls | Cost |
  |---|---|---|---|---|
  | Outline | 1,149 s | 40 | 39 | $4.03 |
  | Scenes 1 to 4 | 136, 136, 165 and 151 s | 9, 6, 7 and 8 | 8, 5, 6 and 7 | $0.67, $0.62, $0.78 and $0.83 |

  Round 3's outline took 852 s, 38 turns and $3.12. The scenes are beats 11, 24, 33 and 36 of 37 (`points.json`). `s24-i-did-this` (a reveal) and `s33-tidying` (a cost paid, inside 30..37) were chosen as turns, 9 beats apart. `s11-thread` and `s36-queen-of-lamps` were drawn at random. No two points are adjacent this round.

## 1. How the writer used the tool

**Shape of use.** The writer made 1,402 CLI calls: 1,233 in the outline's 39 tool calls and 169 in the scene phases' 25. Round 3 made 1,134 and Round 2 about 1,065. It used one-letter pass-through helpers (`S`, plus `E` for add-event with set-position, `D`, `O`, `Q`/`C`, `SC`, `A`/`Ev`/`Pr`/`L`) and `for` loops for causes and memberships. It built in layers and committed eight times (`phases/outline/git-log.txt`):

1. 32 actors (outline L311 CALL#3), then the whole timeline with positions (L325 to L327, CALL#4 and #5)
2. causes, one constraint, memberships, 10 objects, the world's facts and participants (CALL#6 to #11)
3. three counts with 30 values, then `show` of each (L403 CALL#12)
4. drives, origins, relations and turns (CALL#14 to #16), then the secret identities as facts, versions and knowledge (CALL#17)
5. open questions with candidates, tried with `touches` (L439 CALL#19), answered and rejected with reasons (L449 CALL#20)
6. 37 scenes, each with a viewpoint (L499 CALL#23), then actors, events, pressures and links (CALL#24 to #26)
7. `contradictions` and `gaps` (L523 CALL#27), and clearing the gaps (CALL#29 to #31)
8. two `span` checks that fixed a number in two summaries (L561 CALL#32, L566 CALL#33), the model gaps log (CALL#34), a full `reader-order` used to give unrevealed back-story to scenes (CALL#35 to #37), and a late night-watch event (CALL#38)

Subcommand totals from the counting run, with scene-phase counts in brackets:

| Command | Count | Command | Count |
|---|---|---|---|
| set-participant | 260 (17) | add-membership | 17 (2) |
| set-scene-links | 95 replace (18) + 14 `--add` (4) + 2 `--remove` | add-version | 13 (2) |
| add-cause | 92 (8) | describe-event | 12 (7) |
| add-event / set-position | 80 (5) / 80 (5) | add-object / add-open-question / answer-open-question / add-reader-question | 11 each (1 add-open-question) |
| add-knowledge | 56 (11) | set-reader-question-scenes | 12 (1) |
| add-fact | 53 (19) | update-scene | 10 (6) |
| set-scene-pressures | 47 (4) | span | 9 (6) |
| show | 41 (28) | remove-participant / mark-gap-deliberate | 8 (3) / 8 |
| set-scene-actors / -events | 41 (4) / 41 (3) | contradictions | 5 (3) |
| add-scene / set-scene-viewpoint | 37 / 37 | reader-order | 4 `--before` (all in scenes) + 3 full |
| add-candidate | 36 (3) | gaps / add-count / update-membership / update-knowledge | 3 each (1 update-knowledge) |
| add-drive / set-drive-origins | 35 / 35 | remove-knowledge / touches | 2 (1) / 2 |
| add-actor / relate-drives | 34 (2) / 34 | init, `--help`, constrain, update-fact, remove-drive-turn, unrelate-drives, list, leave-for-reader | 1 each (leave-for-reader in scene-4) |
| add-drive-turn / set-count | 31 / 30 (0 in scenes) | | |
| reject-candidate | 22 | | |

**What it built** (final `story.json`). Round 3's figures are in brackets.

| Kind | Count | Notes |
|---|---|---|
| Actors | 34 (29) | 28 persons and 6 organizations: Chat, the Pactwardens, the Synod, the Concord of Boxholders, the Lidless and the Kettle Street Players. The masks Greyhand and Nine Bells are separate actors from Vessary and the Abbess. |
| Facts | 53 (31) | 48 with `--about`. 19 were added in the scene phases, from what the prose invented. |
| Events | 80 (65) | All placed: 11 by year only, 6 by month, 5 by day and the rest to the minute, from year 1 (the Tidying) to April 202. 1 constraint, 92 causes, 251 participants. |
| Drives | 35 (28) | 33 relations and 30 turns: 17 satisfied, 5 replaced, 3 flipped and 5 renounced. |
| Counts | 3 (2) | `pact` (12 values), `share` (Greyhand's share in hundredths, total 100, more-than-half threshold, 12 values) and `hollowed` (6 values). |
| Memberships | 17 (30) | Chat's members with since/until (Thimble out at `thimble-fades`, Sluice out at `chat-decides` and back at `canal-refilled`, Greyhand in from `greyhand-joins` to `greyhand-expelled`), and Casimir out of the Wardens at `breakout` and back at `crane-halts`. |
| Viewpoints | 37 (35) | 26 Tilly, 10 Casimir and 1 Crane. |
| Versions | 13 (7) | The Synod's accounts of the Tidying and of Marrowgate, Chat's and Rook's counter-accounts, Tilly's "alone" and "promise" jokes, Greyhand's false self-account, Casimir's lie and a suspicion nobody tells. |
| Knowledge | 54 (35) | 39 knows and 15 believes; 49 with `--since` and 13 with `--until`. |
| Objects | 11 (8) | The ribbon, the ledger leaf, the thimble, the queen of lamps, the nine-bell watch, Dov's gloves, the hood, the Oculus, the lantern, the needle and the Reliquary jars. |
| Open questions | 11 (9) | 36 candidates, 21 rejected with reasons. 10 answered. `abbess-words` (scene 4) is left for the reader, with three candidates and no answer. |
| Reader questions | 11 (11) | |
| Scenes | 37 (35) | 167 actor entries, 47 depicts, 102 pressures, 118 reveals, 17 implies, 10 withholds, 26 plants and 55 pays-off. |
| Deliberate gaps | 8 (11) | Each with a reason. |

**How rich the world is: rich, at least on a par with Rounds 1 to 3.**

- **Institutions and law:**
  - the Synod, the Concord of Boxholders and the Tidying law (only pacts with a Boxholder may be registered)
  - the Pactwardens and their charter, which lets the Warden-Provost halt an unlicensed rite
  - the conditions for a Final Tidying (decree, assent, shown cause)
  - the old law of shares on the ledger leaf, and the rule that a sleeping window is ridden by the greatest share among the eyes left open
- **Economy:**
  - spirits live on sight
  - boons thrown like coins into a busker's hat, and Greyhand's gold
  - archpatrons in velvet boxes against small gods in the cheap seats
  - the Reliquary of skimmed sight
- **History:** the Tidying (year 1), the drained Sixth Canal, the melted Saint Aldo bell, the shrines dumped in the Sump, Marrowgate (158) and Rook's buried testimony.
- **Places:** Kettle Street, the Lowmarket arches, the Sump, Marrowgate Square, Draper Row, Lowwater ferry stairs, Lamp Row, the Weir Docks, Cobb's Bridge, Saint Lenn's and the Oculus. As before, they are held in facts and event text, and this time the writer logged that as a gap.

The scenes draw on this throughout: the lamp Crane burns in daylight, Vessen stage-silk and Merrin of Draper Row, the eleven counted theaters and the uncounted twelfth, Hob's "It is the tenth", the roll-call, the Lidless's healed lids, and Sluice's loose third step.

**What it ignored or barely used:**

- `render` never ran (Round 3: once).
- `trace` never ran on its own; only inline blocks were read.
- `mentions`, `move-scene`, `unanswer-open-question`, `update-open-question`, `update-reader-question`, `update-actor`, `update-count` and `--conflict` were never used.
- No count was set in a scene phase, although scene 3 runs a count up and down inside one event (section 5).

## 2. Did the Round 3 fixes take?

**`reader-order --before`, read whole: yes, in all four scenes.**

| Phase | How it was read |
|---|---|
| scene-1 (L3 CALL#1) | Whole (73 lines), followed by `show scene` and `show event` in the same call |
| scene-2 (L2 CALL#1) | Whole (about 113 lines) |
| scene-3 (L2 CALL#1) | Whole (about 150 lines) |
| scene-4 (L2 CALL#1) | Whole (about 168 lines) |

Round 3 read it whole in 2 of 4 scenes and Round 2 cut it with `tail` every time. The new output took too:

- each record now lists every telling ("planted in 1, revealed in 13", "planted in 9, implied in 18, revealed and paid off in 26")
- "Held back and not told yet" lists only records still withheld (3 before scenes 1 and 2, none before 3 and 4), with no revealed answers in it
- ranged events count "from" their start ("540, since event:fame-surge at 26 to 28 August 201, from 26 August 201")

**Viewpoint marks: true for the viewpoint character's own scenes and acts, still often false later; read once, used in prose where true.**

| Before | Marks | False | Judged false |
|---|---|---|---|
| s11 (Casimir) | 7 | 1 | `hollow-wick` ("doesn't know"): he saw the boy in the ward |
| s24 (Tilly) | 11 | about 4 | the Synod's accounts of the Tidying and of Marrowgate, the Wardens' theory of the hollowings, the Final Tidying's conditions |
| s33 (Tilly) | 10 | about 5 | the same four, and `crane-ribbon` after she has been told of the thread (s24) |
| s36 (Tilly) | 9 | about 6 | the same five, and `cannot-see-face`, the line her own mouth spoke in s34 |

That is better than Round 3 (11 of 12 false before its last scene). The participation, telling and own-viewpoint rules removed the class Round 3 found. The false marks that remain have new causes (section 3).

The writer read and judged the marks before scene 1: it logged `hollow-wick` as noise (scene-1 L54 CALL#8, "Knowing that something happened vs. knowing what happened"). After that it never mentioned a mark. The true marks are honoured in the prose:

- Tilly doesn't know Nine Bells is the Abbess (s24:71 "The bells-one didn't speak, and never had"; s33:109 the bells "had thrown nothing… turned toward the great doors").
- Casimir doesn't know the hollower is Tilly in s11.

Nothing shows the marks caused either of those, since both were in the outline.

**Years without invented dates: yes.**

- 11 events are placed by year only, 4 of them in year 1, ordered by causes with no constraint and no contradiction.
- `span` gave ranges, and the writer quoted one correctly: `span tidying marrowgate` "156.8 to 157.8 years (a year without a date may be any part of it)" (scene-1 L34 CALL#4), used as "a hundred and fifty years" (s11:47).
- `--end` year ranges hold (`pip-imagined` 186 to 190).
- No date was invented to make an order hold. Round 3 invented 13 and 14 April 1103 and June 1118.

Two leftovers: month positions and year ranges are still measured start to start with exact day counts (section 3).

**Traces: fewer, one real, and acted on.** The writer filtered no edit's output in the scene phases, apart from one `2>/dev/null` on a `set-participant` that printed nothing (scene-1 L40 CALL#6). So it saw all 4 inline blocks:

| Where | Edit | Suspect | Real? |
|---|---|---|---|
| outline L537 CALL#29 | `update-knowledge cas-suspects-ribbon` (from `knows event:hollow-wick` to `believes version:cas-suspicion`) | `hollow-wick` (21 shared stems), `s03-kettle`, `hollow-gorrie` | Noise. The first is the knowledge's old target, matched against its own summary. |
| scene-3 L66 CALL#5 | `describe-event chat-decides` | `event:rite` | Noise. `rite` was rewritten earlier in the same command line. |
| scene-3 L66 CALL#5 | `describe-event reliquary-breaks` | `scene:s35-city-sees` ("fail, stolen") | Plausible, not stale. The summary "the Reliquary's seals fail and stolen sight runs home" still holds. |
| scene-3 L66 CALL#5 | `describe-event hollow-brisk` | `event:sixth-drained` ("buri, step") | **Real.** The old record said the washing-steps were buried, while the new Brisk washes at the one stair still showing. The writer rewrote `sixth-drained` in the next call (L72 CALL#6). |

Round 3 had 8 blocks with 24 suspects, 0 real and 0 acted on; Round 2 had 8 blocks and 0 acted on. This is the first trace the writer acted on in this mission. The writer's own verdict is "The trace after each `describe-event` helped. Finding the *third* record… depended on shared words ('buri', 'step'), which only worked by luck" (`model-gaps.md`). The batch exclusions work. Run outside the batch, the `aftermath` and `wick-wakes` rewrites in scene 4 list only `s36-queen-of-lamps` inline, which is the scene being written, so nothing printed in the batch. I found no stale record or paragraph that a trace missed, apart from one bible slip that predates the scenes (section 4, error 3).

**Numbers checked for meaning as well as value: no meaning error this round. Value checks after drafting ran in 2 of 4 scenes.**

| Phase | After drafting | What it caught |
|---|---|---|
| scene-1 (L34 CALL#4) | 4 `span` calls | "three in a fortnight", "five days", "four nights ago", about 157 years. Before them, the draft's "the night before the boy" became "the night the boy was taken". |
| scene-2 (L51 CALL#4, L56 CALL#5) | `wc` and `contradictions` only | Nothing ran. The report still says "Numbers and times checked: 402 − 261 = 141". 402 appears nowhere in this phase's output, so it came from memory of the outline's `show count:pact` (L403 CALL#12). |
| scene-3 (L55 CALL#4, L66 CALL#5) | `sed` edits and `contradictions` only | The draft started Hob's tally at "Twenty-nine", the `fame-surge` value. The writer changed it to "Thirty-one", the value from `dov-told`, with no CLI call in between. |
| scene-4 (L45 CALL#4) | 2 `span` calls | They confirmed "a month" and "six weeks", which the `sed` in the same call had just set. |

Every count and span in the final prose matches the model (section 4). The meaning check took in the sense that no number counts the wrong thing; the few loose ones are characters' rhetoric (section 4). The procedure didn't take. In the two scenes whose own events change a count, the writer ran no `show count:`. The opening values it needed (402 in s24; 1,408 and 31 in s33) are not what the counts section of `reader-order --before` prints. That section gives each count at the scene's *latest* event: 261, 1,407 and 50 (section 3).

**Reusing a line: the new skill line was followed.**

- scene-3 L40 CALL#2: `grep -n "Hob\|Gnash\|Bellwether" scenes/s24-i-did-this.md`
- scene-4 L31 CALL#2: `grep -n "queen" scenes/*.md`

The reused lines are deliberate echoes, placed right:

- Pip's "kept" from the s24 roll-call returns in s33:93.
- "until her shoulder was against his, and he let it stay there" (s24:87) returns as "Tilly put her shoulder against his. He let it stay." (s36:109).
- Bellwether's AGAIN runs through all three scenes: said softly in s24:97, withheld in s33:89 ("He didn't say AGAIN") and s36:9.

No line was moved to the wrong scene, so Round 3's error 2 didn't recur.

**set-count's kept note (worldcrafter-mugi): not exercised, for the second round running.** All 30 `set-count` calls were in the outline's L403 CALL#12, each at a new event, and none re-set a value. No kept note states an old value. No action, but keep the check.

## 3. Misunderstandings (SKILL/DOCS) and tool stupidity (TOOL)

**Every refusal and error, from the replay's output:**

1. outline L449 CALL#20: `error: unexpected argument "Its own lie; Hob remembers…" (put text with spaces in quotes)`. This was `reject-candidate who-greyhand glover "<reason>" 2>&1 | head -3` without `--reason`. The next line of the same call ran it correctly, so it looks like a deliberate probe of the syntax. The refusal was correct and clear.
2. outline L537 CALL#29: `error: unknown option --add`, on `set-scene-pressures s16-hood --add vessary-frame`. Unlike `set-scene-links`, the scene's other list commands have no `--add`. The writer retyped five whole lists in the next call (L543 CALL#30) and logged it ("Small mechanical frictions").
3. **No kept contradictions.** `contradictions` printed "No contradictions" all five times it ran.

That is 2 refusals in 1,402 calls, both in the outline (Round 3: 2 in 1,134). There were no non-CLI errors.

**Tool stupidity (TOOL):**

- **The counts section shows each count's value at the scene's end, not where the scene starts.** The header says the reader-order is taken "at event:chat-decides… (the latest event it shows)", and the counts are given there.
  - Before s24 it printed `pact` 261 "since event:i-did-this", which is the drop the scene depicts. The scene opens on "Four hundred and two of them" (s24:39).
  - Before s33 it printed `pact` 1,407 and `share` 50, both set by `chat-decides`, the scene's own climax. The scene opens on 1,408 and on Hob's "Thirty-one in the hundred".
  - `show event:rite` and `show event:chat-decides`, read in the same call (scene-3 L2), also print only the values those events set.

  So the one number the writer drafted wrong (29 for 31, scene-3 L55) had to be caught from memory. Every opening value came from the outline phase's output, many turns earlier in the resumed session. Confidence: high on the behaviour, medium that it caused the draft slip. Cost: none in the final prose, but a fresh session, or a longer one, would have nothing to fall back on.
- **Viewpoint marks are still often false, from causes the Round 3 fix didn't reach.**
  - *An account heard in a scene told through someone else's eyes.* In `chat-history` (s08, Casimir's viewpoint), "Casimir answers with the Synod's account and Marrowgate" to Tilly's face. Yet `version:synod-tidying` and `version:synod-marrowgate` are marked "Tilly doesn't know" from s24 to s36. Likewise the Wardens' theory, which Casimir states to Tilly in s07 and which underlies the charge Crane reads in s16, is marked "Tilly doesn't know" through s36.
  - *Common knowledge.* The Synod's accounts are taught "in the primer" (s11:45). Nobody records them for every citizen, so they are marked as unknown.
  - *Knowing that an event happened, apart from what really happened.* `hollow-wick` is marked "Casimir doesn't know" before s11, though his own viewpoint scene s04 implies it. The writer logged this as a model gap and blamed his belief in `version:cas-suspicion`. On a copy I removed that record and the mark stayed. The real cause is that the default counts what an own-viewpoint scene "shows or reveals", not what it implies, and s04 only implies `hollow-wick`.
  - *What the viewpoint character said or did in another's viewpoint scene.* Tilly speaks the Abbess's "twelve years I looked out through you and never once saw you" in s34 (Casimir's viewpoint). Before s36, `fact:cannot-see-face` is still marked "Tilly doesn't know".

  Evidence: the four `reader-order --before` outputs; `work/story.json` knowledge, versions and scene summaries; the removal test. Confidence: high on the mechanism, medium on the exact tally, since "knows" is my judgement. Cost: no prose cost. But in the last three scenes about half the marks are false. They persist from scene to scene, and the writer stopped commenting on them after s11.
- **Trace noise, smaller:**
  - A record rewritten earlier in the same command line is still listed: `rite` under `chat-decides`. Only records *added* earlier in the line are left out.
  - Changing a knowledge record's target lists the old target itself, matched against its own summary: `hollow-wick` under `cas-suspects-ribbon`, 21 stems.
  - The one real suspect was found by shared words, as the writer says.

  Confidence: high. No cost.
- **Months and year ranges are still points in `span` and reader-order.**
  - `span greyhand-joins i-did-this` gives "162 days, 5.3 months" for an event placed in "April 201".
  - `span pip-imagined i-did-this` gives "5730 days, 15.7 years (start to start)" for "year 186 to 190".
  - reader-order prints "153 days, 5.1 months before" for `reliquary-begun` "May 201, late spring".

  The skill says a date is "the whole span it names", and single years now behave that way. No cost: the prose's "five months" and "six months" are within the real ranges. Confidence: high.
- **`set-scene-pressures`, `-actors` and `-events` have no `--add`** (refusal 2). Low.
- **Small output noise, unchanged from Round 3:** `--precision` text still prints as if it placed the event ("at May 201, late spring", "at year 1, over the year after the Tidying").

**Misunderstandings (SKILL/DOCS):**

- **The post-draft number check was skipped in s24 and s33**, the two scenes whose events change counts (section 2). The skill says to check "every number… before you commit the draft", but the counts section at the top of the scene seems to have stood in for it. Round 3 ran the check in all four scenes.
- **Only the depicted events were read before drafting.** s24 retells five hollowing nights, and the writer showed only `i-did-this` and `night-watch` (scene-2 L2 CALL#1). From the labels in reader-order alone it wrote "untied her ribbon, said Curtain" for the night of Wick's hollowing (s24:9). The model's `sleeps-0821` says "ties up her hair, says Curtain and sleeps". `hollow-wick` has the ribbon catching on the nail, and s33 ends on Wick's last sight, "The face had a red ribbon in its hair" (s33:41). The skill says "`show` each event the scene depicts", which covers only what a scene shows, not what it retells (section 4, error 1).
- **Probing by adding and removing.** In scene-1 L40 CALL#6 the writer added `casimir knows event:hollow-wick` and then removed it. It also set and removed a participant on `hollow-wick`, and on `crane-ribbon`. It's harmless and was deliberate: it then logged why it didn't keep them.
- **Filters:** `>/dev/null` on `answer-open-question` (outline L455 CALL#21), `| head -40` on `touches` (CALL#19) and `2>/dev/null` once in scene 1. None hid a warning in the unfiltered run.
- **`gaps`: cleared to empty again, usefully, and not reported as a result.**
  - The first run (L523 CALL#27) listed 23 prompts: 17 drive-unopposed, 4 drive-without-scene and 2 event-unreferenced.
  - They were cleared across CALL#29 to #31 with 8 `mark-gap-deliberate` calls, each with a reason, real oppositions (e.g. Crane's crusade against Casimir's protecting Tilly; commit "Who stands against whom"), pressures added to scenes, and causes for the two unreferenced events.
  - The final report cites only "no contradictions".

## 4. The scene phase

**Consulting the model before writing:**

| Phase | Before drafting | After drafting |
|---|---|---|
| scene-1 (L3, L21) | `reader-order --before` (whole), `show scene`, `show event:crane-ribbon`, `show actor:crane` | 4 `span` calls (L34) |
| scene-2 (L2, L29) | `reader-order --before` (whole), `show scene`, `show event:i-did-this`, `show event:night-watch`, summaries of s21 to s23 and s25 | `contradictions` (L56) |
| scene-3 (L2, L40) | `reader-order --before` (whole), `show scene`, three events, summaries of s31, s32, s34 and s35 and of `reliquary-breaks`, a `grep` of s24 | `contradictions` (L66) |
| scene-4 (L2, L31) | `reader-order --before` (whole), `show scene`, two events, a `grep` of all scenes for "queen", summaries of s15 and s37, `show actor:abery` | 2 `span` calls (L45), `contradictions` (L63) |

**Linking and updating: thorough in every scene, and structural.** Each scene phase:

- set actors, depicts and the link kinds
- added the facts the prose invented, 19 in all: Vessen silk, the twelfth theater, Hester's lantern, the roll-call, Casimir's burn, the Lidless's lids, the skimmed grey sight, Hob's tally, Sluice's third step, Crane's white eyes and others
- added knowledge (11 records) and a lie as a version believed until a later event (`cas-not-yet`)
- rewrote depicted events and the scene summary

It also fixed the outline where the prose showed it wrong:

- **s24:** the night watch moved to s25, because s24 is morning and s25 is 11:00 the same day (scene-2 L51 CALL#4).
- **s33:**
  - Breaking the jars would have spent the stolen sight, so it now pools in the window (`sight-held`, `reliquary-breaks` rewritten).
  - A washerwoman can't kneel on steps buried for 200 years, so one stair now shows above the rubble (L66 to L72).
- **s36:** a one-morning scene had been set to depict a three-month `aftermath`. The writer split out `synod-night`, `abbess-sentence` and `hospice-dawn` (scene-4 L59 CALL#5).
- **Links forward:** `s16-hood` pays off the twelfth theater, `s27-marrowgate` Hester's lantern, `s35` `sight-held`, and `s37` the third step.

**Continuity errors between the prose and the model, and between scenes:**

1. **The ribbon untied, then worn** (low to medium; medium confidence). `s24-i-did-this.md:9`, on the night of the delving: "she'd come home at one, shown Rook the leaf, untied her ribbon, said Curtain". Against it:
   - the model's `sleeps-0821` ("ties up her hair"), `hollow-wick` ("Tilly's ribbon catches on the crate's nail") and `object:ribbon`
   - s11 (the thread on the nail, "at about the height of a person's head if they were kneeling")
   - `s33-tidying.md:41`, "The face had a red ribbon in its hair"

   A reader can mend it, since the rider could have tied it on, which would fit Vessary's frame, but nothing says so. The two judged scenes carry it. The model held the right state; the writer read only the depicted events (section 3).
2. **Loose rhetorical counts** (trivial; no action).
   - `s24-i-did-this.md:93`, Sluice's "Two hundred and sixty-one pairs of eyes open on you", for a watch kept "in shifts", with Greyhand among the 261.
   - `s33-tidying.md:105` "fourteen hundred gods… with nothing left", though Nine Bells "had thrown nothing" (:109).
   - `s36-queen-of-lamps.md:23` "all fourteen hundred of them at once", though "some of them were already looking toward home" (:9).

   Each is a speaker's or narrator's round number, unlike Round 3's 399 present against about 209 there.
3. **A stale number in the bible** (low; bible only). The `s16-hood` summary has "three hundred voices are cut off mid-word" at `the-hood` (2 September), when `count:pact` is 540 from `fame-surge`; `s20-hood-off` correctly says "where there were five hundred and forty". The outline's number pass (L561 to L566) fixed s02 and s34 but not s16. It's not in judged prose.
4. **Trivial.**
   - "Sister Agathe" (`s36:3`) isn't in the model.
   - `count:hollowed` doesn't count the half-blinded man under Cobb's Bridge. The `reliquary-breaks` note covers him.

**Clean against the model:**

- **Counts:**
  - 402 to 261 with 141 gone
  - 1,408, of whom 261 stayed and the rest came at the Sump telling
  - 1,407 when Sluice goes out, and 1,406 the next morning
  - Hob's tally starting at 31 and reaching 49 at `rite` and 50 at `chat-decides`, with the dip to 47 held in `fact:hob-tally`
  - 3 hollowed in a fortnight, and 5 victims in the jars
- **Spans:**
  - 13 days, 5 days and 4 nights before s11
  - 5 months of Greyhand's silence, "two nights ago" and "three weeks"
  - "six months" of watching
  - a month on the pillow, six weeks of sleeping on his hair and six weeks of knowing Casimir
  - sight home "a little before ten" (21:50)
  - "Good morning. It is the tenth" and "It is the second"
- **Ages:** Crane 10 at Marrowgate, sworn at 19 and 34 years sworn; Tilly 8 when Rook took her in; Pip a child's attention "for four years" (186 to 190).
- **Who knows what:**
  - Casimir lies to Crane in s11 and Crane believes it.
  - Tilly learns of the thread in s24 (`tilly-knows-thread`), knows Greyhand is Vessary by s33, and doesn't know Nine Bells until s34.
  - Wick knows from s36 (`wick-knows`).
  - Sluice's and Casimir's memberships match the prose ("the Wardens' badge back on").

Compared with Round 3 (a count of seats read as gods present, in two scenes, and a quoted line moved to the wrong scene), Round 2 (two count errors) and Round 1 (two count errors, a two-clock contradiction and a wrong day count), the numbers are clean in value and in meaning. The one slip is about what an object was doing on a night the scene retells.

## 5. What model-gaps.md says the writer wanted and couldn't hold

There are 24 entries: 9 from the outline and 3, 3, 4 and 5 from the four scenes (Round 3: 21; Round 2: 28). Grouped against the gaps decision worldcrafter-dgkx deferred:

- **Two identities (fourth round in a row; central).** "One being, two names (Greyhand is Vessary; Nine Bells is the Abbess)":
  - `show actor:vessary` doesn't list the hollowings Greyhand did.
  - Who Greyhand is has to be knowledge of a fact.

  Both masks carry the plot, as in Rounds 2 and 3, with no story cost: the prose keeps the masks straight, and the viewpoint marks handled `nine-bells-is-abbess` correctly.
- **Quoted lines (now a skill line only).** No entry was logged. The skill line was followed twice, and every reused line is a deliberate echo in the right place (section 2). There was no cost this round, so the cheaper step held, and no record is needed.
- **Presence in a scene (recurs, as perception).** "Knowledge that flows through someone else's eyes": Chat see what Tilly sees except behind the Curtain, Greyhand even then. Loose "all fourteen hundred" counts appear (section 4, error 2), but they're rhetoric. No cost.
- **Defeated drives (logged for the first time).** "A want that is defeated": Vessary's feast is `replaced` with a note saying "thwarted", because "Using 'renounced' would have been false". Elsewhere the writer still used `renounced` for defeats: `tilly-stay-free` "Hooded" and `tull-triumph` "Resigns". This is the fourth round, bible only, and no story cost.
- **Recognitions.** Not logged. They were held as knowledge from an event (`cas-knows-silk` at `crane-ribbon`, `tilly-pip` at `blinding-attempt`, `wick-knows` at `wick-wakes`). No cost.
- **Rules that decide events (recurs, strongly).** The law of shares decides the climax:
  - "A derived quantity": the share is a ratio of two unrecorded sums, and nothing checks that it falls from 46 to 31 when 1,000 patrons join.
  - "Two quantities pushing on one number".
  - "A count that moves many times inside one event": Hob's tally went into a fact.

  The prose matches what the model holds. No cost, but the climax's arithmetic is hand-set and unchecked, as Round 3's polls were.
- **Object holders and state (first cost, small).** Not logged, but the ribbon slip (section 4, error 1) is an object's state on a night the scene retells. The model held it in event summaries, so a holder or state record wouldn't have prevented it unless the writer read it. The skill fix in the ranking addresses that. The related "A god who goes out and comes back" asks for actor states (faded, blind, hollowed).
- **How knowledge was gained (recurs, strongly; five entries):**
  - "A suspicion that is no one's account": the writer had to invent a version nobody tells.
  - "Knowing that something happened vs. knowing what happened".
  - "What a group knows when its members disagree": Greyhand inside Chat.
  - "A lie told in a scene": a lie about a standing state hung on one event.
  - "Knowledge that flows through someone else's eyes".

  This class feeds the false viewpoint marks (section 3), not the prose.
- **New this round:**
  - places as records
  - a habit (saying Curtain every night) as a recurring event
  - promises and obligations (Sluice's last words, the Sump promise)
  - a minor offstage discovery needing a full event
  - a ritual inside an event
  - a reader question answered partly and then fully
  - a drive satisfied twice
  - two scene-time checks the writer wanted: scenes' depicted events out of story order (s24 and s25), and a one-morning scene depicting a months-long event (s36)

  Membership got praise: "Rejoining an organisation… handled this cleanly".

Of the deferred gaps, only object state had a visible cost, and it was small, with the right state already in the model. The rest had workarounds, as in Rounds 1 to 3.

## Ranked issues

Ranked by how much each likely cost the story or the writer's use of the tool. Item 1 cost this round's prose; item 2 cost a draft error, caught; the rest cost trust in the output, the writer's time, or are polish.

1. **A retold night read from labels only: the ribbon untied in s24, worn in s33** (small story cost in two judged scenes; medium confidence).
   - **SKILL:** "`show` each event the scene depicts *or retells*, not only the ones it depicts: a scene that recounts earlier nights must agree with what those events say."
2. **Opening values of counts come from memory** (draft error caught: 29 for 31; s24's 402 recalled). The counts section and `show event:` give each count at the scene's latest event, and the post-draft `show count:` was skipped in both scenes that change counts. Confidence high on the behaviour, medium on the cause.
   - **TOOL:** in `reader-order --before`, print each count's value entering the scene and every change at the scene's events ("402, then 261 at event:i-did-this").
   - **SKILL:** "Numbers the scene opens on are part of the check: run `show count:` for each count the scene's events change."
3. **Viewpoint marks still about half false in late scenes** (s24 about 4 of 11, s33 about 5 of 10, s36 about 6 of 9; s11 1 of 7). They were read and judged once and then ignored. No prose cost. Confidence high on the mechanism.
   - **TOOL:** give the viewpoint character what a scene reveals or implies when they are an actor in it or take part in its depicted events (not only in their own viewpoint scenes), and count "implies" in their own scenes.
   - **SKILL/DOCS:** for public accounts nobody tells them directly, add one `add-knowledge` per main viewpoint character.
4. **Trace noise, now small.** 1 real suspect in 4, acted on. Confidence high.
   - **TOOL:** leave out records *rewritten* earlier in the same command line, and the old target of a changed knowledge record.
5. **Months and year ranges measured as points** ("162 days, 5.3 months" for April; "start to start" for 186 to 190). No cost. Confidence high.
   - **TOOL:** give ranges for month-precision ends and year-range events, as single years now get.
6. **No `--add` or `--remove` on `set-scene-pressures`, `-actors` and `-events`** (one refusal and five lists retyped). Low.
   - **TOOL:** accept `--add`/`--remove` on every list-replacing scene command, as `set-scene-links` does.
7. **A stale number in a bible summary** (`s16-hood` "three hundred voices" against 540). Bible only. **No action.** The skill already asks for a check after a count's series is set; this is the writer's miss.
8. **`gaps` cleared to empty** (23 prompts), usefully and with reasons. **No action.**
9. **Polish (TOOL):** the `--precision` text prints as if it were the position.
10. **Not exercised:** set-count's kept note (worldcrafter-mugi), for the second round. **No action**, but keep the check.

## Verdict

The Round 3 fixes took:

- `reader-order --before` was read whole before every scene (Round 3: 2 of 4).
- Viewpoint marks are true for what the viewpoint character took part in, told and saw.
- Years are spans, and no date was invented.
- Traces were few, one was real, and the writer acted on it: the first in the mission.
- No number in the prose counts the wrong thing.
- Before reusing a line, the writer grepped the earlier scenes for it, and every reused line is in the right place.

Are meaningful tool or skill issues left? **Yes, a few, and they are narrow.** The prose's one continuity slip (item 1) and its one drafted number error (item 2) both come from the scene step reading less than it needs: past events the scene retells, and count values as the scene opens. Each is a one-line skill fix, with a small tool change for item 2. Item 3 is a tool rule that is still wrong about half the time in late scenes, which is why the writer stopped reading the marks. Nothing else cost the story. Of the deferred model gaps, none needs a record yet.

So this round does **not** show "no meaningful tool or skill issues", but it comes close. A small fix increment of items 1 to 3, with 4 to 6 if cheap, then Round 5 (the last allowed), is proportionate. If Round 5 shows only polish, the mission ends there as planned.

## Open items

- I didn't read the judges' outputs (`judging/`) or the stories so far, which are out of scope. Whether a judge noticed the ribbon is not known here.
- The writer's thinking isn't visible. Where the s24 and s33 opening values came from (memory of outline L403 CALL#12) is inferred, because no call in those phases prints them.
- The "false" and "true" judgements on the viewpoint marks are mine, from scene summaries, participants and versions. A different reading of "know" could move one or two marks per scene, not the overall picture.
- The replays ran the round's built `tool/story.js`, not `app/scripts/story.ts`, so they reflect the tool as the writer had it.
- `round-4-failed-1/` was not examined beyond confirming it isn't used.
