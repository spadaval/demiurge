---
created_at: "2026-11-05T06:28:35.465870799+00:00"
id: "worldcrafter-x2ij"
issue_type: "task"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-wtiz"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Writer and story-so-far runner"
updated_at: "2026-11-05T06:47:53.458076513+00:00"
---

## Goal

A script that runs one round: a fresh sandboxed Opus 5.5 writer session using the story CLI and skill builds a world and a novel-scale outline (roughly 25 to 40 chapters' worth of beats) in the model on the round's prompt; the orchestrator then picks four points; the writer writes four scenes of about 1,200 to 2,000 words; a separate fresh agent writes a 300-to-500-word story so far for each scene from the outline, in plain prose with no tool vocabulary.

## Done when

- Reuses app/scripts/comparison/sandbox.ts and the transcript check; the writer gets the CLI built from the working tree at a recorded commit, SKILL.md and craft.md; credentials are mounted read-only and the token is refreshed only on the host.
- Phases can run separately (outline; scenes given the chosen points; story so far), so the orchestrator chooses points between them, and the point choices with how each was chosen are recorded in the round directory.
- The same writer writes the scenes: after the orchestrator picks the points, the outline session is resumed (its session state is kept in the round directory, not in the host's ~/.claude) and asked for the four scenes, one at a time in story order, each given its point. So the scene writer has its outline-building context, the model, and the scenes it has already written. Its prose is stored separately from the model. If resuming proves impossible in the sandbox, the runner records why and falls back to fresh scene sessions that see the model, the earlier scenes and their point, and the orchestrator records that as a deviation on decision worldcrafter-jeue.
- Every judge-facing text, the scenes as well as the story so far, is checked for tool vocabulary (record kinds, refs, command names) and any hit is reported before judging.
- The story-so-far agent sees the outline only up to its scene.
- Outputs go under /home/supadava/projects/demiurge-world/round-<n>/ (outside the repo): transcripts, the model, scenes, story-so-far texts, run.json with model, Claude Code version and commit.
- Tests for the non-session parts; bun run check passes; a cheap smoke on a throwaway premise; independently reviewed and merged locally.

## Notes

- 2026-11-05 [note] From review finding worldcrafter-8och: the comparison harness prompts (app/scripts/comparison/prompts.ts:60,64,70) tell the writer to keep render's readable form to ~1,500 words and comparison.ts:472 treats render as the story. The round runner must not reuse those prompts or packets; judges get only scene prose and the story so far.
