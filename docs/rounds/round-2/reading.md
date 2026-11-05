# Round 2 reading: how the writer used Demiurge

This is an audit (agent-factory `audit`) of the writer's sessions for mission worldcrafter-gwx3, Round 2 (worldcrafter-5pks). It reports findings with evidence and suggests fixes. Nothing in the repository or the round directory was changed apart from this file.

## Sources and method

- Transcripts: `phases/{outline,scene-1..4}/transcript.jsonl`. I extracted every tool call and result with a script. Citations look like `outline L275 CALL#12`: L is the line in the JSONL file and CALL# is the tool-call index within that phase. As in Round 1, the writer's thinking is not visible, so its intent comes only from its text, its commands and `model-gaps.md`.
- Replay: I re-ran every Bash and Write call from all five phases, in order, in a scratch repo, using the round's `tool/story.js`. I removed every output filter the writer used (`>/dev/null`, `2>/dev/null`, `2>&1 | head -3`, `| head -N`, `| tail -N`). The replayed `story.json`, all four scene files and `model-gaps.md` are byte-identical to `work/`. A second replay ran the CLI through a logging shim to count every subcommand.
- I ran CLI reads (`show`, `span`, `render`, `reader-order`, `trace`, `contradictions`, `gaps`) on a copy of `work/story.json`. I also replayed the outline up to CALL#12 and re-ran CALL#13's edit plus a full `trace`, to see what that trace missed. I read the four scenes, `model-gaps.md`, the skill as built (`tool/story-sketch/SKILL.md`), `points.json`, the git logs, Round 1's reading, the strategy (`docs/strategies/world-demo.md`) and review finding worldcrafter-5b6m.
- Run shape: the outline took 878 s, 35 turns and $2.77 (Round 1: 943 s, 44 turns, $3.47). Each scene took 121 to 136 s and 4 to 7 tool calls (Round 1: 100 to 123 s, exactly 4). The scenes ran in the resumed outline session. They are s10, s12, s23 and s24 of 34 beats: s12 and s24 were chosen as turns, and s10 and s23 were drawn at random with seeds 20261107 and 20261108 (`points.json`).

## 1. How the writer used the tool

**Shape of use.** There were 1,065 CLI calls in 34 outline tool calls and 21 scene-phase tool calls (Round 1: about 1,110 in 40 outline calls). The writer again batched through one-letter shell helpers: `s`, `e`, `p`, `r`, `k`, `q`, `sc`, `sm`, `sl`, `L`, `A`, `E`, `P`, and a `for` loop for 63 `add-cause` calls (outline L249 CALL#6). This time the wrapper is a plain pass-through, `s() { bun "$STORY_CLI" story.json "$@"; }` (outline L232 CALL#2 onward), with no grep. It built the outline in layers, committing as it went (`phases/outline/git-log.txt`, 8 commits):

1. cast, facts, objects, back-story and present-day events, causes and participants
2. drives, origins, relations and turns
3. three counts, versions and knowledge, then open questions answered on the spot
4. 34 scenes, then scene links
5. reader questions, `gaps`, `reader-order`, then clearing the gaps
6. `span` checks of ages and durations, with the fixes (outline L377 CALL#30)
7. a late addition: Tobin at the mill

Subcommand totals across all phases, from the replay log (scene-phase counts in brackets):

| Command | Count | Command | Count |
|---|---|---|---|
| set-participant | 205 (1) | add-reader-question / set-reader-question-scenes | 9 / 9 |
| set-scene-links | 120 (36) | mark-gap-deliberate | 8 |
| add-cause | 65 | contradictions | 7 (3) |
| set-position | 62 | answer-open-question | 7 |
| add-event | 61 | describe-event | 7 (5) |
| add-fact | 42 (13) | span | 6 (0) |
| set-count | 40 (2) | gaps | 4 (1) |
| set-scene-actors / -pressures / -events | 40 / 36 / 34 | reader-order | 4 (3, all `--before`) |
| add-scene | 34 | add-count | 3 |
| add-knowledge / add-candidate | 27 / 27 | leave-for-reader | 2 |
| relate-drives | 24 | update-fact | 2 (1) |
| add-actor | 23 | render | 1 (`--section`) |
| show | 23 (22) | list | 1 |
| add-drive / add-drive-turn / set-drive-origins | 22 / 21 / 20 | `--help`, init, remove-cause, update-drive, update-object, update-actor, update-version | 1 each |
| reject-candidate | 17 | | |
| update-scene | 14 (8) | | |
| add-object / add-version | 11 / 11 | | |

`set-scene-links` ran 95 times replacing the list, 24 times with `--add` and once with `--remove`.

**What it built** (final `story.json`), with Round 1 in brackets:

| Kind | Count | Notes |
|---|---|---|
| Actors | 23 (25) | 18 persons and 5 organizations (Chat, the masks, the Nine Wet Gentlemen, the Concordat, the Pactwardens). Spirits are still `person`. |
| Facts | 42 (51) | 40 with `--about`. None were added to clear `gaps` this time. |
| Events | 61 (66) | All placed: 1283 to January 1313, mostly to the day or the minute. 0 constraints, 64 causes, 205 participants. |
| Drives | 22 (28) | 20 with origins, 24 relations, 21 turns (11 satisfied, 7 renounced, 3 replaced). |
| Counts | 3 (none) | `watchers` (18 values, threshold 50, "the Floor"), `masks` (`--of watchers`, threshold more-than-half, 10 values) and `letters` (total 6, 6 values). |
| Versions | 11 (13) | Bry's "she left me", Corvin's, Mothlight's, Hesper's own, the Queen's, Tallow's pitches, Tobin's. |
| Knowledge | 27 (47) | 20 knows and 7 believes. 25 have `--since`, 3 have `--until`. One is a belief in a candidate answer (`bry-suspects-mothlight`). |
| Objects | 11 (8) | Tinderbox, mirror shard, guestbook, note, writ, token, beads, codex, bottle, cage, Lark's mirror. No dialogue is stored as an object this time; lines went into facts (see section 5). |
| Open questions | 9 (11) | 27 candidates, 17 rejected with reasons. 7 answered and 2 left for the reader, all in the same call that created them (outline L296 CALL#15). |
| Reader questions | 9 (13) | Each has an opening scene and an answering scene. |
| Scenes | 34 (37) | 211 actor entries, 44 depicts, 85 pressures, 85 reveals, 16 implies, 14 withholds, 26 plants, 50 pays-off. |
| Deliberate gaps | 8 (6) | Each with a reason. |

**How rich the world is: rich, though a little less dense than Round 1.**

- Institutions: the Concordat of the High Seats and its "one warlock, one patron" law, the Long Night Court and the Unblinking, the Pactwardens and their licences, the Hollow Queen's court and its rules (eat nothing, give no name, thank no one).
- Laws that drive the plot: the Lion's Share clause, name-witness law, names held by the Queen, thinning, gods fed by attention, "called by name" windows, and a closed window ending its pact.
- The Gallery and Chat: a full roster with distinct voices (Thimble the moderator, Cinder the whale, Gorehound the troll, Lantern who always says go left, the Nine Wet Gentlemen, the Left Hand, Old Quillon), sparks coloured by giver, chat votes, the Floor, hushing, and the guestbook.
- Economy: thinner than Round 1. There is tribute in sparks, sponsorship, tolls, licences, "six crowns" bounties and Lark's chemist bill, but no money system to match Round 1's regard-as-currency and pensions.
- Places: Lessering, the Marches, Hob's Crossing, Crake, Fennick's Ford, the Drowned Mill, Sallow Marsh, Harrowgate, Sallowhead, Grey Ford and the Hollow Hill. All are facts or event text, as before. There is no named calendar.

The scenes draw on this throughout: the scroll, sparks by colour, the Brindle and the Ferry Arms, the Grindle, the guestbook lines, burnt toast.

**What it ignored:**

- Never used: `trace`, `touches`, `mentions`, `scenes`, `constrain`, `move-scene`, `unanswer-open-question`, `update-open-question`, `update-reader-question`, `--conflict`, `reject-candidate --undo`, `leave-for-reader --undo`, and every `remove-*` except one cause.
- `render` ran once, sectioned (outline L397 CALL#33).
- `reader-order` without `--before` ran once, cut to `| head -150` (outline L357 CALL#26).
- `span` and `show count:` were never used in a scene phase.

## 2. Did the Round 1 fixes take?

**Output filtering: largely fixed.** The writer's helper prints everything, and the replay shows it saw all 8 traces the CLI printed in the whole run (Round 1: 73 printed, all hidden). It filtered in five places:

| Where | Filter | What it hid (from replay) |
|---|---|---|
| outline L267 CALL#10 | `2>&1 \| head -3` on one `add-drive-turn` | Nothing; it showed the one refusal (section 3) |
| outline L287 CALL#14 | `>/dev/null` on `set-count masks thimble-bottled` | Nothing (no output) |
| outline L328 CALL#22 | `2>/dev/null` on `L s13-millrace reveals event:bry-alone event:tobin-saved` | The refusal `error: event tobin-saved does not exist`. The next line set the corrected list, so it had no effect. |
| reads | `\| tail -40/-25/-45` on `reader-order --before`, `\| head -150` on `reader-order`, `gaps \| head -5`, `render ... \| head -80`, `show ... \| head` | Mostly the early part of `reader-order --before` (lines 1 to 70 of 115 for s23) |

The skill now says "don't filter the output, even in a long batch". The one edit with stderr silenced was a guess the writer evidently expected to fail.

**Seeing and acting on traces: seen, never acted on.** All 8 inline traces were read. None led to a fix, and `trace` was never run. That was the right call, because almost none of the suspects were real:

- outline L283 (CALL#13, `set-count masks sponsorship-surge 450`, changed from 540):
  - The suspects were `lions-share-found` ("summary shares words: colour, count"), `road-dip` ("count, window") and `never-closed` ("nobody, window").
  - The second block flagged `count:watchers` because its goodnight note says "790", which happens to equal a mask value at another event.
  - The one stale record, the watchers note at `sponsorship-surge` ("Over five hundred 'just a friend' arrive overnight"), was not flagged even by the full `trace` (scratch replay). The writer found it a phase later by reading (scene-1 L47: "The note on the watcher count had said over five hundred masks arrived").
- outline L378 (`set-position bry-born`): `actor:bry` came first for sharing "bryony, kettle; born, lesser". The real dependent was the "24." in Bry's notes, and the writer checked it with `span` instead.
- scene-1 L32 and scene-2 L32 (`set-count watchers` re-set to the same value, 915 and 1460, with only the note changed): each listed s10's prose "915", `object:guestbook` "614" and the s01 summary "362" as "states its value". All of these are correct values at other events; no value had changed. The writer logged it: "`trace` then flagged the prose's '915' as a suspect, correctly but noisily" (model-gaps, "Writing s10").
- scene-2 L32, scene-3 L31 and scene-4 L32 (`describe-event`): first came the scene being rewritten in the same batch, then word-share noise such as `s01-tannery` "chat, fight, wrong", `actor:hesper` "escap, hill" and `s29-litany` "answer, remember".

So the change that stopped the silencing worked. What is left is precision: in a longer run, a writer who learns the suspects are noise will stop reading them.

**Counts and set-count: used well in the outline, not consulted in the scenes.**

- Three counts with 34 values (outline L275 CALL#12).
- The writer read `show count:masks` right away, saw "700 of 1390, reaching more than half" at `thimble-bottled`, and re-annotated it (CALL#13 and #14). It also logged that the threshold applies only before the Unblinking (model-gaps "A count whose threshold only matters under a condition").
- After each scene it re-set the count with the new detail (scene-1 L31 CALL#4, scene-2 L31 CALL#3).
- Every count stated in prose matches the model: 915, 960 and 990 in s10; 1,460 in s12; "seventeen hundred" in s23 and s24 (tollhouse 1,710).
- It never ran `show count:` in a scene phase, although the skill's "Before writing a scene" says to for "any number the prose states". The two count errors below would have been caught by `show count:letters` and `show count:masks` (section 4).

**`span`: used in the outline only, and it paid off.** Six `span` calls (outline L377 CALL#30) found that Bry was 11 rather than 12 when her mother was taken, and that Hesper was caged 11.1 years, not twelve. The writer moved `bry-born`, found every stale "twelve years" with `grep` (L369 CALL#28) and fixed five records (L371 CALL#29). Commit 84beee1: "Ages and spans corrected". No `span` was run in the scene phases. The prose's day counts were done by hand and are all correct:

- s23 "Sixteen days ago" (24 Nov 18:00 to 10 Dec)
- s23 "back five days" (5 to 10 Dec)
- s23 "the spring before last … a year and a half" (May 1311 to Dec 1312)
- s24 "nearly a month" since Cinder last spoke (marsh, 14 Nov, to 11 Dec)

**`reader-order --before`: used before 3 of 4 scenes, always cut with `tail`.**

- scene-1 L2: `| tail -40` of 57 lines.
- scene-2 L2: `| tail -25` of 70.
- scene-3 L2: `| tail -45` of 115.
- scene-4: not run.

It is short now (5.6 to 13 KB, against 71 KB for the whole `reader-order` in Round 1), and it was used to reason about what the reader has been told: for example, scene-3's note that the reader already knows `event:hesper-escapes` from s20. It does not print count values, so it couldn't show the bead count.

**`render --section`: worked.** `render --section undecided,decided,left-open,reader-questions` (outline L397 CALL#33) returned exactly what was asked. Round 1's guessed heading that matched nothing did not recur. No fractional years appear anywhere in `render` or `reader-order` (checked with a grep for `\d{4}\.\d`).

**`set-scene-links --add/--remove`: took.**

- 24 `--add` calls and one `--remove` (scene-3 L37 CALL#5). No full list was retyped to add one item after the outline.
- Three "Dropped from …" notices appeared, all evidently deliberate:
  - `s05-rooftop reveals event:hesper-taken` was moved to `implies` in the same call (outline L328 CALL#22).
  - `s06-road plants fact:corvin-name` was also withheld there.
  - `s10-surge reveals version:tallow-sponsor` was moved to s09 (scene-1 L32, explained in the report at L47).

**`update-event` alias:** not needed. The writer used `describe-event` all 7 times, and the skill names both.

**Does `gaps` still push ritual linking? Much less.**

- The first run (outline L341 CALL#24) listed 10 prompts: 8 `drive-unopposed` and 2 `event-unreferenced`. There was no `fact-unconnected` (Round 1: 39 prompts, 27 of them `fact-unconnected`).
- In the next call (L352 CALL#25) the writer still cleared every prompt:
  - 4 new drive relations, one of them strained: "gorehound-blood opposes lark-fame", although Gorehound eggs Lark on and his role in her death event is "eggs both on".
  - 6 `mark-gap-deliberate` calls with real reasons.
  - One cause, `corvin-services → writ-issued`, added, then removed after the next `gaps` (L357 CALL#26), then marked deliberate (L363 CALL#27).
- The writer logged having "to mark the birth event as a deliberate unreferenced gap" (model-gaps "Ages").
- The final report still offers a clean result as an achievement: "The tool reports no contradictions and no gaps except eight I marked as deliberate" (outline L403).

The pull is now small, and it shows mostly as deliberate marks, not invented links.

**Duration units (worldcrafter-5b6m): not exercised.** The writer made no `constrain` calls, the model has 0 constraints, and every `contradictions` run printed "No contradictions." So no duration-mismatch text ("72 hours give or take 12 hours") was ever printed, and there was nothing to misread. `span` output ("4455 days, 12.2 years", "69 days, 2.3 months", outline L378) was read and acted on correctly. Carry the check forward.

## 3. Misunderstandings (SKILL/DOCS) and tool stupidity (TOOL)

**Every refused command and error, across all phases (from replay stderr):**

1. outline L268 CALL#10: `error: drive ferro-doubt does not exist`. The writer used `add-drive-turn ferro-law replaced --into ferro-doubt` before adding that drive. It had expected the failure (`2>&1 | head -3`) and fixed it in the next call (L272 CALL#11). The CLI was right to refuse.
2. outline L328 CALL#22: `error: event tobin-saved does not exist`, hidden by `2>/dev/null`. It was a guessed ref, followed at once by the corrected line. No effect.
3. Errors that didn't come from the CLI:
   - scene-1 L18 CALL#2: `ls scenes` exit 2, before any scene file existed.
   - scene-1 L36 CALL#5: the writer's own Python trim script failed an assertion.
   - scene-3 L19 CALL#3: `grep … scenes/s01-tannery.md scenes/s02-gull.md`, files that don't exist. The writer looked for Mothlight's earlier lines in prose that was never written. Only four scenes are written, and nothing in `show scene:` (which prints "not written yet") was consulted for them.

That is 2 CLI refusals in about 1,065 calls, both the writer's own sequencing. Round 1 had one real refusal (`update-event`), which is now an alias.

**Misunderstandings of the tool (SKILL/DOCS):** few, and smaller than Round 1's.

- **The scene-phase checks in the skill were half followed.** It ran `reader-order --before` and `show` on each depicted event, as the skill says. It never ran `span` or `show count:` for the numbers and times the prose states, although the skill lists both under "Before writing a scene". Two continuity errors followed (section 4). The checklist reads as a pre-writing step, but the numbers only exist once the draft does.
- **Layered links remain, though fewer.** Four scenes link one record two ways:
  - s10 implies and plants `fact:cinder-withholds`.
  - s13 reveals and plants `fact:never-closed`.
  - s15 reveals and pays off `fact:against-vote`.
  - s24 reveals and plants `fact:named-anchors`.

  Round 1 had more. The skill now says a revealed record "needs no plant as well unless its return is the point", and the s10 and s24 plants arguably are setups, so this is low cost.
- **Implies and withholds of one candidate were accepted silently.** In scene-3 L29 CALL#4, s23 both implies and withholds `candidate:who-mothlight/hesper`. The writer noticed on its own ("the tool accepts without comment though the two cancel out") and removed the withhold (L37 CALL#5). This is a TOOL issue as much as a docs one.
- **Open questions are still settled in the same call that creates them,** and `touches` was never used (outline L296 CALL#15). The skill now explicitly allows this, so it is no longer a finding.

**Tool stupidity (TOOL):**

- **Trace precision is low** (section 2). For counts it flags any number equal to *any* value in the series, and it fires when only the note changed. For text it matches on common stems in this story ("chat", "window", "hill", "count", "escap"). It misses numbers written in words ("five hundred"). It lists the depicting scene that the writer is about to rewrite in the same batch. The inline top three and the full `trace` also disagree: for the same edit, inline gives lions-share-found, road-dip and never-closed, while the full list gives lions-share-found, end-stream and lions-share-claim (scratch replay). 0 of the 8 inline traces led to a fix.
- **`reader-order --before` omits counts.** It lists what the reader was told, but not "watchers 1,710, masks 860 (just over half), letters 5 since 19 Nov". That is the one place the writer did look before each scene.
- **The count display is noisy or nonsensical in places:**
  - Every watchers value prints "reaching 50", up to 2,104.
  - `end-stream` prints "0 of 0, 1 short of more than half (1)" (`show count:masks`).
  - A value below a threshold that the facts make impossible is shown but never surfaced. `window-opens` is "11, 39 short of 50" while its summary says "she can light a fire with a word", against `fact:floor` ("below about fifty watchers Bry cannot cast at all"). The writer read `show count:masks` (which shows "0 of 11") but never `show count:watchers`.
- **The reader-questions section of render** is sorted by ID (rq-brass, rq-claim, rq-close, …), not by telling order. Its heading, "What the reader is waiting to find out", also lists questions that are already answered (outline L398). Cosmetic.
- **Friction worked around:** `grep -o '[^"]*twelve years[^"]*' story.json` (outline L369 CALL#28) to find a phrase across records, which is `mentions`' job, though `mentions` takes a ref, not a phrase. Python heredocs to trim prose. Neither cost anything.

## 4. The scene phase

- **Consulting the model before writing: better than Round 1, but no numbers checked.**

  | Phase | Before writing | After or alongside |
  |---|---|---|
  | scene-1 (L2, L18) | `show scene:s10-surge`, `reader-order --before s10-surge \| tail -40`, `show event:sponsorship-surge` | `show event:tallow-offer`, `object:token`, `actor:cinder` |
  | scene-2 (L2) | `show scene:s12-mill`, `show scene:s11-fennick \| head -8`, `show event:lark-dies`, `show actor:lark`, `reader-order --before s12-mill \| tail -25` | |
  | scene-3 (L2) | `show scene:s23-return`, `show event:corvin-returns`, summaries of s18 and s20 to s24, `reader-order --before s23-return \| tail -45` | |
  | scene-4 (L2) | `show scene:s24-kettle`, `show event:hesper-revealed`, `show version:hesper-own`, `show fact:little-kettle`, `show object:note`, `grep "little k" scenes/*.md` | no `reader-order` |

  None of the four ran `span` or `show count:`. Round 1 used only `show`.
- **Linking: thorough, with `--add`.**
  - After each scene it set actors (adding people the prose put in, such as Hal in s10 and Thimble, Quillon and Gorehound in s23), pressures, and all five link kinds.
  - It linked forward and back: s15 now pays off `fact:cinder-withholds` and `fact:against-vote`, and s33 pays off `object:lark-mirror`. In scene-4 L31 CALL#4 it marked `fact:mothlight-quiet` as implied by s03, s10, s12 and s23.
- **Updating the model after writing: yes, every time, and more than Round 1.**
  - scene-1: facts `cinder-withholds`, `no-vote` and `crake`; rewrote `sponsorship-surge`; corrected the watchers note (L31 CALL#4).
  - scene-2: facts `drowned-mill`, `grindle`, `against-vote`, `give-them` and `fire-on-water`; object `lark-mirror`; knowledge `bry-knows-against`; rewrote `lark-dies` and three scene summaries (L31 CALL#3, L37 CALL#4).
  - scene-3: rewrote `mothlight-joins` and `corvin-returns`; `update-version queen-hesper`; five knowledge records; fixed s18's summary so the confession includes the cage (L29 CALL#4).
  - scene-4: `update-fact hush`; five facts; rewrote `hesper-revealed`; updated s24's and s30's summaries (L31 CALL#4).
- **Continuity errors between the prose and the model:**
  1. **Corvin's fifth bead is treated as new.** `s23-return.md:44`: "There were five white beads at his throat, not four. She noticed that and filed it away to hate later," followed by "You've been home, then." The model says otherwise:
     - `show count:letters` gives 5 from `queen-speaks`, 19 Nov 06:00, and the s16 summary has the Queen return "a fifth letter as earnest" at Harrowgate, where Bry and Corvin are together.
     - They part at `party-splits`, 25 Nov. `span queen-speaks party-splits` gives 6 days.

     So Bry travelled beside five white beads for six days, and the fifth is not news from the Hill. `show count:letters` before writing would have shown it. Confidence medium-high.
  2. **"Nearly half" brass when the model says over half.** `s23-return.md:21`: "Eight hundred and something of them now … out of seventeen hundred and something. Nearly half the sparks … came down brass." The model's value at `tollhouse-raid` (5 Dec, the latest before s23) is "860 of 1710, reaching more than half (856) (50.3%…)", and the s22 summary has Thimble report that the Marquis will be "well past half". The writer's own s23 summary repeats "nearly half" (scene-3 L29). The plot turns on which side of half the masks are, so this matters more than its size. Confidence medium.
  3. **Corvin's advice conflicts with the world's rules** (low). `s12-mill.md:93`: "Close the damned thing and cast what you want." By `fact:floor` and `fact:new-pact`, a closed window leaves Bry with no power at all (s28: "She has no power at all"). Bry's reply answers a different question, casting against the vote. It could be Corvin's ignorance as a single-patron warlock, but nothing in the model or prose says so. Confidence low.
  4. **An outline contradiction the count exposed and nobody read** (low; not in written prose). The `window-opens` summary has 11 watchers and her able to "light a fire with a word", against the Floor of 50 (`show count:watchers`: "11, 39 short of 50").
  5. **Trivial:** `s10-surge.md:63` "I've never been past four hundred and thirty" against a peak of 431 at `alley-fight`. `s24-kettle.md:63` "Gorehound, who had never once in seven years held his tongue" can't be checked, because the model has no record of when Gorehound joined Bry's window (the membership gap).

  Clean against the model:
  - all watcher counts in s10, s12 and s24
  - every day and month span listed in section 2
  - Bry's age (24) and "twelve years" of hating her mother
  - who knows what when: Bry learns of the cage at the confession (knowledge back-filled at scene-3 L29), suspects Mothlight from `corvin-returns` and knows at `hesper-revealed`; the reader already has the empty cage from s20
  - Cinder's silence from s10 to the marsh, then to s24

  Compared with Round 1 (two count errors, a two-clock contradiction, a wrong day count), the count and span work removed the arithmetic errors that were checked. The two errors left are in numbers the writer didn't check.

## 5. What model-gaps.md says the writer wanted and couldn't hold

There are 28 entries: 9 from the outline (one says a workaround "works well") and 19 from the scenes (5, 4, 5 and 5). Grouped by how often they recur, with Round 1's deferred gaps marked:

- **Point of view and dramatic irony (Round 1 deferred: recurs).** Two entries: "Point of view" and "Dramatic irony, again". s16 and s20 are Corvin's POV, and "dramatic irony is the engine of s16–s23". The writer wanted `reader-order` to show when the reader knows something the viewpoint character doesn't.
- **Presence in a scene (Round 1 deferred: recurs, in a new form).** "Who is quiet in a scene": the reveal's force is that all of Chat, Gorehound included, goes silent, and scene actors can't mark a conspicuous silence. "An absence as a clue" (Cinder giving nothing all day) is the same thing at the level of a day. **Place:** no entry this round. Places sit as facts (`crake`, `drowned-mill`) without complaint.
- **Group membership over time (Round 1 deferred: recurs).** Three entries:
  - "Chat as a crowd of individuals": membership, and the masks being secretly one actor.
  - "Watchers moving between windows": Lark's watchers migrate when her window shuts, and Lark's own count isn't held.
  - The unverifiable Gorehound line in s24.

  The skill's workaround (a join or leave event with the actor as participant) was used once, before the advice applied (`mothlight-joins`), and not for the masks, Gorehound or Lark's watchers.
- **Quoted lines (Round 1 deferred: recurs, twice).** "Advice as a setup": "give them what they want" was stored as a fact, planted in s11 and paid off in s12. "A clue built out of earlier lines of dialogue": s23's montage of Mothlight's lines, which nothing ties to their source scenes.
- **Identity and alias (new).** "One person, two identities": Mothlight is Hesper, so it is one actor with "as Mothlight" in roles. "A recurring behaviour" and "A pattern finally named": "Mothlight goes quiet when Corvin is near" had no record until s24 explained it, so the earlier scenes were linked after the fact.
- **Defeated drives (Round 1 deferred: recurs silently).** Not logged, but the data shows it. 5 of the 7 `renounced` turns are defeats, carried in notes:
  - `queen-songbird`, `concordat-order` ("Overruled by its own presiding Seat"), `marquis-own` ("For now. He is patient.") and `tallow-commission` ("melted down off the page"), all at `ruling`.
  - `lark-fame` ("She dies of it").

  New and related: "A want given up in words before the act" (one turn, one event).
- **Recognition (Round 1 deferred: recurs in another form).** "Implied to the reader, withheld by the character": recognition held as a `believes` knowledge on a candidate answer (`bry-suspects-mothlight`). It worked, but needed a workaround.
- **Rules that decide events (Round 1 deferred: partly recurs).** "A condition on a future act": Hesper gives the name only when "it's his to want", which nothing ties to `drive:corvin-name`'s turns. The climax runs on the facts `new-pact`, `called-by-name` and `lions-share`, which can only be `--about` events, not their cause.
- **Object holders (Round 1 deferred: recurs as object state).** "An object changing state": the guestbook's contents over time ("Just a Friend. (Lots.)", "(Mum.)", "Hesper Kettle").
- **How knowledge was gained (Round 1 deferred: recurs).** "Knowledge with an unknown start": sometime during eleven years in the cage. "A version told in another scene": no record of when or where a version was told.
- **Parallel time (Round 1 deferred): does not recur.** There are no Gallery interludes in this outline.
- **Counts (new since counts exist):**
  - "A count that changes within one day, between no particular events" (915, 960, 990).
  - "A count whose threshold only matters under a condition".
  - "Which letters, not just how many": a set, not a number.
- **Other single entries:**
  - "False belief about how the world works": knowledge can't hold belief in a false rule; it held `against-vote` with her misbelief folded into the text.
  - "Facts are all-or-nothing when revealed": a fact whose early reveal would answer a later reader question, which nothing flags.
  - "A belief about a detail being corrected in the scene" (nine stairs, then eleven).
  - "Ages": no birth date on an actor.
  - "A trait shown through a character": a participant has one role.
  - "A fact the prose added about earlier scenes": nothing pointed to `mothlight-joins` or the s18 summary.

All of these had a workaround, and the prose did not suffer from any of them, except that membership leaves Gorehound's "seven years" unchecked.

## Ranked issues

Ranked by how much each likely cost the story or the writer's use of the tool.

1. **Scenes state numbers and durations nobody checked, and the one pre-scene read doesn't carry counts.** Evidence: section 4, errors 1 and 2 (s23:44 bead, s23:21 "nearly half" against 860/1710). There were 0 `show count:` and 0 `span` calls in scene phases, although the skill asks for both. `reader-order --before` prints no count values. Confidence medium-high.
   - **TOOL:** `reader-order --before <scene>` prints each count's value as of the scene ("letters: 5 of 6 since The Queen speaks to Corvin, 19 November 1312"), with its threshold state.
   - **SKILL:** move "`span` and `show count:` for every number and time the prose states" to after the draft, as a check on the draft's numbers.
2. **Inline traces are seen but are almost all noise, so they taught the writer to read past them.** Evidence: 8 traces, 0 acted on; the false hits in section 2; and the one real stale record (the watchers note "Over five hundred") missed even by the full `trace`. Confidence high on the noise, medium on future cost.
   - **TOOL:** for `set-count`, trace only when the value changed, and match text that states the *old value at that event* (including the number in words). For text edits, ignore stems that are common across the story, and don't list a record that the same batch rewrites.
3. **Recurring model gaps: point of view and dramatic irony, membership over time, quoted lines, and the new alias for a secret identity.** Evidence: section 5. Two POV entries, three membership, two quoted-line and two identity entries, all central to this plot. Confidence medium. The story cost was low this round because the writer worked around them.
   - **TOOL (next increment):** a scene viewpoint field, which `reader-order --before` uses to mark what the reader knows and the viewpoint character doesn't. Then group membership with since/until, or the skill's join/leave events promoted to a `joins`/`leaves` participant role.
4. **Count display noise, and a threshold breach the facts forbid that nothing surfaces.** Evidence: "reaching 50" on every value; "0 of 0, 1 short of more than half (1)"; `window-opens` at 11 against the Floor of 50, unseen (section 3). Confidence high on the display, low on story cost.
   - **TOOL:** print threshold state only when it changes, and print nothing for a zero total.
   - **SKILL:** after setting a count's series, read `show count:<id>` once and check each "short of" value against what that event says.
5. **`gaps` is still cleared to empty.** Evidence: 10 of 10 prompts cleared in CALL#25 to #27, with one strained relation, a cause added and removed, and "no gaps" in the final report. This is far milder than Round 1. Confidence medium; low cost.
   - **TOOL:** don't prompt `event-unreferenced` for an event that is only a date anchor (participants only, no causes), or show the prompts as a count.
   - **SKILL:** keep "an empty list is not a goal", and add "don't report it as a result".
6. **Implies and withholds of the same ref in one scene are accepted silently.** Evidence: scene-3 L29, noticed and fixed by the writer. Confidence high; low cost.
   - **TOOL:** have the edit print "s23 now both implies and withholds candidate:…", as it does for dropped links.
7. **`reader-order --before` is still read only through `tail`.** Evidence: all three calls cut it, to the last 40, 25 and 45 lines. Its early setups are never seen, which is where s23's "have you eaten" clue lives. Confidence medium; low cost so far.
   - **SKILL:** read it whole. It is 5 to 13 KB now.
8. **Render's reader-questions section is sorted by ID and its heading implies unanswered.** Evidence: outline L398. Confidence high; cosmetic.
   - **TOOL:** sort by the opening scene's telling order, and split the section into answered and open.
9. **Duration-unit wording (worldcrafter-5b6m) is untested.** Evidence: 0 `constrain` calls and no mismatch ever printed. Confidence high that it wasn't exercised.
   - **No action:** keep the check for Round 3.

## Verdict

The Round 1 fixes took:

- the writer no longer silences the CLI
- `--add` replaced the retyping
- `render --section` and dated output work
- `update-event` isn't missed
- counts and `span` caught and fixed real errors in the outline
- `gaps` no longer drives fake links

Meaningful issues remain, but they are smaller and narrower. Issues 1 and 2 are tool and skill issues with a direct line to story errors: two continuity errors in four scenes, both in numbers the model held and the writer didn't ask for. Issue 3 is the standing model gap list (POV, membership, quoted lines, identity), which recurs as Round 1 predicted. The round does **not** show "no meaningful tool or skill issues", so by the strategy's rule the mission should not stop early. A small fix increment for issues 1, 2, 4 and 6 (plus the skill lines in 1, 4, 5 and 7) is proportionate. Issue 3 is a larger model change, and whether it belongs in this mission is a decision for the orchestrator.

## Open items

- I didn't read the judges' outputs (`judging/`). They were out of scope.
- The writer's thinking isn't visible, so "deliberate" readings of the `Dropped` notices and of the `2>/dev/null` guess are inferred from the commands around them.
- The replay ran the round's built `tool/story.js`, not `app/scripts/story.ts`, so it reflects the tool as the writer had it.
- The bead finding assumes Bry would notice a bead that blooms beside her. The prose could have Corvin hide it, but neither the prose nor the model says so.
