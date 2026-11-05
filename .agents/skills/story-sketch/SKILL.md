---
name: story-sketch
description: Sketch a story from a premise, or rework one, in a story file through a command-line tool, without a UI. Use when asked to sketch, develop, outline or rework a story's characters, motives, events, scenes or open questions in a story file.
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

## How the craft maps onto it

- **Put things down** with the `add-` commands. An actor, drive, event, fact
  or scene can sit with nothing linked to it.
- **Open questions** are `add-open-question`, with several `add-candidate`
  answers. Give each candidate the records it would bring in with
  `--touches`, then **try it** with `touches candidate:<question>/<id>`.
  Choose an answer with `answer-open-question` once a satisfying one has
  emerged, then make what it implies with other commands.
- **Weigh in the file, not in your head.** While you are still weighing a
  question's candidates, mark it with `set-open-question-working who-wrote`.
  `render` then shows the question in one line and leaves its candidates
  out, so weighing costs no words in the readable form. Answering clears the
  mark; `--stop` clears it without answering. An answered question can't be
  marked working: unanswer it first.
- **Re-answering keeps the history.** Choosing a different candidate, or
  `unanswer-open-question`, keeps the old answer as superseded, with what
  replaced it. `show open-question:who-wrote` lists that history, and
  `render` prints only the current answer. So rework an answer by answering
  again; don't delete the question or its other candidates, which cost no
  words once the question is decided.
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
  yourself on what the change reaches.
- **`gaps` and `contradictions` are prompts, not a to-do list.** Run them now
  and then to see what isn't woven in yet or still pulls against itself, and
  act on what is worth acting on. When a gap is a choice, say so: each gap
  ends with a `[gap ref]` to paste into `mark-gap-deliberate
  drive-without-origin drive:keep-quiet --reason "He has always kept his own
  counsel"`. The mark and its reason stay in the story file, and `gaps`
  stops listing it. Mark only what you have decided, not what you haven't
  got to yet.
- **Check length and readability with `render`**, which prints the whole
  story as text with no IDs and a word count. It is how the story will be
  read. It says each thing once: a want in full under its holder, and
  briefly elsewhere; a relation once; a constraint only when the positions
  don't already show it; a decided question as its answer alone. Links cost
  few words, so cut story, not true links, when you are over length.

## The model gaps log

Keep `model-gaps.md` beside the story file. Whenever you want to hold
something the story file can't hold, or can hold only awkwardly, write down
what it was, what you did instead, and why that fell short. Keep logging
even when the workaround is fine. This log is how the tool's model gets
judged, so it matters as much as the story.

## Commit as you go

Commit the story file and `model-gaps.md` after each meaningful change, in
the git repository that holds the story, with a message that says what
changed in the story ("The ferryman wrote the letter", not "update
story.json").
