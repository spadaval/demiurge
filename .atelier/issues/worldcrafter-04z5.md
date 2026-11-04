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
closed_at: "2026-11-04T23:40:07.832364963+00:00"
status: "done"
title: "Run the blind comparison: tool against plain notes"
updated_at: "2026-11-04T23:40:07.832364963+00:00"
---

## Goal

Produce what the judging panel needs to judge (decision worldcrafter-zybl), as blind as is practical, whether the model beats plain notes. Both arms get the same craft advice, so the tool is the only difference.

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

The agent running this doesn't judge the packets or tell the judges which it prefers. Thukker is used to build the tool, so its results are labelled as tuned-on for the verdict; the magical girl therapist premise isn't used by anyone until the tool is frozen.

## Context

Premises, as given by Sumeet on 2026-10-30:

**Thukker (used to build the tool).** The text is in worldcrafter-p4zf's Context.

**Magical girl therapist (held back).** A story about a "magical girl therapist". That phrase is all Sumeet gave, and the premise stays that short, including its ambiguity.

Lore accuracy isn't graded unless it makes the story worse.

## Notes

- 2026-11-04 [decision] Rework diffs are line diffs over the readable text split one sentence per line, the same for both arms
  Reason: Review finding worldcrafter-vurd: one paragraph per line made each diff repeat nearly the whole story (smoke packets 7.5-8.9k words). Sentence lines keep it a line diff and shown identically for both arms, while showing what changed. Reversible; packet format is for Sumeet to judge at i2uz.
- 2026-11-04 [decision] Isolation is enforced with bwrap, not only by the prompt; web tools are off for both arms; the frozen tool is read-only and mounted at a neutral path
  Reason: Review findings worldcrafter-ghcr, 4zks, wrfr, pe4t: under bypassPermissions a prompt alone can't keep the notes arm from the frozen dir or keep sessions out of the repo, the public GitHub repo, or earlier runs' output.

## Close Reason

Harness in `app/scripts/comparison/` (prompts, sandbox, transcript check, packet writer, freeze/run/phase-b), reviewed over three rounds before the freeze (approval worldcrafter-37zh). Frozen at 33c2e626 into /home/supadava/projects/demiurge-comparison/frozen (FROZEN.json: commit, Claude Code 2.1.318, model claude-opus-5-5, sha256 of story.js, SKILL.md, craft.md; tool made read-only).

Phase B: 8 runs, 32 steps, all exit 0; 0 runs failed, none rerun. Packets: /home/supadava/projects/demiurge-comparison/packets (8 files, 54,001 words). Key, raw output, model-gaps logs, failures.md, phase-b.log: .../key. Evidence on this item.

Deviations and choices: sessions run under bwrap (fresh HOME with read-only OAuth credentials, empty /tmp with only the run dir, tool at /opt/story-tool for tool runs only), no web tools, `--setting-sources project,local --strict-mcp-config --disable-slash-commands`; network open for the API, so network use is detected, not blocked. Rework diffs are line diffs over one sentence per line (decision note). Packets are about twice the planned 25,000 words because reworks changed 20-50% of sentences. The transcript check flagged 7 items in 5 steps; all were heredoc prose or scratch files in the sandbox's own /tmp.

Smoke runs (Thukker, not part of the comparison) are in .../smoke/. The p4zf fresh-session output in the session scratchpad is unread.
