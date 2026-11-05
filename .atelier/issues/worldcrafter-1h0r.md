---
created_at: "2026-11-05T09:13:32.818197304+00:00"
id: "worldcrafter-1h0r"
issue_type: "task"
labels: []
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-b0la"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-w2hx"
    type: "blocked_by"
  - kind: "issue"
    id: "worldcrafter-xzee"
    type: "discovered_from"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T10:19:31.744460733+00:00"
status: "done"
title: "Skill guidance from Round 1 (reading 3, 5, 9, 11)"
updated_at: "2026-11-05T10:19:31.744460733+00:00"
---

## Goal

Close the misunderstandings the Round 1 reading found, without adding length that doesn't earn its place.

## Done when

- SKILL.md says: before writing a scene, ask the model what the reader knows by then and check counts and spans; an empty gaps list is not a goal; recording a question settled on the spot is fine, and a question you're genuinely unsure of stays undecided and is tested with touches; drive turns --into name the same holder's drive; a flashback through a false memory reveals the version and doesn't depict the event; when plants/pays-off add something beyond reveals; record a departure from a group as an event with that actor as participant.
- Reviewed against the CLI as it stands after the other two children.

## Close Reason

Outcome: done in 588ab72 on feature/worldcrafter-3fqq; only .agents/skills/story-sketch/SKILL.md changed (craft.md untouched). Each Done-when bullet, where it lands: (1) new section 'Before writing a scene': reader-order --before <scene>, show each depicted event, span for any time the prose states, show count:<id> for any number it states. (2) gaps bullet: 'An empty list is not a goal: don't add links or relations just to clear it'. (3) Open questions bullet: logging a choice made on the spot, answer and ruled-out candidates in one go, is fine; a question you're genuinely unsure of stays undecided while its candidates are tested with touches. (4) A drive's life: --into names another drive of the same holder; sharing someone else's want is a new drive of one's own, allied to it. (5) Scene links: set-scene-events says the scene depicts the event as it really happened; a flashback through a false memory or lie reveals the version and doesn't depict the event. (6) plants/pays-off are for a setup and its payoff (a thing, a promise, a skill); a character's appearances are reveals and scene actors, and a record already revealed needs no plant unless its return is the point. (7) Who takes part: no membership record, so a join or departure is an event with that actor as participant, which show actor: lists. Review against the CLI as it stands: every backticked command in the skill exists in --help (update-event as describe-event's alias), and the new examples (versions, knowledge, scene links --add, counts with --threshold more-than-half, span, reader-order --before, render --section, set-participant --role, add-drive-turn replaced --into the same holder's drive) ran clean on a scratch story. Trims to keep it tight: merged the time and span bullets, cut the trace bullet to what the writer acts on (top three, no trace on adds, first placements or first count values), shortened versions/knowledge, causes, render and the question-state list, folded count/knowledge/cause problems into 'Contradictions are kept', and dropped the stale mention of facts as gaps. Word count 2,575 before (2,164 before b0la) to 2,113 after. Deviations: none. Open items: independent review outstanding; whether the trimmed trace detail (spans such as 'ten years since', how prose paragraphs are matched) is missed is for the next round to show.
