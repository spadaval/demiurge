---
created_at: "2026-11-05T11:33:23.681409055+00:00"
id: "worldcrafter-vg6e"
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
closed_at: "2026-11-05T12:06:49.067201094+00:00"
status: "done"
title: "Trace precision (Round 2 reading 2)"
updated_at: "2026-11-05T12:06:49.067201094+00:00"
---

## Goal

Inline traces that are mostly real, so a writer keeps reading them.

## Done when

- set-count traces only when the value changed, and matches text stating the old value at that event, including numbers written in words.
- Text traces ignore stems common across the story (beyond the rarity cap) and don't list a record that the same batch rewrites, or the scene being rewritten.
- Re-run on Round 2's 8 traces (replay as in the reading) shows how many suspects remain and that the missed stale count note is found; tests; bun run check passes.

## Close Reason

Outcome: done in bf8b098 on feature/worldcrafter-ulpg (story CLI, src/story/mentions.ts and trace.ts, CLI tests). (1) set-count traces only when the value at that event changed: a first value or a note-only re-set prints nothing. The trace looks only for the old value at that event (the 'was' story it traces against keeps just that value), in figures, in words ('five hundred and forty', 'fourteen hundred and sixty', 'twenty-six'), and, after a change, rounded down or to nearest at each power of ten ('five hundred' for 540, as 'may state its value 540 roughly'). Words for values under 10 only for a changed value, since 'one'/'two' are everywhere. (2) Text traces: a stem in more than 5% of the story's texts (was 15%) is too common to count, and after a change a text must share three of the words the change took away (or all of them, if it took fewer than three; keeps the reef/cape case). Batch: edits from one shell command line (the parent shell; on Linux the first ancestor that isn't a forked copy of it, so $(...) subshells count as the same line) share a small list in the temp directory of records whose text an earlier edit rewrote, seeded on the batch's first edit with scenes whose prose file is newer than the story file; the inline trace leaves those records out. Prose paragraphs are still listed, since a change after writing a scene can leave it stale. trace <ref> on its own is unchanged. A new batch clears the story's earlier lists and any a day old. --help says all this. (3) Replay of Round 2 (every Bash and Write call of all five phases with the writer's filters removed, as the reading did; story.json byte-identical to the round's; evidence worldcrafter-vhsj's successor recorded for this issue): 8 inline traces with 22 suspects before, 1 trace with 1 suspect after: count:watchers' note at sponsorship-surge, '"five hundred" may state its value 540 roughly', the stale 'Over five hundred' note the reading says no trace found. What removed the other 7: CALL#14 masks and both watchers re-sets were note-only or unchanged values; bry-born's suspects shared only two words; the three describe-event traces lost the depicting scene being written (batch seed) and the rest to the common-stem and three-word rules. Proof: bun run check exit 0, 1117 pass; new CLI tests for count traces (note-only silence, words, rounding, untouched values not listed) and for batches (a separate command line lists the rewritten scene, one command line doesn't, the scene with fresh prose isn't, trace still is; a mutation removing the exclusion fails it). Deviations: CLI tests now run each command through its own bash, so each is its own batch, as a writer's separate tool calls are. Open items: independent review outstanding. The batch key relies on /proc on Linux and falls back to the parent process elsewhere (a wrapper script around the CLI would make every call its own batch). bry-born's real dependent (an age '24.' in notes) is still not found; the inline top three and the full trace can still rank differently.
