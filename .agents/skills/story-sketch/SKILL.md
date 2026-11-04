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
  `touches` reports the links that are declared, plus one step further. It
  can't see what free text only mentions, so declare a link when it matters.
  Choose an answer with `answer-open-question` once a satisfying one has
  emerged, then make what it implies with other commands.
- **Contradictions are kept.** A timeline edit that makes events contradict
  each other is saved and the problem printed. A clash that isn't about time
  can be an open question with `--conflict`.
- **Rework** a motive with `update-drive` or `set-drive-origins`, an event
  with `describe-event`, `set-position` or `constrain`, and see what it
  reaches with `touches`. A want that changes over the story can be two
  drives with different origins.
- **`gaps` and `contradictions` are prompts, not a to-do list.** Run them now
  and then to see what isn't woven in yet or still pulls against itself, and
  act on what is worth acting on.
- **Check length and readability with `render`**, which prints the whole
  story as text with no IDs and a word count. It is how the story will be
  read.

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
