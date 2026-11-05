# Round 1 reading: how the writer used Demiurge

This is an audit (agent-factory `audit`) of the writer's sessions for mission worldcrafter-gwx3, Round 1. It reports findings with evidence and suggests fixes. Nothing was changed.

## Sources and method

- Transcripts: `phases/{outline,scene-1..4}/transcript.jsonl`. I extracted every tool call and result with a script. Citations look like `outline L188 CALL#7`: L is the line in the JSONL file and CALL# is the tool-call index within that phase. The writer's thinking blocks are empty (redacted), so its intent is known only from its text, its commands and `model-gaps.md`.
- Replay: I re-ran every Bash and Write call from all five phases, in order, against a fresh scratch repo with the round's `tool/story.js`. I redefined the writer's output-filtering wrapper so that all CLI output printed. The replayed `story.json` and all four scene files are byte-identical to `work/`. This is how I recovered the output the writer never saw.
- I ran CLI reads (`render`, `reader-order`, `gaps`, `contradictions`, `show`) on a copy of `work/story.json` in my scratch directory, and read `work/model-gaps.md`, `phases/outline/git-log.txt`, the four scene files and `points.json`.
- Run shape: the outline took 943 s, 44 turns and $3.47. Each scene took 100 to 123 s and exactly 4 tool calls. The scenes ran in a resumed session, so the writer still had the whole outline build in context.

## 1. How the writer used the tool

**Shape of use.** The writer made about 1,110 CLI calls in only 40 Bash tool calls. It batched them through shell helpers it wrote: `S` (a wrapper), `E` (add-event plus set-position), `P`, `R`, `T`, `V`, `K`, `A`, `Q`, `F`, `sa/se/sp/sl`, and a `for` loop for 63 `add-cause` calls (outline L281 CALL#18). The replay counts 1,074 calls through `S` alone. It built the outline in layers, one layer per commit (git-log.txt):

1. facts: cosmology, economy, places
2. actors
3. back-story events, each placed
4. open questions, answered in the same call
5. present-day events
6. causes, then participants
7. drives, relations and drive turns
8. versions, then knowledge
9. the 37 scenes
10. scene links
11. reader questions
12. `gaps`, then clearing the gaps
13. a few late additions: Drury, Halloway, Pip, Tam, two questions left open for the reader

Commands used in the outline (totals across all phases in brackets): set-participant 151 (163), set-scene-links 90 (115), add-cause 68 (74), set-position 64, add-event 62, add-knowledge 43, add-fact 42 (51), set-scene-actors 42, update-fact 41, set-scene-pressures 38, add-candidate 37, add-scene 37, set-scene-events 36, relate-drives 29, add-drive 28, set-drive-origins 26, add-actor 24, add-drive-turn 23, reject-candidate 22, add-version 13, add-reader-question 13, set-reader-question-scenes 13, add-open-question 11, answer-open-question 9, add-object 6, mark-gap-deliberate 6, render 6 (always sliced), contradictions 5, gaps 4, update-scene 3, show 2 (13), list 2, leave-for-reader 2, reader-order 1 (`| head -150`), and init, update-candidate, describe-event (6 in total), remove-cause, remove-drive-turn and update-knowledge once each.

**What it built** (final `story.json`):

| Kind | Count | Notes |
|---|---|---|
| Actors | 25 | 21 persons and 4 organizations. Spirits such as Brindle are stored as `person` because there is no other kind. |
| Facts | 51 | All 51 have `--about`, most added only to clear gaps (see ranked issue 4). |
| Events | 66 | All placed, mostly to the day and some to the minute. 0 constraints, 73 causes, 163 participants. |
| Drives | 28 | 26 with origins, 29 relations, 22 turns (12 satisfied, 5 replaced, 4 renounced, 1 flipped). |
| Versions | 13 | Lies, cover stories and the Synod's official history. |
| Knowledge | 47 | 38 knows and 9 believes. 46 have `--since`, 7 have `--until`. |
| Objects | 8 | Promptbook, house book, register, penny, eye-medal, mask, Odile's notebook, and "the joke at the bakehouse" (a line of dialogue stored as an object). |
| Open questions | 11 | 37 candidates, 22 rejected with reasons. 9 answered, 2 left for the reader, 0 undecided. |
| Reader questions | 13 | All with an opening scene and an answering scene. |
| Scenes | 37 | 184 actor entries, 48 depicts, 132 pressures, 108 reveals, 22 implies, 22 withholds, 29 plants, 34 pays-off. |
| Deliberate gaps | 6 | Each with a reason. |

**How rich the world is: very.**

- Institutions: the Synod of the Unblinking Eye and its Vigilants (vows, windows, apostasy), the Peerage, the Concordance and its Notaries, the Crown, the Gallimaufry Players.
- Economy: regard as currency, a pact divided into a thousand parts, pensions for parts that are sold, tithes, polls and backlash, dormant mortal parts, an open register where any Peer may claim parts, crowns and pence, nine-crown bounties, Notary fees.
- History: the Gathering in Year 1 (the calendar counts from it), the Ledger's rise from 310 to 520, the Hask drowning in 431, the Orrow foreclosure in 540, the Pennyfold flood in 579 and abandonment in 598, and seven years of back-story to the pact night.
- Places: Saltreach, Aurenne, Pennyfold, Hask Bridge, Lockwater, Marrow Fen, Coldmere, the Ninth Pit of Orrow and the Gallery. All are facts, because there is no place record.
- Calendar: month names.

The scene prose draws on this texture throughout: the reeve's tenth, the standing offers, the carved eye-wards, Thawmonth.

**What it ignored entirely:** `trace`, `touches`, `mentions`, `scenes`, `constrain`, `move-scene`, `unanswer-open-question`, `update-drive`, `update-open-question`, `update-reader-question`, `--conflict`, and every `remove-*` except one cause and one turn. It never reworked anything after placing it: no event moved, no answer changed. It used `reader-order` once, truncated at scene 23 of 37 (outline L398 CALL#34), and never in a scene phase. It read `render` only in slices.

## 2. Where it misunderstood the tool (SKILL/DOCS)

There were few real misunderstandings. The writer read `--help` once (outline L3) and used nearly every record kind correctly.

- **`replaced --into` another holder's drive.** It first turned Mothlight's `novelty` drive into Jess's `save-chat`, then saw that this reads as if Mothlight had become that drive's holder. It undid the turn and made `mothlight-stay` (outline L310 CALL#22; model-gaps "A want that changes into sharing someone else's want"). *Fix:* say that `--into` names a drive held by the same actor, and that sharing someone else's want is a new allied drive.
- **A flashback seen through a false memory is set as `shows`.** "The Lamp" both shows `event:pact-night` and reveals `version:jess-improvised` (outline L380 CALL#30). The writer noticed that `shows` claims the scene depicts the truth (model-gaps "A flashback that shows a false version"). *Fix:* say that such a flashback reveals the version and does not depict the event.
- **plants and pays-off layered on reveals.** In several places one record is both implied and planted in a scene, or both revealed and paid off:
  - `gallery-two` implies and plants `fact:gathering-truth`.
  - `library-under-the-eye` reveals and pays off the same fact.
  - `smoke-at-pennyfold` plants and pays off the penny (CALL#29).
  - `the-witness` implies and plants `fact:gathering-truth` (scene-3 L35 CALL#4).

  Characters are "planted" when introduced (Lucan, Drury, Cobble, Mags, Hesk, Cray, Sedge) and "paid off" when they return. This isn't wrong, but `show object:` and plant/pay-off views lose meaning. *Fix:* one sentence on when plants or pays-off adds something beyond reveals.
- **Open questions are used as a decision log, not a workspace.** Each of the 11 questions was created, given candidates, answered, and had its other candidates rejected in the same Bash call (outline L199 CALL#9, L219 CALL#11, L225 CALL#12). No question was ever undecided across two calls, and `touches candidate:` was never run. The rejection reasons are good, so the weighing happened, but in the writer's head. *Fix (low):* say outright that recording a question you settle on the spot is fine, and that a question you are really unsure of should stay open and be tested with `touches`.
- **Not a tool issue, but noted:** the writer's report on scene 1 says "The word 'Chat' never appears" (scene-1 L30). The prose uses it twice as the patrons' name: `punch-or-fire.md:59` ("*OH,* said chat.") and `:75`.

## 3. Where the tool did something stupid

Every refused command and every error across all phases:

- **scene-2 L39 CALL#3:** `FAILED: update-event ferry-ambush :: error: unknown command update-event`. The writer guessed `update-event` by analogy with update-actor, update-fact, update-scene and update-object, then used `describe-event`.
- **outline L200 CALL#9:** `Exit code 1` with no output. This came from the writer's own wrapper (a final `grep` with no match returns 1), not from the CLI. All 25 edits saved, which the writer had to confirm with `show` (CALL#10), and it then added `; true` to the wrapper.
- **The replay found no other refusal** among roughly 1,110 calls (`grep FAILED` matches only update-event).

Ranked issues follow in the final section. The tool-side facts:

- **A trace prints on an event's first placement, and the writer filtered out all output to escape it.** The first `E` batch (outline L188 CALL#7) printed 19 blocks headed "What may still state the old event:X", one for each `set-position` on an event added in the same line, for example "…run trace event:pact-night for all 25". From the next call on, every command went through `S(){ out=$(bun … 2>&1) || echo FAILED…; echo "$out" | grep -iE "contradict|problem"; }` (outline L199 CALL#9 through scene-4 L31 CALL#3). That filter also hid the traces that mattered. In replay, 73 trace blocks printed; about 67 of them were first placements. CALL#16 alone produced 401 hidden lines. The six real traces were never seen:
  - `describe-event ferry-ambush` flagged `scenes/coldharbour.md:71`.
  - `describe-event third-reading` flagged the-witness.md:117 and punch-or-fire.md:79.
  - `describe-event ledger-calls`.
  - `update-object penny` flagged smoke-at-pennyfold.
  - `add-drive-turn novelty` flagged ledger-ruin.

  The first-placement traces are noisy too. `set-position tp-counts` listed "all 97" suspects, matched on shared words such as "count, grave, voice" (scene-4 replay). The writer logged the problem (model-gaps "Placing a new event prints a trace of 'the old event'").
- **Date ranges print as fractional years** in `render` and `reader-order`. The skill says render "prints dates, not fractions of a year". Examples: "Odile slips out of the convent (year 612.8333333333334 to 612.8415300546449)", which was set as `612-11-01 --end 612-11-03` (outline L187), and "Brother Cray's killings begin … year 618.6657534246575 to 619.413698630137". There are 16 such lines in reader-order and 4 in render (render lines 160, 180, 208, 213). The writer logged it (model-gaps "Small display note").
- **reader-order and render are too long to read.** `reader-order` is 418 lines and 71 KB, and it repeats each fact's full text at every mention (the 300-character `fact:dormant-parts` text appears again under each knowledge that cites it). The writer read the first 150 lines once and never again. `render` is 470 lines and 119 KB, read only through `sed` slices. A guessed heading (`/## Open questions/`) matched nothing (outline L433 CALL#39, empty result), so the next call had to grep for the headings (L435 CALL#40). The heading is "## Decided", which doesn't match the skill's words ("groups questions by state").
- **gaps still pushes ritual linking.** The first `gaps` run (outline L388 CALL#32) listed 39 prompts, 27 of them `fact-unconnected`, one for nearly every world fact. In the next call the writer gave all of them `--about` (41 `update-fact` calls in CALL#33 and #39). It also added five drive relations, some made up to clear the list: "cray-list opposes understand-dreams" (Cray's kill list against Mags's wish to understand her dreams) and "save-chat opposes never-default". Its final report counts "`gaps` and `contradictions` both come back clean" as an achievement (outline L455). The Round 0 change made the wording advisory but didn't remove the pull.
- **set-scene-links replaces the whole list,** so the writer retyped full lists every time:
  - punch-or-fire's plants were set three times (outline CALL#29, scene-1 CALL#3 and CALL#4).
  - the-witness's implies, withholds and plants were reset in back-to-back calls (scene-3 CALL#3 and CALL#4).
  - There is one possible silent drop: `sl smoke-at-pennyfold plants drive:keep-her` (outline L380 CALL#30) removed `object:penny`, planted there one call earlier. It is unclear whether that was deliberate.
- **No sanctioned quiet or batch mode.** The writer's grep wrapper was the only way to stay sane over about 1,100 calls. It hid everything except lines containing "contradict" or "problem". Contradictions print "No contradictions" either way, so only refusals and contradictions could get through.

## 4. The scene phase

- **Consulting the model before writing:** minimal, with `show` only, never `reader-order`, `scenes`, `trace` or `render`.
  - scene-1: `show scene:punch-or-fire` (L3).
  - scene-2: `show scene:coldharbour` and `show actor:lucan` (L5).
  - scene-3: `show scene:the-witness`, `show event:third-reading` and `show actor:notary` (L2).
  - scene-4: `show scene:one-exact-act`, `show event:heist`, `show scene:into-the-eye` and `show actor:twelve-pence` (L2).

  It relied on the outline still in context. That worked for scenes 1 and 2, which follow written or adjacent material, but scenes 3 and 4 sit at positions 19 and 31, after 14 and 26 unwritten scenes.
- **Linking: thorough.** After every scene it reset reveals, implies, withholds, plants and pays-off, plus actors, events and pressures. Examples: scene-1 L20 CALL#3; scene-2 L38 CALL#3; scene-3 L30 CALL#3 and L35 CALL#4; scene-4 L31 CALL#3. It also linked ahead to unwritten scenes, for example `get-this-straight pays-off object:odile-notebook`, `everything-a-show pays-off object:joke` and `default pays-off actor:cobble`.
- **Updating the model after writing: yes, every time.**
  - scene-1: facts `wights` and `coldmere`, back-story event `first-backlash`, object `odile-notebook`, richer penny and Chat notes.
  - scene-2: actor Cobble and event `cobble-sells`. It rewrote `ferry-ambush` to match the prose and synced `version:lucan-pact-account` to the exact quoted words.
  - scene-3: facts `apostasy` and `lesser-vow`, event `quell-wakes`. It moved `second-reading` into the hayloft to fit a line of prose, and stored the joke as an object.
  - scene-4: back-story `tp-counts`, facts `standing-offers`, `count-at-call`, `eye-wards` and `the-call-voice`, rewrites of `twelve-pence-sells` and `ledger-calls`, and a cause from `widow-fades` to `ledger-calls`.
- **Continuity errors visible between the prose and the model:**
  1. **The Ledger's arithmetic, in the prose.** `one-exact-act.md:99`: "Four hundred and eighty-eight … Of nine hundred and ninety-two … I need eight more than I have, and nine would be tidier." But 488 + 8 = 496, exactly half, and the writer's own `fact:count-at-call` says "more than half is 497". She needs nine.
  2. **Patron count.** `punch-or-fire.md:21` and `:119` say "Two hundred and eighty-seven names" on 2 April 619. That is the count at the pact (`fact:parts-count`). Five days later the Register shows the Ledger already holding 180 parts (`first-reading`), and `fact:selling-out` says sellers leave the Gallery. By scene 3 the writer guessed "a hundred and some" and changed its first draft with `sed` (scene-3 L30, "two hundred-odd" changed to "a hundred and some"), because "I couldn't check against anything" (model-gaps "Exact counts again").
  3. **Brindle sold two years before he disappears.** `event:ledger-buys` is placed at February 617, with Brindle as participant "among the first to sell" (outline L286 CALL#19). Yet Brindle greets Jess first on 2 April 619 (`punch-or-fire.md:7`), and `brindle-gone` is 4 April 619. In the same way, `knowledge:tp-knows-buying` starts at February 617, while the gallery-one summary says Twelve-Pence has known "since winter" and wheres-brindle says regulars went quiet "this spring". Cobble sells at Midwinter 618 and Lucan says "Fewer than at Thawmonth?". The buying runs on two clocks: one at 617 in the model, one in the spring of 619 in summaries and prose.
  4. **Day count.** `one-exact-act.md:19`: "I have been thinking of a better thing to have said for twenty-six days." The bakehouse (`third-reading`) is 619-05-01 and the heist is 619-05-28, which is 27 days. The model holds both dates but offers no way to ask for the span between them. By contrast, the-witness's "Twenty-four days" (7 April to 1 May) is right.

  No contradiction with the model was found in coldharbour (four days chained, Brindle gone, Lucan's words) or in the-witness's timeline (Odile's knowledge since the first reading).

## 5. What model-gaps.md says the writer wanted and couldn't hold

There are 23 entries, grouped here by how often they recur:

- **A quantity that changes over time.** Three entries: "A quantity that changes over time", "Exact counts again" and "The clock's arithmetic, done by hand". The plot runs on the Ledger's count (180, 241, 452, 488, 497) against a total that itself shrinks (1,000 to 992). The writer kept it in facts and summaries, and nothing checks it. It caused the errors in 4.1 and 4.2.
- **Point of view, presence and place.** Four entries: "Point of view and place", "A scene that changes point of view at the end", "Present in a scene, but where?" and "One scene, three places and two points of view". The writer wanted to say whose eyes a scene is through, where it is set, and whether someone is there in body, as a voice in chat, unseen, or only heard through another's ear. Places live only as facts.
- **Who belongs to Chat, and when.** Two entries: "A collective whose membership changes" and "Changing sides". Mothlight, Cobble and Mags join, leave and return, and only notes and participant roles say so.
- **Quoted lines.** Two entries: "A line that recurs word for word" and "A line of dialogue as a planted thing". The writer had to sync version text by hand and stored the bakehouse joke as an object.
- **Single entries:**
  - A drive that is defeated rather than given up (it used `renounced` with a note).
  - A recognition that two known things are one (it invented `fact:bride-was-jess`).
  - A flashback that shows a false version.
  - Who holds an object, over time.
  - World rules that decide events (causes run only between events).
  - Parallel time in the Beyond (the Gallery interludes have no "when").
  - Minor continuity facts carrying the same weight as world rules in `render`.
  - A hint only the reader catches (implies doesn't say to whom).
  - Knowledge without a "how" (felt, told, read).
  - The two tool complaints already covered: the trace on first placement and fractional years.

## Ranked issues

Ranked by how much each likely cost the story or the writer's use of the tool.

1. **The trace prints on an event's first placement, so the writer silenced the whole CLI** (outline L188, then L199 onward; replay: 73 blocks, about 67 first placements, 6 real traces never seen). This effectively turned off the round's change-tracing work and every other warning for the whole run, including all scene phases. Confidence high. **TOOL:** print no change-trace for `add-*` or for an event's first `set-position`, and cap the inline trace at about 3 lines. A `--quiet` flag that still prints refusals, contradictions and real traces would also help.
2. **There is no numeric state, so arithmetic and count errors went into the prose** (4.1, 4.2; three model-gaps entries). Confidence high. **TOOL:** add a small "count" record whose values are set at events, which `show`, `render` and `trace` print as a running series, with an optional total to check "more than half" against.
3. **The scene phase never asked the model what the reader knows by this point, or how long ago things were** (4.3, 4.4; scenes used only `show`). One cause is that reader-order is unusable at 71 KB. Confidence medium-high. **SKILL:** before writing a scene, run `reader-order --before <scene>` and `show` each linked event. **TOOL:** add `reader-order --before <scene-id>` using short labels instead of full fact text, and have `show event:` print the days since the event the previous scene depicts.
4. **`gaps` still drives ritual linking.** 27 of 39 prompts were `fact-unconnected`, followed by 41 `update-fact --about` calls and contrived drive relations (CALL#32 to #33). "Clean gaps" ended up in the final report. Confidence high. **TOOL:** drop `fact-unconnected` (a world fact standing alone is normal), or collapse it to a count. **SKILL:** state that an empty gaps list is not a goal.
5. **No membership or presence model for Chat** (4.3's Brindle contradiction; four POV/presence entries and two membership entries). Confidence medium. **TOOL:** later, a scene-actor role (point of view, present, voice only, unseen) and group membership with since/until. Meanwhile, the **SKILL** can tell the writer to record each departure from a group as an event with that actor as a participant, so `show actor:` shows it.
6. **render and reader-order are too long, and render's headings don't match the skill's words** (outline CALL#38 to #41). Confidence high. **TOOL:** add `render --section <name>`, and name the question sections after their states ("Undecided", "Decided, not revealed", "Revealed", "Left open").
7. **Date ranges print as fractional years** in render and reader-order. Confidence high. **TOOL:** format a range's end as a date when it was set as a date.
8. **set-scene-links replaces the whole list,** forcing retyping with one possible silent drop (outline CALL#30). Confidence medium. **TOOL:** add `--add` and `--remove` (or `+`/`-` refs), and print the removed refs when a set drops any.
9. **Open questions are settled in the same call that creates them;** `touches` was never used. Confidence medium; the cost to the story is unclear. **SKILL:** say it's fine to log a choice already made, and that genuinely open ones should stay undecided and be tested with `touches` before answering.
10. **`update-event` doesn't exist** (scene-2 L39, the only real refusal). Confidence high. **TOOL:** alias `update-event` to `describe-event`, or suggest it in the error.
11. **The skill doesn't say how to handle `replaced --into` across holders, a flashback through a false version, or plants/pays-off versus reveals** (section 2). Confidence medium. **SKILL/DOCS:** add one sentence for each.
12. **Smaller model gaps:** defeated drives, recognitions, rules that decide events, quoted lines, object holders, parallel time, knowledge "how". Confidence medium. **TOOL:** a later round, if they recur. A `defeated` turn kind and a quoted-line record are the cheapest of these.

## Open items

- I did not read the judges' outputs. They were out of scope.
- The writer's reasons for its choices aren't visible because its thinking was redacted. "Deliberate" calls, such as the smoke-at-pennyfold plant change, are inferred.
- The replay ran the round's built CLI from `tool/story.js`, not `app/scripts/story.ts`, so it reflects the tool as the writer had it.
