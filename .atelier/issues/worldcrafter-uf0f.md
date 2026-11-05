---
created_at: "2026-11-05T11:33:23.643059758+00:00"
id: "worldcrafter-uf0f"
issue_type: "task"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-5pks"
    type: "discovered_from"
schema: "atelier.issue"
schema_version: 2
status: "todo"
title: "Counts in reader context, and count display (Round 2 reading 1, 4, 6, 8)"
updated_at: "2026-11-05T11:33:23.643059758+00:00"
---

## Goal

The writer sees count values where it already looks before a scene, and count output stops printing noise.

## Done when

- reader-order --before <scene> prints each count's value as of the scene, with its threshold state.
- Count display prints threshold state only when it changes, nothing nonsensical for a zero total; a value below a threshold is visible in show count: without repeating on every line.
- An edit that leaves one scene both implying and withholding (or revealing and withholding) the same ref says so.
- render's reader-questions section is sorted by telling order and split into answered and open.
- Tests; --help; bun run check passes.
