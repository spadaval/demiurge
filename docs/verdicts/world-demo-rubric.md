# Rubric: one scene and its story so far (worldcrafter-blvm)

The rubric each judge in mission worldcrafter-gwx3 (`docs/strategies/world-demo.md`,
decision worldcrafter-jeue) scores one scene against. Fixed before any judge
reads anything, and not changed once judging starts. A change after that is a
new rubric file, and scores under the two aren't compared.

Judges get only the span from "## What you're judging" up to, not including,
"## Part 2", the cut `rubricFor(rubric, "part1")` in
`app/scripts/judging/panel.ts` makes. Nothing in that span names Demiurge, the
process, the rounds, the other judges or who wrote the scene. Part 2 is for
the people running the panel.

## What you're judging

You have two files: a **scene** of about 1,200 to 2,000 words from a longer
story, and the **story so far**, a short summary of what happened before it.
The story grows from this premise:

> "Wait. Let me get this straight. You are a warlock that doesn't have a
> single patron, but hundreds of lesser patrons all watching you at the same
> time? And... you call them 'Chat'?"

The scene may come from anywhere in the story. It doesn't have to open or
close anything; judge it as a scene in a novel, not as a short story.

### How to read

1. Read the story so far, then the whole scene, in full and in order. Don't
   skim or sample. Read nothing else.
2. The story so far is context. Every criterion except continuity scores the
   scene's own text: what the story so far says earns no credit unless the
   scene itself carries it.
3. Score each criterion below from 1 to 10 in whole numbers. The anchors at
   2, 5 and 8 are fixed points; a 1 is worse than the 2 anchor, a 10 is
   better than the 8 anchor and rare, and the numbers between fall between
   anchors. Score the page, not its potential or effort, and score each
   criterion on its own.
4. For each criterion, quote one short line from the scene (at most about 25
   words, verbatim) that best shows why you gave that score. It can show a
   strength or a weakness. Where a score is low because something is missing,
   quote the line where you most felt its absence.

### Criteria

**Pacing.** Does each beat earn its space, and does the scene turn? A quiet
scene can score 8 if its change is internal or in what someone understands.
- 8: Every beat carries weight; tension builds and releases under control;
  something has changed by the end.
- 5: It mostly moves, but sags or rushes in places, or some beats repeat
  what others already did.
- 2: It stalls or skips its important beats; nothing has changed by the end.

**Intrigue.** Does it make you want the next scene?
- 8: It leaves specific questions or stakes you want answered now.
- 5: You'd read on, but the questions are vague or the next turn is
  predictable.
- 2: Nothing left open matters; no reason to continue.

**Subtext.** What's meant but unsaid.
- 8: Important things travel through what characters avoid, misread, joke
  past or do instead; you understand more than anyone says, and the scene
  doesn't explain it afterwards.
- 5: Some, but characters often state feelings and motives outright, or the
  narration explains what a line meant.
- 2: Everything is on the nose.

**Character.** Motive, interiority, distinct voices. Judge distinct voices
only where more than one character speaks.
- 8: Wants are clear and pursued under pressure; inner life shows in choices
  and noticing, not only in being told; you could tell the speakers apart
  without tags.
- 5: Motives are legible but simple; interiority is mostly stated; some
  voices blend.
- 2: Characters are functions of the plot; voices are interchangeable;
  actions lack motive.

**Prose and voice.**
- 8: Precise and controlled, with a distinctive narrative voice; sentences
  vary with purpose; few clichés.
- 5: Clean and readable but generic; some clichés, filler or overwriting.
- 2: Clumsy, flat or purple; clichés or errors keep pulling you out.

**Tone and humour fit for this premise.** The premise is comic and odd; does
the scene's tone suit it, and does its humour land? Humour needn't be in
every line, and a serious scene can still fit if the premise's comedy is felt
in it. Stakes needn't be high for the humour to fit; a purely comic scene can
score 8.
- 8: Humour comes out of the situation and the characters, lands, and sits
  alongside whatever stakes the scene has; the tone holds steady or shifts on purpose.
- 5: Some of it lands; some is generic or undercuts the stakes, or the scene
  is serviceable but makes little of what is funny or strange in the premise.
- 2: The tone fights the premise, or the jokes fall flat or are filler.

**World aliveness.** Does the world feel lived-in beyond the scene, through
implied history, institutions, economies, consequences of past events, and
specific texture? Credit what the scene implies through action, dialogue,
objects and what characters take for granted. Exposition and info-dumps earn
nothing here: a passage that stops to explain the world doesn't raise this
score, and invented names with no weight behind them aren't texture.
- 8: Several specific details imply a world running on its own, with prices,
  customs, rules, rivalries and aftermath the characters live inside without
  explaining; you infer far more than you are told.
- 5: A few specific touches, but mostly generic setting, or the texture
  arrives as explanation.
- 2: A stage set: nothing exists beyond what the scene needs, or the world
  comes only through info-dumps.

**Continuity with the story so far.** Judge it against the story so far only,
not against anything you'd guess about the rest of the story. New people,
places and facts are fine unless they contradict it.
- 8: Consistent with the story so far and builds on it: characters act from
  what has happened to them, and earlier events have weight here.
- 5: No real contradiction, but the scene barely connects to the story so
  far, or there is a minor slip.
- 2: It contradicts major facts or relationships from the story so far, or
  characters act as if it hadn't happened.

**Overall.** Your own holistic score from 1 to 10 for the scene as a scene in
a novel: not an average of the criteria, and you may weigh them however you
judge right.

**Best and worst moment.** The single best and the single worst moment in
the scene, each as a short verbatim quote and a sentence on why.

### Your report

Start with this block, filled in, exactly once, inside a ```` ```json ````
fence as shown. Keep exactly its keys at both levels, adding or removing none.
Replace every `0` with a whole number from 1 to 10 and every empty string with
your text; leave no string empty. Use plain JSON (no comments), and escape any
double quote inside a string as `\"`, as quoted dialogue will need.

```json
{
  "pacing": { "score": 0, "evidence": "" },
  "intrigue": { "score": 0, "evidence": "" },
  "subtext": { "score": 0, "evidence": "" },
  "character": { "score": 0, "evidence": "" },
  "prose_voice": { "score": 0, "evidence": "" },
  "tone_humour": { "score": 0, "evidence": "" },
  "world_aliveness": { "score": 0, "evidence": "" },
  "continuity": { "score": 0, "evidence": "" },
  "overall": { "score": 0 },
  "best_moment": { "quote": "", "why": "" },
  "worst_moment": { "quote": "", "why": "" }
}
```

Then, in prose, one to three sentences per criterion and for the overall
score on why you scored as you did. Keep it brief.

## Part 2: for the people running the panel (not shown to judges)

- **Inputs.** Each judge gets the cut above, one scene and its story so far,
  and nothing else. The premise is in the cut because "tone and humour fit for
  this premise" can't be judged without it; it is the prompt every scene grows
  from, so giving it reveals nothing about the process.
- **Results.** Scores are tabulated per judge, per scene, from the JSON block,
  with each evidence quote, the overall score and the best and worst moments.
  They are never combined into a vote or a pass or fail. Across rounds they
  are indicative only.
- **Failed reports.** A report fails unless it holds exactly one ```` ```json ````
  fenced block that parses as JSON and has exactly the template's keys at both
  levels (none missing, none added, including inside an entry), every score a
  whole number from 1 to 10, and every string non-empty. A failed report, like
  a run that reads beyond its inputs, counts as a failed run; a fresh judge on the
  same model replaces it (decision worldcrafter-zybl). An evidence quote that
  isn't in the scene is recorded as such, not corrected; quotes are compared
  to the scene after JSON unescaping and normalising quote marks and
  whitespace.
