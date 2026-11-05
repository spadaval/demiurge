---
schema: atelier.review
schema_version: 1
id: worldcrafter-gu8c
title: finding on worldcrafter-ulpg @cbeb9305
target: worldcrafter-ulpg
identity: round1-fix-reviewer
commit: cbeb9305a087c0b5faacf6545ef7a0604b2b1a54
created_at: 2026-11-05T12:12:27.136230059Z
event:
  event: finding
  recommendation: fix_now
---

medium: app/scripts/story.ts recordBatch/batchRewritten and the filter in staleTextLines (vg6e, bf8b098). Covers uf0f and vg6e. The 'records an earlier edit in this command line rewrote' exclusion hides real suspects. Repro in a writer-like bwrap (own /proc, tmpfs /tmp), story with event wreck 'The ferry Ondine sinks off Gull Point in a black storm' and fact f1 'Everyone remembers the ferry Ondine going down off Gull Point in the storm': in one bash -c, 'update-fact f2 ...; describe-event wreck --summary "A trawler founders near the harbour on a calm night"' lists f1 (shares ferry, gull, ondine, point, storm); 'update-fact f1 --text "Everyone still remembers the ferry Ondine ..."; describe-event wreck ...' prints nothing, though f1 still states the old wreck. A record can only match after a change if it still holds the words the change took away, so a record rewritten earlier to the new version rarely matches anyway; the exclusion bites mainly when the earlier rewrite was for another reason, i.e. on real hits. Writers batch dozens of edits per call (Round 1: 984 edits in 43 calls), so any fact touched early in a batch goes dark for the rest of it. The author's own replay attributes none of the 8->1 reduction to it (the scene seed, the common-stem and three-word rules did all of it). Fix: drop the rewritten list and keep only the seed (scenes whose prose is newer than the story at the batch's first edit), which is the case the reading named; the batch file then holds just that set. If the Done when's 'a record the same batch rewrites' must stay, exclude only records rewritten after the change, which a single trace can't know, so better to drop it and say so in the close. Checked and fine: separate Claude Code Bash calls are separate shells (fresh bash -c per call, here and in the sandbox, where each is pid 2 with its own start time), so two tool calls are never one batch; $(...) and subshells join the line's batch; an unwritable TMPDIR makes every edit its own batch (more traces, fail-safe); bun can't run without /proc at all, so the /proc fallback is moot inside bwrap; a stale file needs the same pid and start time, and every new batch clears the story's older files.
