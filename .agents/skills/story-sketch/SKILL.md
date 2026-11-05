---
name: story-sketch
description: Mechanics for building a story's world and outline in a typed story file with the Demiurge story CLI, the author's bible, kept apart from the prose. Use when asked to sketch, outline or rework a story in a story file, or to write scenes from one.
---

# Sketching a story

Read `craft.md`, beside this file, first. It is the advice on how to find a
story. This file adds only the mechanics of holding one in a story file.

## The tool

The CLI is a single script whose path is in the `STORY_CLI` environment
variable, so it works from any directory:

```sh
bun "$STORY_CLI" --help                     # every command, with an example
bun "$STORY_CLI" story.json init "<premise>"
bun "$STORY_CLI" story.json <command> [arguments]
```

If `STORY_CLI` is unset, stop and report that it is missing. Read `--help`
once before you start; it is the reference for every command and the ref
format (`actor:mara`, `candidate:who-wrote/ferryman`).

Keep the story file, `story.json` unless you were told otherwise, in the git
repository you're working in. Each edit is checked and written only if it
succeeds; a refused edit says why, so fix it and run it again. Add a record
before linking to it. An edit that succeeds prints nothing unless there is
something to read: a contradiction it kept, records it removed with the one
you named, scene links it dropped, or what may still state a record's old
version. So read whatever an edit prints, and don't filter the output, even
in a long batch.

## The bible and the prose

The story file is your bible: the world, the people, what happened and why,
what you have and haven't decided. It is for you alone. No reader sees it,
and nobody judges the story by it, so it has no length to keep to: put down
everything that is true of the world, however much, and never cut a true
record or link to make it shorter. Drives, causes and open questions don't
have to appear in the prose.

The story is the prose, and each scene's prose lives in its own file,
`scenes/<scene-id>.md` beside the story file. `show scene:<id>` prints the
path and how many words are there so far. Write the prose there with your
ordinary file tools, never in a scene's `--summary` or any other field of the
story file; a summary is your note on what the scene does. Git keeps earlier
drafts, so rewrite in place and commit.

Say what each scene does with the bible:

- `set-scene-links storm reveals fact:seen-ashore candidate:who-wrote/ferryman`:
  what the scene tells the reader outright.
- `set-scene-links storm implies event:wreck`: what a reader can infer from
  it without being told.
- `set-scene-links storm withholds drive:keep-quiet`: what it keeps back
  where a reader would expect to learn it.
- `set-scene-links storm plants object:knife` and `set-scene-links duel
  pays-off object:knife`: what it sets up to matter later, and what it
  brings back. Use them for a setup and its payoff, usually a thing (`add-object
  knife "Doran's knife"`; `show object:knife` lists both ends), a promise or
  a skill. A character's first and later appearances are reveals and scene
  actors, not plants, and a record a scene already reveals needs no plant
  as well unless its return is the point.
- `set-scene-viewpoint storm mara` says the scene is told through Mara's
  eyes (`none` clears it).
- `set-scene-events storm wreck` says the scene depicts the event as it
  really happened. A flashback through a false memory or a lie reveals that
  version instead (`reveals version:fog`) and doesn't depict the event.

Each command replaces that kind of link; `none` clears it, and the edit
names any ref it dropped. `--add` adds refs without retyping the list
(`set-scene-links storm plants --add object:knife`) and `--remove` takes
them off. Any record or candidate can be linked. `show scene:<id>` lists a
scene's links, and `scenes <ref>` lists, in telling order, every scene that
touches a record and how.

## Writing a scene

Before drafting, ask the bible what the reader knows by then, rather than
trusting memory:

- `reader-order --before <scene>`, read whole, never through `head` or
  `tail`: its early lines hold the setups. It lists, in short labels, what
  earlier scenes have told the reader and when each happened, what they held
  back, and each count's value as of the scene. For a scene with a
  viewpoint, it marks what the reader has been told that the viewpoint
  character doesn't know (`Mara doesn't know yet, believes version:fog`):
  the dramatic irony the scene can play on. A record is marked only when
  someone's knowledge of it is recorded and the viewpoint character doesn't
  hold it at the scene's latest event: by their own knowledge records of
  it, or, without any, by taking part in it, telling it, or being shown it
  in a scene through their eyes set before this one. So record who knows
  each secret with `add-knowledge`, or nothing is marked.
- `show` each event the scene depicts.

After drafting, and before you commit the draft, check every number and
stated time in its prose: `show count:<id>` for each number ("nearly
half", "five boats") and `span <event> <event>` for each time ("three days
since"). Then set the scene's links, and read what each edit prints.

## How the craft maps onto it

- **Put things down** with the `add-` commands. An actor, drive, event, fact
  or scene can sit with nothing linked to it.
- **Open questions** are `add-open-question`, with several `add-candidate`
  answers. Give each candidate the records it would bring in with
  `--touches`, then **try it** with `touches candidate:<question>/<id>`.
  Choose an answer with `answer-open-question` once a satisfying one has
  emerged, then make what it implies with other commands. Logging a choice
  made on the spot in one go is fine; a question you're unsure of stays
  undecided while you test its candidates.
- **Weigh in the file, not in your head.** Rule a candidate out with
  `reject-candidate who-wrote keeper --reason "He died before the wreck"`
  rather than removing it: it stays in the file with its reason. `--undo`
  puts it back in the running, and choosing it as the answer does too.
- **Where a question stands.** `show open-question:<id>` prints its state,
  and `render` gives each state its own section (`render --section
  undecided`):
  - *undecided* (`undecided`): no answer chosen yet. This is your task.
  - *decided, not revealed yet* (`decided`): you know the answer and no
    scene has told the reader.
  - *revealed in scene X* (`revealed`): the first scene, in telling order,
    whose `reveals` names the question or its chosen candidate.
  - *left open for the reader* (`left-open`): `leave-for-reader who-wrote
    --reason "..."` says the story never answers it, whether or not you
    have; `--undo` takes the mark off.

  Only undecided questions are prompts in `gaps`. A decided question no
  scene reveals, one left open, or a reader question no scene answers is a
  normal place to rest.
- **Re-answering keeps the history.** Choosing a different candidate, or
  `unanswer-open-question`, keeps the old answer as superseded, and `show`
  lists that history. So rework an answer by answering again; don't delete
  the question or its other candidates.
- **Who knows what, and the versions people tell.** An event's summary is
  what really happened. What someone says happened is a version beside it:
  `add-version fog wreck "The fog took her; nobody could have saved her"
  --by ivo`, as many as there are tellers, true, partial or lies. What a
  character knows or believes is knowledge: `add-knowledge mara-fog mara
  believes version:fog --since wreck --until letter`, of a fact, a version,
  an event or a candidate. Without `--since` it holds from the start, and
  without `--until` it never stops. `show actor:mara` lists what she knows
  or believes. Removing a record takes the versions, knowledge and parts in
  events that depend on it, and the edit lists them under "Also removed",
  so rework by updating when the account or belief is still true.
- **Telling order is not true order.** A scene tells the reader something by
  revealing or implying it: the fact, a version (the reader may believe a
  lie for a while), or the knowledge itself (`reveals knowledge:mara-fog`
  tells the reader that Mara believes it). `reader-order` lists each scene
  in telling order with what it tells and when that is in story time, then
  the events in story order with the first scene that tells the reader of
  each. Use it to plan what the reader learns when, and to check a scene
  doesn't give away what a later scene reveals.
- **Causes.** `add-cause wreck letter` says the wreck caused the letter.
  Positions and constraints only say what comes first; a cause says why.
- **Contradictions are kept.** An edit that puts events out of order, an
  effect before its cause, knowledge or a membership ending before it
  starts, or a count above its total is saved and the problem printed;
  `contradictions` lists them all. A clash that isn't about time can be an
  open question with `--conflict`.
- **Who takes part in an event.** `set-participant wreck actor:ivo --role
  "at the helm"` records who did it, who saw it, or which object was used
  (`object:knife --role "the weapon"`).
- **Who belongs to a group, and when.** A group is an actor (`add-actor crew
  "The crew" --kind organization`), and belonging to it is a membership:
  `add-membership ivo-crew ivo crew --since signs-on --until wreck`, not an
  event with a participant role. Without `--since` they always have, and
  without `--until` they never leave; someone who rejoins has a second
  membership. `show actor:ivo` lists his groups, and `show actor:crew` its
  members, each with when.
- **A drive's life.** A want can end or change: `add-drive-turn find-sender
  satisfied --at letter`, `renounced`, `replaced --into <drive>` (a new want
  takes its place) or `flipped --into <drive>` (it turns into its opposite).
  `--into` names another drive of the same holder: a character who comes to
  share someone else's want gets a new drive of their own, allied to it.
  Give the event with `--at` and a `--note`. A drive can turn more than
  once, and one with no turns is still live; `show drive:<id>` lists its
  life.
- **Time.** `set-position` takes a year (`1954`) or a date: `1954-10`,
  `1954-10-12` or `"1954-10-12 21:00"`, each the span it names, and `--end`
  makes a range. Two events on one day can be ordered with `constrain ...
  before`; `--gap` takes a unit (`3d`, `2w`, `6h`, `4mo`), give or take half
  that unit without `--tolerance`. `span <event> <event>` gives the time
  between two placed events in calendar days. Knowledge and membership
  `--since`/`--until` and turns `--at` name events, so they follow the
  events wherever they are placed.
- **Counts.** A number the plot runs on, such as hands aboard or days of
  food left, is a count, not a fact: `add-count crew "Hands aboard"
  --total 12 --direction falls`, then `set-count crew wreck 3 --note "Nine
  drowned"` at each event where it changes. A value holds until the next
  one in story order. A total that itself changes is another count (`--of
  <count>`), and `--threshold 6` or `more-than-half` marks the value that
  matters. After setting a count's series, read `show count:crew` once and
  check each value, and how far it is from the threshold, against what
  that event says: `contradictions` checks only a value above its total
  and, with `--direction`, one that moves the other way.
- **Find what a change left behind with `trace`.** After an edit that
  changes a record (`describe-event`, `set-position`, `update-drive`), the
  CLI prints the top three suspects under "What may still state the old
  ...": records and paragraphs of scene prose (`scenes/<id>.md:<line>`)
  that may now be wrong, each with why, and how many more `trace <ref>`
  would list. `trace <ref>` on its own lists everything that may depend on
  a record, likeliest first. These are suspects, not verdicts: read each,
  fix what the change made wrong, and leave the rest. `touches` (declared
  links only) and `mentions` (text naming it only) are the narrower views
  it builds on.
- **`gaps` is advisory: optional prompts, never a reason to delete.** Run it
  now and then and act only on what is worth acting on. An empty list is not
  a goal, and not a result to report: don't add links or relations just to
  clear it, and never cut, merge or unlink anything true. A minor character
  with no drive, an event nothing refers to and a want nobody opposes all
  belong in the bible if they are true. To mark a gap you have decided on,
  paste its `[gap ref]` into `mark-gap-deliberate drive-without-origin
  drive:keep-quiet --reason "He has always kept his own counsel"`, and
  `gaps` stops listing it.
- **Read the bible with `render`**, which prints it as text with no IDs.
  `render --section events,scenes` prints only those sections; `--help`
  lists the names. It says each thing once.

## The model gaps log

Keep `model-gaps.md` beside the story file. Whenever you want to hold
something the story file can't hold, or can hold only awkwardly, write down
what it was, what you did instead, and why that fell short. Keep logging
even when the workaround is fine. This log is how the tool's model gets
judged, so it matters as much as the story.

## Commit as you go

Commit the story file, the scene files and `model-gaps.md` after each
meaningful change, in the git repository that holds the story, with a
message that says what changed in the story ("The ferryman wrote the
letter", not "update story.json").
