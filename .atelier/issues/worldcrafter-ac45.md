---
created_at: "2026-11-05T00:50:24.551339850+00:00"
id: "worldcrafter-ac45"
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
    id: "worldcrafter-fax9"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T03:50:06.775989521+00:00"
status: "done"
title: "Run the second comparison on a fresh held-back premise"
updated_at: "2026-11-05T03:50:06.775989521+00:00"
---

## Goal

Produce what a judging panel needs to judge whether the changed tool beats plain notes, as in worldcrafter-04z5, with only the tool changed.

## Done when

- A fresh agent that builds nothing in this increment chooses one new premise, about as open as the first two (a phrase or a short paragraph, any genre), and writes its text to a sealed file in the new comparison root, outside the repository. A decision record names the file and its sha256, not the text. A second fresh agent that also builds nothing reviews the premise against that record before the freeze. Nobody building the tool reads it before the freeze.
- The harness from 04z5 is reused, changed only so that the held-back premise's text is read from the sealed file at run time (never committed) and replaces magical girl therapist, so the run is Thukker plus the fresh premise, and to label runs as the second comparison. Each change is independently reviewed before the freeze. The prompts, `craft.md` and step instructions stay the same.
- Freeze, then eight runs: Thukker and the fresh premise, two tool runs and two notes runs each, on the same model as before (claude-opus-5-5) with the Claude Code version recorded beside the first comparison's 2.1.318, in a new comparison root (not the first one's). Failed runs aren't quietly rerun. Packets, key and failures are written as before.
- The handoff gives the paths, the model, the frozen commit and the number of failed runs.

## Close Reason

Fresh premise chosen and sealed by an agent building nothing (decision worldcrafter-kkmy, sha256 7d488ce0..., reviewed by premise-reviewer fz6a); harness reads it at run time (8937c5a, approved lp1a); frozen at 7a937111 into /home/supadava/projects/demiurge-comparison-2/frozen; 8 runs on claude-opus-5-5, Claude Code 2.1.318. Packets: /home/supadava/projects/demiurge-comparison-2/packets; key, raw, failures, model-gaps: .../key. 1 of 8 runs failed (notes, Thukker, packet thukker-pair-2-B): a safety-classifier refusal at step 3 (reasoning_extraction); not rerun. Second rubric committed as docs/verdicts/comparison-2-rubric.md (e72f280) before any judge read.
