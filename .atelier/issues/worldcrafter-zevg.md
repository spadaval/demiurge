---
created_at: "2026-11-05T11:33:23.758213756+00:00"
id: "worldcrafter-zevg"
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
closed_at: "2026-11-05T11:42:28.542992853+00:00"
status: "done"
title: "Round runner: story so far to length"
updated_at: "2026-11-05T11:42:28.542992853+00:00"
---

## Goal

Keep the story-so-far texts within about 300-500 words. (The judge prompt is not changed: judging stays fixed across rounds so scores stay comparable, as Round 1's log decided; finding worldcrafter-71bo.)

## Done when

- The story-so-far phase checks the length and, if over 550 or under 250 words, asks the same agent once to revise to length, recording both versions; still-out-of-range is recorded as a note, not a failure.
- Tests; bun run check passes.

## Close Reason

Implementer report (commit c1231db). app/scripts/round/round.ts: soFarPrompt states the target firmly (300 to 500 words, never more than 500, main lines not every event). If the first reply is under 250 or over 550 words (SO_FAR_WORDS, needsRevision), the same agent is resumed once with soFarRevisionPrompt (its count, which way to go, final reply only) in phase so-far-<n>-revise. To resume, the agent now saves its session in a host temp home bound over the sandbox home with the credentials read-only over it (soFarSandbox, soFarArgs: --session-id then --resume, still Read only); the home is removed after the phase; a transcript naming another session is a problem. Both replies are kept as phases/<phase>/reply.md; so-far/<n>.md holds the revision if it replied; still outside 300-500 is a note, not a failure. Judge prompt and rubric untouched. Tests (thresholds, prompts, args, sandbox order); README. Proof: bun run check passed (1113 pass) on a clean worktree of HEAD plus these files, since the shared checkout has another agent's in-progress, unformatted story-CLI edits that fail biome; tsc, biome on scripts/round and bun test also pass in the shared checkout. Smoke on a copy of Round 2's outline (/home/supadava/projects/demiurge-world/smoke-sofar, one point s10-surge, which was 797 words in Round 2; round-2 untouched): first reply 671 words, revision 511 (note: outside 300-500), same session id both times, no reads outside, credentials hash unchanged. Open: 511 is still just over 500; review outstanding.
