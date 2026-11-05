# Round 3 log (worldcrafter-lxmj)

Mission worldcrafter-gwx3, decision worldcrafter-jeue, strategy
`docs/strategies/world-demo.md`. A fresh writer on the same prompt. Scores
are per judge and indicative only; comparisons with earlier rounds are
observations, not a measured effect.

Round directory (outside the repo): `/home/supadava/projects/demiurge-world/round-3/`.
Copies kept here, in `round-3/`: `scenes/1.md` to `4.md`, `so-far/1.md` to
`4.md`, `scores.md`, `reading.md` (compares with Rounds 1 and 2 throughout),
`beats.md` (35 beats), `points.json`.

## Tool changes before this round (worldcrafter-ulpg)

Each reviewed (round1-fix-reviewer, approvals 64sy, e1y4, fet1) and merged
locally:

- **Counts in reader context** (uf0f): `reader-order --before` ends with each
  count's value as of the scene; threshold state printed only where it
  changes; a note when a scene both tells and withholds a ref; reader
  questions sorted by telling order.
- **Trace precision** (vg6e, with review fixes gu8c, a6my, d5wq): count
  traces only when a value changes, matching the old value in figures or
  words; common stems ignored; the scene being written left out of its own
  batch.
- **Scene viewpoint and group membership** (ktfa, decision worldcrafter-dgkx).
- **Story so far held to length** (zevg): one resumed revision when a text
  is under 250 or over 550 words. The judge prompt and rubric are unchanged.
- **Skill** (2m7d): check every number and stated time with `show count:`
  and `span` after drafting; read `reader-order --before` whole.

## The run

- Writer: claude-opus-5-5, Claude Code 2.1.318, CLI built from 71605295.
  Outline 852 s (38 turns, $3.12); four scenes in the resumed session,
  124–143 s each (session total about $5.53). No check problems; credentials
  unchanged.
- Outline: 35 beats; 29 actors, 31 facts, 65 events, 28 drives with 19
  turns, 2 counts, 30 memberships, a viewpoint on every scene, 7 versions,
  35 knowledge records, 8 objects, 9 open questions (15 rejected candidates
  with reasons; `touches` used to try candidates for the first time), 11
  reader questions.
- Points (`points.json`): chosen by the orchestrator, **25 nobody-unmasked**
  (reveal: Agathe has been Nobody-in-Particular) and **29 last-evening**
  (cost: Ember spends herself), placed later in the arc after finding
  worldcrafter-fja2; random, **10 lists** (range 1–17, seed 20261109) and
  **26 ember-tells** (range 18–35, seed 20261110). Beats 25 and 26 are
  adjacent again and nothing from 30–35 was judged. Scene numbers below are
  telling order: 1 lists, 2 nobody-unmasked, 3 ember-tells, 4 last-evening.
- Scenes: 2,067, 2,012, 1,995, 1,792 words. Story so far: scene 1's, 3's and
  4's first drafts (629, 592, 572 words) were revised once to 514, 504 and
  486; scene 2's was 546 first time. Vocabulary check: no hits.
- Panel: all 16 runs succeeded first time. 43 evidence quotes fail
  verification, again mostly from judges putting reasons in the strings.

## How the writer used the tool

From `round-3/reading.md`, which cites every claim:

- **Numbers and times were checked after drafting in every scene** (Round 2:
  never). Six `span` calls and a `show count:` caught three draft errors
  ("eight weeks" that was seven, "two months" that was a week, a count that
  took effect at the start of a ten-day walk) and an outline date. Every
  count and span the prose states now matches the model.
- **The one continuity error left is about meaning, not arithmetic:** two
  judged scenes count all 400 or 399 seats as gods present, while the model
  has 190 of them sold and hollow. The writer checked the figure against the
  seat count, which matched.
- **`reader-order --before`** was read whole for two scenes, then cut to its
  "Held back" section, which itself lists already-revealed answers as held
  back. Its counts section was used every time.
- **Viewpoint** was set on all 35 scenes, but its "doesn't know" marks were
  mostly false: about 11 of 12 before last-evening. They ignore what the
  viewpoint character took part in, told, or was shown in her own scenes.
  None was acted on. **Membership** (30 records) was used thoroughly and the
  prose agrees with it; Round 1's two-clock error didn't recur.
- **Traces:** 8 blocks, 24 suspects, none stale. Remaining noise comes from
  word stems, the scene's own just-drafted prose, and duration coincidences.
- **A year is treated as a point:** ordering two events inside one year was
  a contradiction, so the writer invented 13 and 14 April 1103.
- **`gaps`** was cleared to empty again, partly with real back-story, and
  not reported as a result.
- Duration-unit wording (worldcrafter-5b6m) was printed once and read
  correctly. The kept-note case (worldcrafter-mugi) didn't arise.
- **Deferred gaps:** two identities recurred and were central again (both
  masks in the plot); quoted lines had their first small story cost (a line
  from the Lists placed at the wake); presence, recognition, how knowledge
  was gained and rules deciding events (polls and their tallies) recurred
  with workarounds; defeated drives recur silently.

## Scores

| scene | judge | pacing | intrigue | subtext | character | prose/voice | tone/humour | world aliveness | continuity | overall |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 lists | opus | 8 | 9 | 8 | 8 | 8 | 8 | 8 | 9 | 8 |
| | sonnet | 8 | 9 | 8 | 8 | 8 | 9 | 8 | 9 | 9 |
| | fable | 8 | 9 | 8 | 8 | 8 | 8 | 8 | 9 | 8 |
| | grok | 8 | 8 | 8 | 8 | 9 | 9 | 8 | 9 | 8 |
| 2 nobody-unmasked | opus | 8 | 8 | 6 | 8 | 8 | 7 | 7 | 8 | 8 |
| | sonnet | 8 | 9 | 6 | 8 | 8 | 6 | 8 | 9 | 8 |
| | fable | 8 | 8 | 7 | 8 | 8 | 8 | 8 | 9 | 8 |
| | grok | 8 | 9 | 6 | 8 | 8 | 9 | 8 | 9 | 8 |
| 3 ember-tells | opus | 8 | 7 | 6 | 8 | 8 | 6 | 8 | 9 | 8 |
| | sonnet | 8 | 7 | 6 | 8 | 8 | 6 | 8 | 9 | 8 |
| | fable | 8 | 8 | 7 | 8 | 8 | 7 | 8 | 9 | 8 |
| | grok | 8 | 8 | 6 | 8 | 9 | 8 | 8 | 7 | 8 |
| 4 last-evening | opus | 8 | 7 | 7 | 8 | 8 | 8 | 8 | 9 | 8 |
| | sonnet | 8 | 7 | 7 | 8 | 7 | 8 | 8 | 9 | 8 |
| | fable | 8 | 7 | 7 | 8 | 8 | 8 | 8 | 9 | 8 |
| | grok | 8 | 8 | 7 | 9 | 8 | 9 | 8 | 9 | 8 |

Against Rounds 1 and 2 (indicative only): overall 8–9 in every round, with
Round 3 mostly 8; world aliveness 7–8 here (15 of 16 at 8), against 7–9 and
7–8. Subtext is again the lowest (6–8), and tone and humour dip in the two
grief scenes. No judge flagged the hollow-seats error; Grok's continuity 7
on scene 3 is for another reason.

### World aliveness: what the judges cited

- Scene 1: "The Lists at Quarrel Field had been laid out for horses three
  hundred years ago, and the city had never quite agreed to stop treating
  them t[hat way]" (opus, fable); "Pennants for the Thrones hung from the
  rail of the high box, the Hound's gold brightest. There was no pennant for
  her." (grok, sonnet).
- Scene 2: "Under the terms an unheld seat is struck at the next audit,
  which is at sunrise tomorrow." (opus, sonnet, fable); "The whole house
  smelled of the sea, and the sea was nine miles off." (grok).
- Scene 3: "Your grandmother had it boarded over when it went brackish. The
  Brack's under all that marsh, child" (opus, fable); "Amsel's dead and
  drank. A note about frost." (grok).
- Scene 4: "the old ferry-god tell you about the bridge that put him out of
  work" (opus, fable, grok); "A different one every ten years and all of
  them called Biscuit" (sonnet).

### Best and worst moments

- **Best**, by agreement: scene 2, "*I was the fire,* said Old Ember."
  (sonnet, fable, grok); scene 3, "It didn't save her," said Ember. "It let
  go of her. That's all." (all four); scene 4, Quell's deliberate nay and
  the weathervane that "didn't understand the question" (sonnet, fable).
- **Worst:** as in Rounds 1 and 2, the narration or a character explaining
  what the scene already showed: "Every one of them had spent their vote on
  something they didn't want" (scene 4, three judges); Agathe's
  plan-explaining speech (scene 2, two); the fraud ruling delivered "into a
  hug" (scene 3, two).

## Fixes before Round 4

Recorded as worldcrafter-79m3: the skill on
checking that a number counts the same thing as the count; viewpoint marks
that account for participation, telling and the viewpoint's own scenes;
`reader-order --before` showing each record's latest telling and not
listing revealed answers as held back; a year treated as its span; trace
noise from the scene's own prose, same-batch records and duration
coincidences; and output polish. Quoted lines get a skill line (check
earlier scenes before reusing a line) rather than a record; the decision
note on dgkx says why. Two identities stay deferred.
