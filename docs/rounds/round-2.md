# Round 2 log (worldcrafter-5pks)

Mission worldcrafter-gwx3, decision worldcrafter-jeue, strategy
`docs/strategies/world-demo.md`. A fresh writer on the same prompt. Scores
are per judge and indicative only; comparisons with Round 1 below are
observations, not a measured effect.

Round directory (outside the repo): `/home/supadava/projects/demiurge-world/round-2/`.
Copies kept here, in `round-2/`: the four scenes `scenes/1.md` to `4.md`, their story-so-far texts
`so-far/1.md` to `4.md`, `scores.md`, `reading.md` (the transcript reading,
which compares with Round 1 throughout), `beats.md` (34 beats), `points.json`.

## Tool changes before this round (worldcrafter-3fqq)

Each reviewed (round1-fix-reviewer, approval kv29) and merged locally:

- **Quiet CLI** (b0la): a clean edit prints nothing; no change-trace for
  adds or an event's first placement; inline traces capped at 3 suspects;
  dates printed as dates everywhere; `render --section`; question sections
  named by state; `set-scene-links --add/--remove` and a note when a set
  drops refs; `update-event` alias; `fact-unconnected` gap retired. A replay
  of Round 1's outline batch went from 1,402 printed lines to 14.
- **Counts over time, spans, reader context** (w2hx): `add-count`/`set-count`
  with totals, thresholds and direction, checked by `contradictions`;
  `span <event> <event>`; `reader-order --before <scene>`.
- **Round runner** (te8t): `choose-random --range`.
- **Skill** (1h0r, h5rz): consult the model before a scene; an empty gaps
  list is not a goal; guidance on drive turns, flashbacks through a false
  version, plants versus reveals, leaving a group; examples made neutral, so
  no Round 1 story content reaches the writer.

## The run

- Writer: claude-opus-5-5, Claude Code 2.1.318, CLI built from c02d092b.
  Outline 878 s (35 turns, $2.77); four scenes in the resumed session,
  121–136 s each (session total about $4.65). No check problems; credentials
  unchanged.
- Outline: 34 beats; 23 actors, 42 facts, 61 events (all dated), 22 drives
  with 21 turns, 3 counts with 34 values, 11 versions, 27 knowledge records,
  11 objects, 9 open questions (7 answered, 2 left for the reader, 17
  rejected candidates with reasons), 9 reader questions, 34 scenes.
- Points (`points.json`), under the rule recorded on 5pks: chosen by the
  orchestrator, **12 s12-mill** (cost paid: Lark drowns because of Bry's
  vote and hesitation) and **24 s24-kettle** (reveal: Mothlight is Bry's
  mother); random, **10 s10-surge** (range 1–17, seed 20261107) and
  **23 s23-return** (range 18–34, seed 20261108). Scene numbers below are
  telling order: 1 s10-surge, 2 s12-mill, 3 s23-return, 4 s24-kettle.
- Scenes: 1,975, 1,877, 1,917, 1,913 words. Story so far: 797, 741, 662,
  556 words, all over "about 300–500" (Round 1's were too, less so); the
  runner doesn't enforce the length. Vocabulary check: no hits.
- Panel: 16 reports. Sonnet's first report on scene 4 was malformed (an
  evidence string on `overall`) and was replaced by a fresh Sonnet judge, run
  2, as the rubric says (`judging/4/sonnet-failed-1/`). 26 evidence quotes
  across judges fail verification, mostly Sonnet's, which again put its
  reasons inside the evidence strings.

## How the writer used the tool

From `round-2/reading.md`, which cites every claim:

- **The Round 1 fixes took.** The writer's wrapper passed every output
  through, and it saw all 8 traces the CLI printed (Round 1: 73 printed, all
  hidden). It used `--add` instead of retyping lists, `render --section`, and
  three counts; `span` found and fixed age and duration errors in the
  outline; `gaps` no longer drove invented links (10 prompts, no
  `fact-unconnected`), though the writer still cleared it to empty.
- **Before each scene** it ran `show` on the scene and its events and, for
  three of four, `reader-order --before`, always cut with `tail`. It never
  ran `span` or `show count:` in a scene phase.
- **Traces were seen but almost all noise:** 0 of 8 led to a fix. For counts
  the trace flags any number equal to any value in the series, and fires when
  only a note changed; for text it matches common stems. The one real stale
  record (a count note) was missed even by the full `trace`.
- **Two continuity errors in numbers the model held** and the writer didn't
  check: Corvin's fifth bead treated as news though the model has it six days
  earlier, and "nearly half" brass where the model says just over half,
  which matters to the plot. The day counts the prose states are all right.
- **Recurring model gaps** (deferred after Round 1): point of view and
  dramatic irony (the writer's "engine of s16–s23"), group membership over
  time, quoted lines as setups, and a new one, one person with two
  identities. Defeated drives recur in the data as `renounced` with notes.
  Parallel time and place don't recur.
- Duration-unit wording (finding worldcrafter-5b6m) was never printed: no
  constraints were made.

## Scores

| scene | judge | pacing | intrigue | subtext | character | prose/voice | tone/humour | world aliveness | continuity | overall |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 s10-surge | opus | 7 | 8 | 7 | 7 | 8 | 8 | 7 | 8 | 8 |
| | sonnet | 8 | 8 | 8 | 7 | 8 | 8 | 7 | 9 | 8 |
| | fable | 8 | 8 | 8 | 8 | 8 | 8 | 7 | 9 | 8 |
| | grok | 8 | 8 | 8 | 8 | 8 | 9 | 7 | 8 | 8 |
| 2 s12-mill | opus | 8 | 8 | 7 | 8 | 8 | 8 | 8 | 9 | 8 |
| | sonnet | 8 | 8 | 6 | 7 | 7 | 6 | 7 | 8 | 8 |
| | fable | 9 | 8 | 8 | 9 | 9 | 8 | 8 | 9 | 9 |
| | grok | 9 | 8 | 8 | 8 | 8 | 9 | 8 | 8 | 8 |
| 3 s23-return | opus | 8 | 8 | 8 | 8 | 8 | 7 | 7 | 8 | 8 |
| | sonnet | 8 | 9 | 8 | 8 | 8 | 8 | 7 | 9 | 8 |
| | fable | 8 | 8 | 8 | 8 | 8 | 8 | 7 | 9 | 8 |
| | grok | 9 | 9 | 8 | 9 | 8 | 9 | 8 | 8 | 9 |
| 4 s24-kettle | opus | 8 | 7 | 7 | 8 | 8 | 8 | 8 | 9 | 8 |
| | sonnet (run 2) | 8 | 7 | 6 | 8 | 8 | 7 | 7 | 9 | 8 |
| | fable | 9 | 8 | 8 | 9 | 9 | 8 | 8 | 9 | 9 |
| | grok | 8 | 8 | 7 | 8 | 8 | 9 | 8 | 9 | 8 |

Against Round 1 (indicative only): overall scores are the same range (8–9);
world aliveness is 7–8 here against 7–9; subtext is 6–8 in both.

### World aliveness: what the judges cited

- Scene 1: "The lamplighter stood at the bottom of the street with his pole in
  his hand and his mouth open." (opus); "the Sallow had come up over the race"
  (grok); all four gave 7.
- Scene 2: "the chemist wants six crowns on Friday" (opus, sonnet, fable,
  grok), Lark's debt being the texture every judge picked.
- Scene 3: "The Queen likes to be sung to while she listens to other things."
  (opus); "Mortals under the Hill thin, if they're kept long enough" (sonnet);
  fable quoted the five beads.
- Scene 4: "the Nine Wet Gentlemen all weeping at once, *we are not crying,
  Abel is crying*" (opus, sonnet); "you don't know what it is, being thin"
  (fable).

Round 1's judges cited institutions and an economy (bounties less the reeve's
tenth, standing offers, pensions); Round 2's cite folklore, debt and Chat's
voices. The reading notes the Round 2 world's economy is thinner.

### Best and worst moments

- **Best**, by agreement: scene 2, "she sat in the cold water holding Lark
  Sabine's dead fingers and listened to a thousand vo[ices]" (opus, grok);
  scene 3, "That side's yours. Of the fire. Not this side." (sonnet, fable);
  scene 1, the friends' identical goodnight (fable, grok).
- **Worst:** as in Round 1, nearly every judge names narration or a character
  explaining what the scene already showed: "Fire ran over the top of water;
  that was what fire did" (scene 2, three judges), "He wasn't a stupid man"
  (scene 3, two), "I didn't know I was doing it on purpose until just this
  minute" (scene 4, two).

## Fixes before Round 3

Recorded as worldcrafter-ulpg (decision worldcrafter-dgkx for viewpoint and membership): counts in
`reader-order --before` and a post-draft number check in the skill; trace
precision; count display noise and contradictory scene links; the round
runner holding story-so-far to length; and a minimal scene viewpoint and
group membership, since both recurred in two rounds. Quoted lines, the
two-identity alias and the rest stay deferred. The craft issue (narration
explaining what a scene shows) is again left alone.
