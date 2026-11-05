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

If `STORY_CLI` is unset, stop and report that it is missing. Read `--help` once before you start; it
is the reference for every command and the ref format (`actor:mara`,
`candidate:who-wrote/ferryman`).

Keep the story file, `story.json` unless you were told otherwise, in the git
repository you're working in. Each edit is checked and written only if it
succeeds; a refused edit says why, so fix it and run it again. Add a record
before linking to it.

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

Each command sets that kind of link for the scene; `none` clears it. Any
record or candidate can be linked. `show scene:<id>` lists a scene's links,
and `scenes <ref>` lists, in telling order, every scene that touches a
record and how: who is in it, what it depicts or pressures, which reader
questions it opens or answers, and what it reveals, implies or withholds.
Before writing a scene, check what the scenes before it have already
revealed; after changing a record, `scenes <ref>` shows whose prose to
reread.

## How the craft maps onto it

- **Put things down** with the `add-` commands. An actor, drive, event, fact
  or scene can sit with nothing linked to it.
- **Open questions** are `add-open-question`, with several `add-candidate`
  answers. Give each candidate the records it would bring in with
  `--touches`, then **try it** with `touches candidate:<question>/<id>`.
  Choose an answer with `answer-open-question` once a satisfying one has
  emerged, then make what it implies with other commands.
- **Weigh in the file, not in your head.** When you rule a candidate out,
  say why with `reject-candidate who-wrote keeper --reason "He died before
  the wreck"` rather than removing it: the candidate and its reason stay in
  the file, and `show` and `render` list it as ruled out. `--undo` puts it
  back in the running, and choosing it as the answer does too.
- **Where a question stands.** `show open-question:who-wrote` prints its
  state, and `render` groups questions by it:
  - *undecided*: no answer chosen yet. This is your task.
  - *decided, not revealed yet*: you know the answer and no scene has told
    the reader.
  - *left open for the reader*: `leave-for-reader who-wrote --reason "..."`
    says the story never answers it, whether or not you have; `--undo`
    takes the mark off.
  - *revealed in scene X*: the first scene, in telling order, whose
    `set-scene-links ... reveals` names the question or its chosen
    candidate.

  Only undecided questions are prompts in `gaps`. A decided question no
  scene reveals, or one left open, is a normal place to rest: a story leaves
  most of its questions unanswered on the page, and nothing reports that as
  a problem. The same goes for a reader question no scene answers.
- **Re-answering keeps the history.** Choosing a different candidate, or
  `unanswer-open-question`, keeps the old answer as superseded, with what
  replaced it. `show open-question:who-wrote` lists that history, and
  `render` prints only the current answer. So rework an answer by answering
  again; don't delete the question or its other candidates.
- **Who knows what, and the versions people tell.** An event's summary is
  what really happened. What someone says happened is a version beside it:
  `add-version fog wreck "The fog took her; nobody could have saved her"
  --by ivo`. Hold as many versions of an event as there are tellers, whether
  true, partial or lies. What a character knows or believes, from a point in
  story time, is knowledge: `add-knowledge mara-fog mara believes
  version:fog --since wreck --until letter`. It can be of a fact, a version,
  an event or a candidate answer. Without `--since` it holds from the start,
  and without `--until` it never stops. Times are events, so a belief starts
  and ends with what happens. `show actor:mara` lists what she knows or
  believes, and `show event:wreck` lists its versions. Removing a record
  takes with it the versions and knowledge that depend on it: an event's
  versions, an actor's knowledge, and anyone's knowledge of the record. The
  edit lists them under "Also removed", so rework by updating rather than
  removing when the account or belief is still true. Knowledge that ends
  before it starts is kept and reported by `contradictions`.
- **Telling order is not true order.** A scene tells the reader something by
  revealing or implying it: the fact, a version (the reader may believe a
  lie for a while), or the knowledge itself (`set-scene-links docks reveals
  knowledge:mara-fog` tells the reader that Mara believes it). `reader-order`
  lists each scene in telling order with what it shows, reveals, implies or
  withholds and when that is in story time. Then it lists the events in
  story order with the first scene that tells the reader of each, through
  the event itself, a version of it or someone's knowledge of it, and when
  each character's knowledge starts. Use it to plan what the reader learns
  when, and to check a scene doesn't give away what a later scene reveals.
- **Causes.** When one event happened because of another, record it with
  `add-cause wreck letter` (the wreck caused the letter). Positions and
  constraints only say what comes first; a cause says why. `render` says
  "because of", `touches` follows causes both ways, and a move that puts an
  effect before its cause, or a circle of causes, is kept and reported by
  `contradictions`.
- **Contradictions are kept.** A timeline edit that makes events contradict
  each other is saved and the problem printed. A clash that isn't about time
  can be an open question with `--conflict`.
- **Rework** a motive with `update-drive` or `set-drive-origins`, an event
  with `describe-event`, `set-position` or `constrain`, and see what it
  reaches with `touches`. A want that changes over the story can be two
  drives with different origins.
- **Find the text a change left behind with `mentions`.** `touches` sees only
  declared links. Summaries, stakes, notes, facts and candidates can still
  state the old version in words: a name, a year, "ten years ago", "since
  spring". After `set-position`, `describe-event`, `update-drive` or
  `update-actor`, the CLI prints the free text that mentions the changed
  record under "Free text that mentions ... may still state the old
  version". Read it and fix what is now wrong; nothing is rewritten for you.
  After other changes, such as answering a question that changes what
  someone did, run `mentions event:wreck` (or `actor:`, `drive:` and so on)
  yourself on what the change reaches. `mentions` doesn't read prose files;
  `scenes <ref>` lists the scenes whose prose may need rereading.
- **`gaps` is advisory: optional prompts, never a reason to delete.** Run it
  now and then to see where you could add a link or a record, and act only on
  what is worth acting on. Never cut, merge or unlink anything true to clear
  a gap: a minor character with no drive, an event or fact that nothing else
  refers to, and a want nobody opposes all belong in the bible if they are
  true of the world. `contradictions` is the same: prompts, not a to-do list.
  When a gap is a choice and you want it out of the list, say so: each gap
  ends with a `[gap ref]` to paste into `mark-gap-deliberate
  drive-without-origin drive:keep-quiet --reason "He has always kept his own
  counsel"`. The mark and its reason stay in the story file, and `gaps`
  stops listing it. Mark only what you have decided, not what you haven't
  got to yet.
- **Read the whole bible with `render`**, which prints it as text with no
  IDs, for you to check what it holds and how it hangs together. It is not
  the story and no reader sees it. It says each thing once: a want in full
  under its holder, and briefly elsewhere; a relation once; a constraint
  only when the positions don't already show it; a decided question as its
  answer alone; and each scene's links after the scene.

## The model gaps log

Keep `model-gaps.md` beside the story file. Whenever you want to hold
something the story file can't hold, or can hold only awkwardly, write down
what it was, what you did instead, and why that fell short. Keep logging
even when the workaround is fine. This log is how the tool's model gets
judged, so it matters as much as the story.

## Commit as you go

Commit the story file, the scene files and `model-gaps.md` after each
meaningful change, in the git repository that holds the story, with a
message that says what changed in the story ("The ferryman wrote the letter", not "update
story.json").
