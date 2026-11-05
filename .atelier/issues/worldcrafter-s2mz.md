---
created_at: "2026-11-05T06:28:02.483395718+00:00"
id: "worldcrafter-s2mz"
issue_type: "feature"
labels: []
workflow_branch:
  branch_base: master
  work_branch: feature/worldcrafter-s2mz
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-gwx3"
    type: "advances"
  - kind: "issue"
    id: "worldcrafter-j6z1"
    type: "blocked_by"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T08:10:00.987402485+00:00"
status: "done"
title: "First pass at change tracing on content"
updated_at: "2026-11-05T08:10:00.987402485+00:00"
---

## Goal

After a change, list the records and prose that depend on it by meaning, not just by name.

## Done when

- SKILL.md describes the new commands or states, and `--help` is accurate (review finding worldcrafter-j8lb).
- After an edit (and on demand), the CLI lists records and scene prose that likely depend on the changed record's content, including ones that don't name it (for example a paraphrase, a date stated as an interval, a consequence). Approach is the implementer's call; an LLM call is allowed if it stays cheap and the CLI still works without it.
- Tests on fixed examples show it finds dependents that mentions misses. bun run check runs offline: if the tracer uses an LLM, the tests cover the offline path, and the LLM path is proven once by a recorded manual run on the same examples.
- bun run check passes; independently reviewed and merged locally.

## Notes

- 2026-11-05 [note] From review finding worldcrafter-ii8m: after a question is re-answered, list scenes whose reveals link names the replaced answer (app/src/story/story.ts:733).
- 2026-11-05 [note] From 6m2v: change tracing should treat versions and knowledge as depending on their event (and on the record they are of).

## Close Reason

Outcome: new read command trace <ref> (app/src/story/trace.ts, traceDependents), plus the edit prompt built on it. trace lists the records and scene-prose paragraphs (scenes/<id>.md:<line>, or the whole file) that may depend on a record, likeliest first, each with its reasons:
- declared links and one step on (whatThisTouches, so consequences through causes, participants, scene links), and knowledge of an event's versions (s2mz note on versions and knowledge);
- text naming it (whatMentions: name, holder, year, near spans);
- free text and prose sharing two or more of its distinctive word stems, weighted by rarity;
- the prose of scenes that touch it (scenesTouching), with names and years found in prose, and for an event any span in that prose, marked as matching when 'ten years since' equals the gap to another placed event;
- scenes, and their prose, that reveal an answer since replaced (ii8m note).
After an edit that changes a record (set-position, describe-event, the update-* commands, answer and unanswer, drive turns), the CLI prints the top five suspects with a reason in their text under 'What may still state the old <ref>', then '...run trace <ref> for all N'. In that mode it looks only for what the change took away: the old name or year if those changed, the stems the old text had that the new lacks, and for a moved event all its words plus spans. Text that already states the new version isn't flagged, and a no-op edit prompts nothing. This replaces the old mentions-only prompt; mentions and touches stay as the narrower views (help and SKILL.md say so).
No LLM: offline, cheap and deterministic. That was the approach the orchestrator steered toward, and it needs no credentials in the sandbox.
Tests: src/story/trace.test.ts (a fixed example where mentions finds none of the paraphrase fact, the consequence, the belief in a version or the prose, and trace finds them all, including the span matching the 10-year gap; change mode; re-answer) and a CLI test (trace output including prose, and the edit prompt). The existing edit-prompt CLI tests were updated to the new format. bun run check passes (1030 tests).
Deviations: the prompt's header and wording changed ('What may still state the old ...'), and after a rename it counts all suspects in '...for all N'. Edits now prompt for more commands than before.
Surprises: a drive rename now also flags text that shares its old words (the vow fact), not just its name.
Open items: independent review outstanding. Shared-word matching is lexical (crude stemming, no synonyms), so a true paraphrase with no shared words is missed unless linked. Ranking weights are a first guess. Prose is read only from scenes/<id>.md of existing scenes. A gap match uses whole-year starts only. An optional LLM rerank could be added later if rounds show the lexical list misses too much.
