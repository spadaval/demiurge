# Round 1 log (worldcrafter-xzee)

Mission worldcrafter-gwx3, decision worldcrafter-jeue, strategy
`docs/strategies/world-demo.md`. Scores are per judge and indicative only.

Round directory (outside the repo): `/home/supadava/projects/demiurge-world/round-1/`.
Copies kept here: `round-1/scores.md` (every judge's scores and quotes, with
quote verification), `round-1/reading.md` (the transcript reading),
`round-1/beats.md` (the 37-beat outline), `round-1/points.json`.

## Tool changes before this round (Round 0)

Each independently reviewed and merged locally, in Sumeet's order:

1. **Bible separate from prose** (worldcrafter-7coc, wtiz): no word budget on
   `render`; scene prose in `scenes/<id>.md`; scenes link what they reveal,
   imply or withhold; `scenes <ref>`.
2. **Open-question states** (r26d): undecided, decided not revealed, left open
   for the reader, revealed in scene X; `reject-candidate` keeps reasons.
3. **Advisory gaps** (wefn): actor-without-drive dropped; gaps framed as
   optional prompts.
4. **Knowledge and belief** (6m2v): versions of events, who knows or believes
   what from when, `reader-order`.
5. **Objects, participants, drive life, finer time** (j6z1).
6. **Change tracing on content** (s2mz): `trace`, and suspects printed after
   each edit.

Harness: rubric `docs/verdicts/world-demo-rubric.md` (blvm), four-judge
scene panel with sandboxed headless Grok (w716), round runner (x2ij).

## The run

- Writer: claude-opus-5-5, Claude Code 2.1.318, CLI built from e05fecd6.
  Outline 943 s (44 turns, $3.47); four scenes in the resumed session,
  100–123 s each (session total about $5.23). No check problems; credentials
  unchanged.
- Outline: 37 beats; 25 actors, 51 facts, 66 events (all dated), 28 drives
  with 22 turns, 13 versions, 47 knowledge records, 8 objects, 11 open
  questions (9 answered, 2 left for the reader, 22 rejected candidates with
  reasons), 13 reader questions, 37 scenes with 108 reveals, 29 plants and 34
  pays-off.
- Points (`points.json`): chosen by the orchestrator, **19 the-witness**
  (reveal) and **31 one-exact-act** (cost paid); random, **4 coldharbour**
  (seed 20261105) and **1 punch-or-fire** (seed 20261106). Scene numbers
  below are telling order: 1 punch-or-fire, 2 coldharbour, 3 the-witness,
  4 one-exact-act. Both random draws fell early and nothing was drawn from
  beats 20–30; kept as drawn. From Round 2 the random points are drawn one
  from each half of the arc.
- Scenes: 1,942, 1,944, 1,919, 1,700 words. Story so far: scene 1 opens the
  story ("Nothing yet"), then 428, 613 and 622 words; the last two are over
  "about 300–500". Each story so far used the outline as it stood after all
  four scenes (finding worldcrafter-zm9p). Vocabulary check: no hits.

## How the writer used the tool

From `round-1/reading.md`, which cites every claim:

- **Used heavily:** about 1,110 CLI calls batched into 40 shell calls through
  wrapper functions; every record kind; scene links set and updated after
  every scene; the model updated after each scene to match the prose.
- **Silenced the CLI.** The first batch printed 19 change-trace blocks for
  events being placed for the first time. From then on, every command went
  through a filter that showed only refusals and contradictions. The six real
  traces the run produced, several flagging scene prose to reread, were never
  seen. Fix 6 effectively didn't reach the writer.
- **Ignored:** `trace`, `touches`, `mentions`, `scenes`, `constrain`,
  `move-scene`; `reader-order` read once, truncated; `render` read only in
  slices (470 lines, 119 KB). Open questions were created, answered and their
  other candidates rejected in the same call: a decision log, not a
  workspace.
- **Friction:** `gaps` still pushed ritual linking (27 of 39 prompts were
  `fact-unconnected`, followed by 41 `--about` edits and some contrived drive
  relations). Date ranges printed as fractional years. `set-scene-links`
  replaces the whole list. `update-event` doesn't exist (the one real refusal).
- **Errors in the prose the model couldn't catch:** the Ledger's arithmetic
  (488 + 8 is exactly half of 992, not more), the patron count on day one,
  Brindle's sale dated two years before he disappears, a 27-day span written
  as 26. The writer logged wanting counts over time, point of view and
  presence, group membership over time, and quoted lines.
- **In the scene phase** it consulted the model only with `show`, and relied
  on the outline still in its context.

## Scores

Overall and per criterion, per judge (1–10). Full evidence quotes are in
`round-1/scores.md`.

| scene | judge | pacing | intrigue | subtext | character | prose/voice | tone/humour | world aliveness | continuity | overall |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 punch-or-fire | opus | 8 | 8 | 7 | 8 | 8 | 9 | 8 | 7 | 8 |
| | sonnet | 8 | 8 | 6 | 8 | 8 | 9 | 8 | 6 | 8 |
| | fable | 8 | 8 | 7 | 8 | 8 | 9 | 8 | 8 | 8 |
| | grok | 7 | 8 | 6 | 8 | 8 | 8 | 8 | 8 | 8 |
| 2 coldharbour | opus | 8 | 8 | 7 | 8 | 8 | 8 | 8 | 9 | 8 |
| | sonnet | 8 | 9 | 8 | 8 | 8 | 8 | 8 | 9 | 8 |
| | fable | 8 | 9 | 7 | 8 | 9 | 8 | 8 | 9 | 9 |
| | grok | 9 | 9 | 8 | 9 | 9 | 8 | 8 | 9 | 9 |
| 3 the-witness | opus | 8 | 8 | 7 | 8 | 8 | 8 | 7 | 9 | 8 |
| | sonnet | 8 | 8 | 8 | 9 | 8 | 8 | 8 | 9 | 9 |
| | fable | 8 | 8 | 7 | 8 | 8 | 8 | 7 | 8 | 8 |
| | grok | 8 | 8 | 7 | 8 | 8 | 8 | 8 | 8 | 8 |
| 4 one-exact-act | opus | 8 | 9 | 7 | 8 | 8 | 7 | 8 | 9 | 8 |
| | sonnet | 8 | 9 | 7 | 8 | 8 | 8 | 8 | 9 | 8 |
| | fable | 9 | 9 | 8 | 9 | 8 | 8 | 8 | 9 | 9 |
| | grok | 9 | 9 | 8 | 9 | 9 | 9 | 9 | 9 | 9 |

### World aliveness: what the judges cited

All sixteen scores are 7–9. Every judge cited institutional and economic
texture, not exposition:

- Scene 1: "Pennyfold tin, a hole punched through the middle and the face
  rubbed off by sixty years of thumbs" (opus); "The bounty is nine crowns.
  Less the reeve's tenth" (fable, sonnet); "Vigilant's grey ... a silver disc
  with a single open eye" (grok).
- Scene 2: "He said it the way a clerk says the name of the house he works
  for, without love. 'It's a living.'" (opus); "Pensioned. Fed every day,
  looked after" (fable, sonnet); "dressed as millers, in floury aprons, and
  they were the wrong shape for their clothes" (grok).
- Scene 3: "A Vigilant who holds a part in a warlock's pact is an apostate.
  She is stripped of her eye and turned out." (fable, sonnet); "drew the
  circle in ink with a baster, because it was what there was" (grok); opus
  and fable gave their lowest world score here (7).
- Scene 4: "There is a standing offer ... The Ledger's broker made it in
  Thawmonth" (opus, sonnet); "Of nine hundred and ninety-two, since the
  bridge-ghost was so careless as to stop existing" (fable); "Nine parts ...
  at the standing price" (grok, 9).

### Best and worst moments

- **Best**, by agreement: scene 1, "a woman lying in a bog, thanking nobody"
  (all four); scene 3, "At least you two have that in common. Neither of you
  ever says anything." (opus, grok); scene 4, "I find I have been owing you
  change." (sonnet, fable).
- **Worst:** 13 of 16 name a place where the narration or a character
  explains what the scene has already shown: the rules paragraph mid-fight
  (scene 1, three judges), Lucan's "She's buying you. Piece by piece" (scene 2,
  two), the Notary's epigram (scene 3, two). Subtext was the lowest
  criterion (6–8).

### Panel notes

- All 16 runs succeeded first time; Grok ran sandboxed headless (345–443 s a
  scene).
- Sonnet put its reasons inside the evidence strings, so its quotes fail
  verification ("NOT IN SCENE") although the reports parse. Grok's were
  mostly verbatim; one was a near-quote.
- No judge noticed the arithmetic or day-count slips in scene 4.

## Fixes before Round 2

Recorded as worldcrafter-3fqq, with children b0la (CLI noise and friction,
including review finding mdk6), w2hx (counts over time; what the reader
knows before a scene; spans between events) and 1h0r (skill guidance). The
narration explaining what a scene already shows is a craft issue, not a tool
one; craft.md is left unchanged so the rounds keep measuring the tool.
Sonnet's evidence format is left as is; quote checks are reported, not
enforced.
