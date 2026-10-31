---
created_at: "2026-10-31T02:17:08.958844667+00:00"
id: "worldcrafter-p4zf"
issue_type: "task"
labels:
- "story-model"
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-33qr"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "A CLI and skill for sketching and reworking a story"
updated_at: "2026-10-31T02:17:08.958844667+00:00"
---

## Goal

An agent in an ordinary session, or a person at a terminal, can sketch and rework a story with no UI.

## Done when

- `bun app/scripts/story.ts <file> <command> ...` has `init <premise>` and runs every `StoryCommand` and writes the file only if the command succeeds. It also has read commands: `show <ref>`, `list <kind>`, `touches <ref>`, `gaps`, `contradictions`, and `render`, which prints the whole story as readable text with no IDs, followed by a word count. `--help` lists every command with an example. Errors go to stderr with a non-zero exit. A command that adds a timeline problem succeeds, prints the problem and exits zero.
- A test runs the CLI as a subprocess in a temporary directory and goes from an empty story to a sketch with an open question, tries a candidate with `touches`, reworks a drive, keeps a conflicting event move, and reads it all back from the file.
- `.agents/skills/story-sketch/craft.md` is advice that doesn't mention the tool, and the blind comparison gives it to both arms: start anywhere from the premise; jump between levels and sides; put down what seems interesting even if it isn't connected yet; hold what isn't decided as open questions with several candidates, and try them against the rest of the story; keep contradictions until there's a satisfying way through; make sure the story has what it needs to be interesting; rework freely. An agent may reason as widely as it likes.
- `.agents/skills/story-sketch/SKILL.md` points to `craft.md` and adds the mechanics: the CLI, which it names through a `STORY_CLI` environment variable so it works from any directory; trying candidates with `touches` (which reports declared connections plus one step), running `gaps` and `contradictions` as prompts and not as a to-do list, checking length with `render`, keeping a log of anything the model couldn't hold in `model-gaps.md` beside the story, and committing after each meaningful change, in the git repository holding the story.
- A fresh agent session, in an empty temporary git repository outside this one, given only the skill's path and the Thukker premise below, produces a story file that parses, with at least one candidate tried, and a `model-gaps.md`. This checks that the skill can be followed; it says nothing about quality. The output's path goes in the handoff, marked as not for Sumeet to read, because they read the comparison later.
- `bun run check` passes.

## Scope

A thin wrapper: the logic lives in `app/src/story/`. No MCP server, no daemon, no prose commands. Argument style is open, as long as `--help` is enough for a fresh agent to use it.

## Context

`app/scripts/` already holds runnable `bun` scripts. Queries from worldcrafter-33qr. Thukker premise: fanfiction of EVE Online. An orphan is adopted by the Thukker tribe, grows up with them, eventually leaves and ends up in Syndicate space. There he runs into a Caldari girl who is there for similar reasons. Hijinks ensue, they decide to work together, and they track down her sister, who turns out to have been fused into a Titan-class ship (as in Homeworld). They then go gallivanting off, build a small armada and unravel a few conspiracies along the way. The Jovians were involved, somehow. Why he left the Thukker, who the girl's family is, what his background is and what he's looking for are all open.
