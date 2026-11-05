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
closed_at: "2026-11-05T11:43:17.947510135+00:00"
status: "done"
title: "Counts in reader context, and count display (Round 2 reading 1, 4, 6, 8)"
updated_at: "2026-11-05T11:43:17.947510135+00:00"
---

## Goal

The writer sees count values where it already looks before a scene, and count output stops printing noise.

## Done when

- reader-order --before <scene> prints each count's value as of the scene, with its threshold state.
- Count display prints threshold state only when it changes, nothing nonsensical for a zero total; a value below a threshold is visible in show count: without repeating on every line.
- An edit that leaves one scene both implying and withholding (or revealing and withholding) the same ref says so.
- render's reader-questions section is sorted by telling order and split into answered and open.
- Tests; --help; bun run check passes.

## Close Reason

Outcome: done in 9c7bdab on feature/worldcrafter-ulpg (story CLI and tests only). (1) reader-order --before <scene> ends with 'Counts as of the scene:', each count's value in effect at the scene's anchor (latest placed event it shows; the last value at or before it in story order) with its full threshold state and the event it was set at. On Round 2's story, before s23-return: 'count:letters: 5 of 6, 1 short of 6, since event:queen-speaks', 'count:masks: 860 of 1710, reaching more than half (856)': the two numbers s23's prose got wrong. No anchor, no counts block. (2) Count display: the series (show count:, render) states threshold standing only where it changes (first value, crossing it, or the threshold moving with the total), so Round 2's watchers series says 'reaching 50' at mothlight-joins and again only after each drop to 0, not on every line. When a series has values on both sides, 'below the threshold at: event:window-opens (11), …' is listed once (render: 'Below the threshold at: …'); a series all on one side gets no such line. More than half of a zero total is no threshold: end-stream now reads '0 of 0', not '0 of 0, 1 short of more than half (1)'. show event:'s count line and reader-order --before still say the full standing, as single values. (3) An edit that newly leaves a scene both revealing or implying and withholding one ref prints 'Note: scene <id> now both implies and withholds <ref>; one of the two is probably meant.' (only new crossings, so re-sets don't repeat it). (4) render's reader-questions section, retitled 'Reader questions, in the order they are raised', sorts by the opening scene's telling order (unopened last) and splits into 'Still open:' then 'Answered:'. --help updated for reader-order --before, add-count and set-scene-links. Proof: bun run check exit 0, 1115 pass (run included another agent's uncommitted round-runner files in the tree; only my four files are committed); new CLI tests for threshold changes and the below list, zero totals, counts in --before, the crossed-link note and reader-question order (a mutation printing standing on every line fails the test). Deviations: none; SKILL.md not touched, per the brief. Open items: independent review outstanding.
