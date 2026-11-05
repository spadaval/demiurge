# Round 5 log (worldcrafter-hdly)

Mission worldcrafter-gwx3, decision worldcrafter-jeue, strategy
`docs/strategies/world-demo.md`. The fifth and last round the direction
allows. A fresh writer on the same prompt. Scores are per judge and
indicative only.

Round directory (outside the repo): `/home/supadava/projects/demiurge-world/round-5/`.
Copies kept here, in `round-5/`: `scenes/1.md` to `4.md`, `so-far/1.md` to
`4.md`, `scores.md`, `reading.md` (compares with Rounds 1–4, and closes with a
section across all five rounds), `beats.md` (38 beats), `points.json`,
`outline-recheck.json`.

## Tool changes before this round (worldcrafter-qmq0)

Each reviewed (round1-fix-reviewer, approvals w4pl, zqqn) and merged locally:

- **Runners stop their sandboxes** (7b2r, with fixes s8hy, 24pb): SIGTERM,
  SIGINT or SIGHUP to a runner stops its sandboxed sessions and records the
  phase as interrupted; a phase refuses to start over a live sandboxed
  session of the same user. This answers Round 4's killed first attempt.
- **Opening counts and viewpoint marks** (b0pg, with fix mnm0):
  `reader-order --before` gives each count as the scene opens and at each
  change; a character present in another's viewpoint scene learns what it
  reveals or pays off, except that viewpoint's own secrets (versions are
  still heard).
- **Polish** (yyki): month and year-range spans as ranges; `--precision`
  printed as a quoted note; `--add`/`--remove` on every scene list; the
  same-line trace rule narrowed so finding gu8c's case still traces.
- **Skill** (l55e, hibo): show the events a scene retells; check the numbers
  a scene opens on; record what main viewpoint characters know of public
  accounts; the skill brought up to the CLI.

## The run

- Writer: claude-opus-5-5, Claude Code 2.1.318, CLI built from a35f7fdd.
  Outline 794 s ($2.71); four scenes in the resumed session, 112–181 s each
  (session total about $5.16). Credentials unchanged.
- **Outline check flag:** the outline phase was flagged once by the
  transcript check, for a bare `/` used as a separator in prose ("bound to /
  owned by"; a rhyme's line breaks) inside a heredoc and a quoted note. The
  writer read nothing outside its directory. The check was fixed (070f68e,
  then 704bd56 after review finding h6sd showed the first fix let piped
  shell input through), reviewed (approval ta69), and the phase rechecked:
  ok (`outline-recheck.json`). The outline was not rerun. A pre-existing
  gap the review found (a script written then run hides its reads, finding
  k9wa) is backlog worldcrafter-2lxe.
- Points (`points.json`): chosen, **26 s25-lampwick** (reveal: Lampwick is
  Saint Iver) and **36 s34-bell** (reversal: Iver steps out beyond the
  deed's hold), 10 beats apart, the second in beats 31–38; random,
  **16 s15-wending** (range 1–19, seed 20261113) and **22 s21-dark**
  (range 20–38, seed 20261114). Scene numbers below are telling order:
  1 s15-wending, 2 s21-dark, 3 s25-lampwick, 4 s34-bell.
- Scenes: 1,852, 1,832, 1,921, 1,988 words. Story so far: three first drafts
  (585, 558, 590) revised once to 509, 455, 512; scene 2's 540 first time.
  Vocabulary check: no hits.
- Panel: 16 reports. Sonnet's first report on scene 1 had two json blocks
  and was replaced by a fresh Sonnet judge, run 2. 32 evidence quotes fail
  verification.

## How the writer used the tool

From `round-5/reading.md`, which cites every claim:

- **The Round 4 fixes took.** Every number a scene opens on came from the
  counts section. Viewpoint marks are true for the main viewpoint (8 of 8),
  and for the first time the writer acted on them, finding and fixing a
  bible error. Post-draft checks ran in 3 of 4 scenes and caught a number
  counting the wrong thing and a count changing within a scene. Month and
  year spans printed as ranges; `--add` worked on every list.
- **No confirmed continuity error in the prose.** One sentence (scene 4) is
  open to doubt about what the viewpoint believes.
- **New, latent since Round 2:** `span`'s day counts between whole-day
  events are often off by one (a rounding error counting midnights,
  `app/src/story/calendar.ts`). The writer noticed and hedged one line.
  Earlier rounds' span checks used the same function and weren't re-checked
  against it.
- **The presence rule is mostly cancelled by its own exception** for
  secondary viewpoints (Silt 8 of 10 marks false, Brannoc 7 of 12); the
  writer cleared them with 16 hand-made knowledge records.
- `gaps` was answered with reasons, two prompts left open, not reported as a
  result. The kept-note case (worldcrafter-mugi) didn't arise for the third
  round.

## Scores

| scene | judge | pacing | intrigue | subtext | character | prose/voice | tone/humour | world aliveness | continuity | overall |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 s15-wending | opus | 8 | 8 | 8 | 8 | 8 | 8 | 7 | 7 | 8 |
| | sonnet (run 2) | 8 | 8 | 8 | 8 | 8 | 9 | 8 | 8 | 8 |
| | fable | 8 | 8 | 8 | 8 | 8 | 8 | 7 | 8 | 8 |
| | grok | 8 | 8 | 7 | 8 | 8 | 9 | 8 | 8 | 8 |
| 2 s21-dark | opus | 8 | 8 | 8 | 8 | 8 | 7 | 8 | 9 | 9 |
| | sonnet | 8 | 8 | 7 | 8 | 8 | 7 | 8 | 9 | 8 |
| | fable | 9 | 8 | 8 | 9 | 9 | 8 | 8 | 9 | 9 |
| | grok | 8 | 8 | 7 | 8 | 8 | 8 | 8 | 8 | 8 |
| 3 s25-lampwick | opus | 8 | 8 | 7 | 8 | 8 | 7 | 8 | 7 | 8 |
| | sonnet | 8 | 8 | 8 | 8 | 8 | 7 | 8 | 9 | 8 |
| | fable | 8 | 8 | 8 | 8 | 8 | 7 | 7 | 8 | 8 |
| | grok | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 7 | 8 |
| 4 s34-bell | opus | 8 | 6 | 8 | 7 | 8 | 6 | 7 | 8 | 8 |
| | sonnet | 8 | 7 | 6 | 7 | 8 | 5 | 8 | 9 | 8 |
| | fable | 8 | 6 | 7 | 8 | 8 | 6 | 8 | 8 | 8 |
| | grok | 9 | 8 | 8 | 8 | 9 | 8 | 8 | 8 | 9 |

World aliveness 7–8 (no 9s); overall 8–9. Scene 4, the climax's reversal,
has the round's lowest intrigue (6–8) and tone and humour (5–8).

### World aliveness: what the judges cited

- Scene 1: "Abel shook her hand and asked if she'd be at Harrowgate fair next
  month" (opus, sonnet); "you don't set up where the crowd is, you set up
  where it's going to be." (fable).
- Scene 2: "a small god of a milestone on the old Harrowgate road" (opus,
  fable, grok); "every night a lamp had hung on a post at either bank so that
  nobody crossing late would miss the stones" (sonnet).
- Scene 3: "A god whose house is pledged is a thing that is owed. Any prayer
  to me by my name is a prayer to my creditor." (opus, sonnet).
- Scene 4: "Osric was still on his ladder at the corner of Chandlers' Row,
  trimming a wick that did not need it." (grok); "the Chandlers' bell, the
  one Kit had fallen from at the Midsummer fair the year before" (fable).

### Best and worst moments

- **Best**, by agreement: scene 2, "*One for the boatman,* said a voice. *One
  for the bell.*" (all four); scene 1, "The hush could stop a mouth. It
  couldn't close an eye." (opus, fable); scene 3, Kit banking the fire "the
  way Brannoc had taught her" (fable, grok).
- **Worst:** as in every round, narration explaining what the scene showed:
  "That was not a good enough answer, and she knew it" (scene 2, two
  judges); stakes restated in scene 3 (two); scene 4's "A god is where the
  light is kept" was one judge's worst and another's best.

## Remaining issues

Round 5 is the last round, so the reading's remaining issues are recorded as
follow-up work, not a fix increment; see `docs/rounds/README.md` and the
backlog issues it lists.
