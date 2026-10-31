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
status: "todo"
title: "Run the blind comparison: tool against plain notes"
updated_at: "2026-10-31T02:17:08.992731795+00:00"
---

## Goal

Produce what the human needs to judge, without knowing which arm made what, whether the tool beats plain notes.

## Done when

- The tool, skill and prompts are frozen at a recorded commit before any held-back premise is run.
- For each of the two premises, two fresh sessions use the tool and skill and two use plain markdown notes, all on the same model and with the same task prompt apart from the tool: (1) sketch the story and make sure it has what it needs to be interesting before drafting; (2) rework a core motivation of the main character, or an event behind it, and follow through; (3) draft one scene the rework affects, about 1,000 words. That's eight runs. The drafts are scratch and aren't stored in the model.
- Each run is written up by a script as a packet in the same layout: the sketch as readable text (rendered from the file for tool runs), what the rework changed, and the scene. Nothing in a packet reveals its arm: no tool commands, IDs or file formats. Packets are shuffled and numbered, and the key is written to a file the human doesn't need to open.
- The handoff gives the path to the packets and the key, each run's model and commit, each tool run's `model-gaps.md`, and anything that went wrong in a run. Failed runs are reported and aren't quietly rerun.

## Scope

The agent running this doesn't judge the packets or tell the human which it prefers. Thukker may be used informally while building the tool; the magical girl therapist premise isn't used by anyone until the tool is frozen.

## Context

Premises, as given by Sumeet on 2026-10-30:

**Thukker (used to build the tool).** Fanfiction of EVE Online. An orphan is adopted by the Thukker tribe, grows up with them, eventually leaves and ends up in Syndicate space. There he runs into a Caldari girl who is there for similar reasons. Hijinks ensue, they decide to work together, and they track down her sister, who turns out to have been fused into a Titan-class ship (as in Homeworld). They then go gallivanting off, build a small armada and unravel a few conspiracies along the way. The Jovians were involved, somehow. Why he left the Thukker, who the girl's family is, what his background is and what he's looking for are all open.

**Magical girl therapist (held back).** A story about a "magical girl therapist". That phrase is all Sumeet gave, and the premise stays that short, including its ambiguity.

Lore accuracy isn't graded unless it makes the story worse.
