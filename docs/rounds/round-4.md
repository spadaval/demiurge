# Round 4 log (worldcrafter-lsu3)

Mission worldcrafter-gwx3, decision worldcrafter-jeue, strategy
`docs/strategies/world-demo.md`. A fresh writer on the same prompt. Scores
are per judge and indicative only; comparisons with earlier rounds are
observations, not a measured effect.

Round directory (outside the repo): `/home/supadava/projects/demiurge-world/round-4/`.
Copies kept here, in `round-4/`: `scenes/1.md` to `4.md`, `so-far/1.md` to
`4.md`, `scores.md`, `reading.md` (compares with Rounds 1–3 throughout),
`beats.md` (37 beats), `points.json`.

## A failed first attempt

The first outline attempt (15:31Z) was killed: the round runner got SIGTERM
(exit 143) about 5 minutes in, with no record written, and its sandboxed
writer kept running as an orphan until the orchestrator stopped it. The cause
wasn't found. The partial directory is kept, unused, at
`/home/supadava/projects/demiurge-world/round-4-failed-1/`; the outline was
rerun from scratch in `round-4/` (note on lsu3). The reading confirms nothing
carried over: the round's repository starts from `init`.

## Tool changes before this round (worldcrafter-79m3)

Each reviewed (round1-fix-reviewer, approvals nyje, c72a) and merged locally:

- **Viewpoint marks** (o0s0, with fix g0qy): the viewpoint character counts
  as knowing what it takes part in, tells, and sees in its own viewpoint
  scenes; its own knowledge records, including a belief in a version, win.
  `reader-order --before` lists every telling and no longer lists revealed
  answers as held back.
- **Years as spans** (0u90, with fixes qqke, y9rq): a year covers the year;
  `--end <year>` runs through it; `span` gives ranges for year-only ends;
  counts at a ranged event say "from" its start; output polish.
- **Trace noise** (vw1u, with fix 6yvn): the batch leaves out the scene being
  written and records added earlier in it; durations count only when a move
  made them untrue; a higher bar for shared words, with a path for rare ones;
  an inserted count value that makes a later note wrong is caught.
- **Skill** (nkey): a number must count the same thing as the count; check
  earlier scenes before reusing a line; read `reader-order --before` whole in
  every scene.

## The run

- Writer: claude-opus-5-5, Claude Code 2.1.318, CLI built from 9a6220e5.
  Outline 1,150 s (40 turns, $4.03); four scenes in the resumed session,
  136–166 s each (session total about $6.93). No check problems; credentials
  unchanged within each session (the host refreshed the token between the
  failed attempt and the rerun, as designed).
- Outline: 37 beats; 34 actors, 53 facts, 80 events, 35 drives with 30
  turns, 3 counts, 17 memberships, a viewpoint on every scene, 13 versions,
  54 knowledge records, 11 objects, 11 open questions (21 rejected candidates
  with reasons), 11 reader questions.
- Points (`points.json`), under the rule recorded on lsu3 before the draws:
  chosen, **24 s24-i-did-this** (reveal: Tilly herself, ridden in her sleep,
  did the hollowings) and **33 s33-tidying** (cost paid), 9 beats apart, the
  second in beats 30–37; random, **11 s11-thread** (range 1–18, seed
  20261111) and **36 s36-queen-of-lamps** (range 19–37, seed 20261112). No
  two points are adjacent. Scene numbers below are telling order: 1 s11-thread,
  2 s24-i-did-this, 3 s33-tidying, 4 s36-queen-of-lamps.
- Scenes: 1,850, 1,907, 1,976, 1,753 words. Story so far: three first drafts
  (589, 588, 593) revised once to 485, 482, 475; scene 4's 534 first time.
  Vocabulary check: no hits.
- Panel: 16 reports. Opus's first report on scene 3 had a JSON block that
  didn't parse and was replaced by a fresh Opus judge, run 2
  (`judging/3/opus-failed-1/`). 31 evidence quotes fail verification.

## How the writer used the tool

From `round-4/reading.md`, which cites every claim:

- **The Round 3 fixes took.** `reader-order --before` was read whole before
  all four scenes (Round 3: two). Viewpoint marks are true for what the
  viewpoint character took part in, told and saw. Years worked as spans,
  with no invented dates. Of 4 inline traces, one was real and the writer
  acted on it, the first in the mission. No number in the prose counts the
  wrong thing. The writer grepped earlier scenes before reusing lines, and
  every reused line sits in the right place.
- **One continuity slip** in judged prose: scene 2 has Tilly untie her
  ribbon on the night Wick was hollowed, while scene 3 ends on Wick's last
  sight of "a red ribbon in its hair". The model had it right; the writer
  read only the events the scene depicts, not the nights it retells.
- **Opening count values came from memory.** The counts section shows each
  count at the scene's latest event, not as it opens; one drafted number
  (29 for 31) was caught by the writer, and the after-draft `show count:` was
  skipped in the two scenes whose events change counts.
- **Viewpoint marks** are still about half false in late scenes, now because
  accounts heard in someone else's viewpoint scenes, common knowledge and
  implied events don't count. The writer judged them once, then ignored them.
- **Smaller:** a record rewritten earlier in the same command line still
  shows in traces; months and year ranges are still measured start to start;
  `set-scene-pressures`, `-actors` and `-events` have no `--add`.
- **Deferred gaps:** two identities recurred a fourth time, central, with no
  cost; quoted lines held under the skill line; object state had a small
  cost (the ribbon) though the model held the right state; rules deciding
  events (the law of shares) and how knowledge was gained recur strongly
  without cost. The kept-note case (worldcrafter-mugi) didn't arise again.

## Scores

| scene | judge | pacing | intrigue | subtext | character | prose/voice | tone/humour | world aliveness | continuity | overall |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 s11-thread | opus | 8 | 9 | 7 | 8 | 8 | 5 | 9 | 8 | 8 |
| | sonnet | 8 | 8 | 8 | 8 | 8 | 5 | 9 | 9 | 8 |
| | fable | 8 | 9 | 8 | 8 | 9 | 7 | 9 | 9 | 9 |
| | grok | 8 | 8 | 7 | 8 | 8 | 8 | 8 | 9 | 8 |
| 2 s24-i-did-this | opus | 8 | 8 | 8 | 8 | 8 | 7 | 7 | 8 | 8 |
| | sonnet | 8 | 8 | 7 | 8 | 8 | 8 | 8 | 9 | 8 |
| | fable | 9 | 8 | 8 | 9 | 9 | 8 | 8 | 9 | 9 |
| | grok | 8 | 8 | 7 | 8 | 8 | 8 | 8 | 7 | 8 |
| 3 s33-tidying | opus (run 2) | 8 | 8 | 7 | 8 | 8 | 7 | 8 | 9 | 8 |
| | sonnet | 8 | 8 | 6 | 8 | 8 | 6 | 9 | 9 | 8 |
| | fable | 8 | 8 | 7 | 8 | 8 | 7 | 8 | 9 | 8 |
| | grok | 8 | 9 | 8 | 8 | 8 | 8 | 8 | 9 | 8 |
| 4 s36-queen-of-lamps | opus | 8 | 6 | 8 | 8 | 8 | 8 | 7 | 8 | 8 |
| | sonnet | 8 | 6 | 7 | 8 | 8 | 8 | 8 | 9 | 8 |
| | fable | 8 | 6 | 9 | 9 | 9 | 9 | 8 | 9 | 9 |
| | grok | 8 | 7 | 8 | 9 | 9 | 9 | 8 | 9 | 8 |

Against Rounds 1–3 (indicative only): overall 8–9 in every round; world
aliveness 7–9 here, with three 9s on scene 1, the most so far (Round 1:
one 9; Rounds 2 and 3: none). Tone and humour drops to 5 for two judges on
scene 1, a procedural scene told through a Warden's eyes. Intrigue is 6–7
on scene 4, the second-to-last beat.

### World aliveness: what the judges cited

- Scene 1: "Some of the older clerks found it touching that the Abbess's
  warlocks still carried them. Some didn't." (opus, grok); "Old Vessen
  stage-silk … Nobody's imported it in forty years." (sonnet, fable).
- Scene 2: "A canal-god from the Brede she'd known since the Sump said *I'm
  sorry, I can't* and went." (opus, grok); "the strangers who'd come for the
  girl who fed a feral god a sunset, out of other cities" (sonnet, fable).
- Scene 3: "the bell of Saint Aldo that had gone into the cannon foundry,
  ringing once from nowhere" (opus, fable); "a stone that had been worn into a
  hollow by centuries of other women's hands" (grok); "The women used to put
  a rag under it so it wouldn't rock" (sonnet, 9).
- Scene 4: "Jory Tamsett had looked at his own hands for an hour." (opus,
  grok); "The Concord's licences are suspended pending inquiry" (sonnet); "a
  well-head, a stair, the corner of a building where there had been nothing
  to look at for two hundred years" (fable).

### Best and worst moments

- **Best**, by agreement: scene 1, "They gave my mother a shoe." (fable,
  grok); scene 3, Mother Sluice's last instructions about the loose third
  step (opus, fable, grok).
- **Worst:** as in every round, narration explaining what the scene showed:
  "*Not yet* had come out instead, which was worse, because it was a promise"
  (scene 1, three judges); "*AGAIN*, said Bellwether, very softly, which from
  him meant something" (scene 2, three); "It hurt in a way she had no word
  for. It was too much love" (scene 3, three); and the list of institutional
  outcomes in scene 4 (three).
- No judge flagged the ribbon slip.

## Fixes before Round 5

Recorded as worldcrafter-qmq0: the skill on
reading the events a scene retells, not only those it depicts; count values
as the scene opens and at each change in `reader-order --before`, and the
skill's check of opening values; viewpoint marks for what the character
hears in scenes it is in and what its scenes imply; and the cheap polish
(rewritten records in traces, month and range spans, `--add` on the other
scene lists). Round 5 is the last the direction allows.
