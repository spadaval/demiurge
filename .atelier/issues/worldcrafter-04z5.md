---
created_at: "2026-10-31T02:17:08.992731795+00:00"
id: "worldcrafter-04z5"
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
    id: "worldcrafter-p4zf"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
status: "in_progress"
title: "Run the blind comparison: tool against plain notes"
updated_at: "2026-11-04T21:24:17.258220249+00:00"
---

## Goal

Produce what the human needs to judge, as blind as is practical, whether the model beats plain notes. Both arms get the same craft advice, so the tool is the only difference.

## Done when

- The CLI, skill, `craft.md`, prompts and packet script are frozen at a recorded commit before the held-back premise is run. Freezing copies `craft.md` and the skill, and builds the CLI into a single file (for example with `bun build --target=bun`), into a directory outside this repository, and sets `STORY_CLI` to it. It also records the exact `claude -p` flags or settings that keep user-level skills, memory and hooks out of the runs, and how the runs authenticate.
- For each of the two premises, two runs use the tool and two use plain markdown notes, all on the same model: eight runs. Each run has four steps, each a fresh `claude -p` session (or the equivalent) that sees only the prompt, `craft.md`, for tool runs the skill and CLI path, and what the run has saved so far:
  1. Sketch the story from the premise, make sure it has what it needs to be interesting before drafting, and settle open questions where a satisfying answer has emerged. Keep the readable form to about 1,500 words (tool runs check this with `render`).
  2. Change a core motivation of the main character or an event behind it, and follow it through.
  3. Shift a significant event earlier or later in the story's timeline, and follow it through.
  4. Draft one scene these changes affect, about 800 words. The draft is scratch and isn't stored in the model.
- Each run works in its own new temporary git repository outside this one, and no session reads this repository. Both arms get `craft.md` inlined in their prompt, and notes runs have no access to the frozen directory. The run's transcript is checked for reads outside its own directory, plus the frozen directory for tool runs only, and any are reported. Sessions are told not to name tools or commands in anything they write for the reader.
- A script snapshots the saved work after every step and writes each run up as a packet in the same order: the step 1 sketch as readable text (tool runs through `render`; notes runs as written); for each rework, a line diff of the readable text before and after, shown the same way for both arms, with a sentence or two from the session that did it; and the scene. Anything over length is shown in full and not truncated. Blinding is partial and that's accepted (Sumeet, 2026-10-30): a reader may be able to tell the arms apart by format. Each premise's packets are randomly paired, one from each arm, and numbered.
- The key and the raw output are written to a separate directory. The handoff gives the paths, each run's model and the frozen commit, and says how many runs failed. Failed runs aren't quietly rerun. Model-gaps logs and notes on what went wrong go behind the key, so nothing ties a packet to its arm before it's opened.

## Scope

The agent running this doesn't judge the packets or tell the human which it prefers. Thukker is used to build the tool, so its results are labelled as tuned-on for the verdict; the magical girl therapist premise isn't used by anyone until the tool is frozen.

## Context

Premises, as given by Sumeet on 2026-10-30:

**Thukker (used to build the tool).** The text is in worldcrafter-p4zf's Context.

**Magical girl therapist (held back).** A story about a "magical girl therapist". That phrase is all Sumeet gave, and the premise stays that short, including its ambiguity.

Lore accuracy isn't graded unless it makes the story worse.
