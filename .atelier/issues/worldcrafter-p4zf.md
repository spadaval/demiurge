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

- `bun app/scripts/story.ts <file> <command> ...` runs every `StoryCommand` and writes the file only if the command succeeds. It also has read commands: `show <ref>`, `list <kind>`, `touches <ref>`, `gaps`, `contradictions`. `--help` lists every command with an example. Errors go to stderr with a non-zero exit. A command that adds a timeline problem succeeds, prints the problem and exits zero.
- A test runs the CLI as a subprocess in a temporary directory and goes from an empty story to a sketch with an open question, tries a candidate with `touches`, reworks a drive, keeps a conflicting event move, and reads it all back from the file.
- `skills/story-sketch/SKILL.md` tells an agent how to work: start anywhere from the premise; put down what seems interesting even if it isn't connected yet; hold what isn't decided as open questions with several candidates; try candidates with `touches`; run `gaps` and `contradictions` as prompts and not as a to-do list; leave contradictions in place until there's a satisfying way through; keep a log of anything the model couldn't hold, in `model-gaps.md` beside the story; commit after each meaningful change. It also says the agent may reason beyond the model.
- A fresh agent session given only the skill and the Thukker premise (worldcrafter-04z5, Context) produces a story file that parses, with at least one candidate tried, and a `model-gaps.md`. This checks that the skill can be followed; it says nothing about quality. The session's output is kept in the handoff.
- `bun run check` passes.

## Scope

A thin wrapper: the logic lives in `app/src/story/`. No MCP server, no daemon, no prose commands. Argument style is open, as long as `--help` is enough for a fresh agent to use it.

## Context

`app/scripts/` already holds runnable `bun` scripts. Queries from worldcrafter-33qr.
