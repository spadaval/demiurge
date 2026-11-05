---
created_at: "2026-11-05T05:34:34.651138247+00:00"
id: "worldcrafter-03rp"
issue_type: "decision"
labels:
- "story-model"
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-ddha"
    type: "supersedes"
  - kind: "issue"
    id: "worldcrafter-i2uz"
    type: "related"
  - kind: "issue"
    id: "worldcrafter-iu6l"
    type: "related"
  - kind: "issue"
    id: "worldcrafter-ok5a"
    type: "supersedes"
  - kind: "issue"
    id: "worldcrafter-p3k7"
    type: "related"
  - kind: "issue"
    id: "worldcrafter-z9qs"
    type: "advances"
  - kind: "issue"
    id: "worldcrafter-zybl"
    type: "related"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T05:35:59.010713960+00:00"
status: "done"
title: "End the typed-model bet; find where plain notes fall short before building any aid"
updated_at: "2026-11-05T06:31:33.307340413+00:00"
---

## Question

The mission worldcrafter-z9qs ("Structure first", `docs/strategies/structure-first.md`) bet that a typed story model, used through a CLI and a skill, makes an agent better at finding a great story than the same agent with plain notes. Its Outcome says that if `sketch` and `rework` headless don't beat plain notes, the rest of the plan should change. Two blind comparisons have now answered. In the first, worldcrafter-i2uz, the verdict was change: every judge preferred notes in all four pairs (`docs/verdicts/comparison/`). The tool was then changed in worldcrafter-hqgq. In the second, worldcrafter-iu6l, run on a fresh held-back premise, the verdict was drop: keep 0, change 1, drop 2 (`docs/verdicts/comparison-2/`). What should the mission do now, and what happens to its 16 backlog increments and tasks, which were all written for the typed model?

## Options

- **(a) End the bet.** Supersede the mission and its typed-model backlog, keep the evidence, and frame what comes next as a new mission.
- **(b) Notes first, with aids.** The story lives in plain notes. Light aids over the notes, such as a content-based change tracer or a check of who knows what and when, are each tested blind against plain notes.
- **(c) Redesign the typed model from the gap logs.** That means adding knowledge and belief, objects, event participants, a drive lifecycle and finer time, plus a content tracer and a render that shows the weighing, then testing again. The cheapest version, argued by an advocate, would re-render the comparison-2 tool files without the link tax and with rejected candidates shown, and have them judged again against the same notes packets.
- **(d) Keep the on-screen bet** (worldcrafter-frqk), independent of the headless verdict.

## Decision

Choose **(a)**, together with the first step of (b): end the typed-model bet, and open a new mission whose first increment finds out where an agent with plain notes falls short on the way to a finished long story. No aid is built until that shows there is room for one. Decided by an agent under decision worldcrafter-zybl. Independent agent review is outstanding, and Sumeet reviews after the fact and can reverse it.

**Why the bet ends.**
- The evidence is one-sided in direction, even though it is thin in size.
  - Over two comparisons, each judged by three judges on three models, no judge preferred the tool packet in any clean pair.
  - The tool's only pair win (comparison 2, Thukker pair 2) came from a notes run that failed partway through. Fable gave that pair to the tool on completeness and still judged the notes story stronger.
- On the held-back premise, which counts most, notes won both pairs for all three judges.
- The tool failed at the two things it exists to do.
  - **Holding open questions.** The rendered tool sketches showed flat "Decided" lists. The notes sessions wrote "Rejected: … (reason)" and candidate lists unprompted (`docs/verdicts/comparison-2/fable-part2.md`).
  - **Following a change through.** In all four tool runs of the second comparison, `mentions` and `set-position` missed what depended on the change, and the sessions found the leftovers by reading, as the notes sessions did (`demiurge-comparison-2/key/model-gaps/*.md`).
- The named changes from the first verdict were made and did not move the result. The link tax on the render was named in comparison 1's gap logs and was still there in comparison 2.

**Why not (c).**
- What the judges and logs ask for is a different tool, not a change to this one (fable and opus, Part 2).
  - The list of missing types keeps growing: knowledge and belief, objects, participants, promises, places, drive history, finer time.
  - Every type added to the model is more to keep up and more to render, and the render's cost is what made sessions cut true story.
- The fixes that aren't new types don't need the typed model.
  - A content-based tracer can work over free text.
  - Notes already show their weighing.
  - The notes sessions held beliefs, the town's versions and objects in prose without trouble (for example `demiurge-comparison-2/packets/premise-c-pair-2-B.md`, "What everyone else believes").
- The render-only re-judge cannot undo what the sessions cut while they were writing. It would also be a third panel on material that has already been judged twice.

**Why not (b)'s aids yet.** An independent reading of both comparisons' Part 1 reports and the notes packets found little headroom at sketch scale. It counted one or two stale-text slips per notes packet, and none of them decided a preference. Examples: "Twenty years ago" against "sixteen years" (comparison 1, MGT pair 1 B), and "That evening" against "yesterday morning" (comparison 2, premise-c pair 2 B). The judges decided on motivation and scene quality, which an aid wouldn't reach. A tracer tested at this scale would most likely give a noise-level result. Building it now would be inventing work.

**Why not (d).** `on-screen` was a screen for sketching and reworking in the typed model, and that model is gone. A screen over plain notes is a text editor, and those already exist. The verdicts don't meet the strategy's removal rule for `on-screen` (that the best stories don't need a screen), because nothing in the evidence is about screens. This decision, made under worldcrafter-zybl, drops the bet anyway, because what it would have put on screen no longer exists. A screen can come back in any later mission whose results call for one (decision worldcrafter-45an).

**Why a new mission and not a stop.** The product's goal is a great finished story, and both comparisons only judged a short sketch, two reworks and one scene, at about 1,500 words. Plain notes are clearly enough at that scale. They are most likely to break where they have to carry a story that no session re-reads whole: drafting a long piece end to end across many fresh sessions, each seeing the notes and only a limited part of the draft. That limit stands in for a novel too long to re-read each time, at the cost of a novella. Measuring that once, with a panel, is cheap and reversible. It tells any later aid what to aim at, or shows that no aid is needed. The co-authoring hunch remains untested, which is Sumeet's choice (strategy Risks).

**Evidence limits.**
- Each cell had one run, on one authoring model (Opus 5.5), across four premises.
- One run failed.
- The judges are agents, and two of the three come from the authoring model's family.
- The tool's render was recognisable, and judges named format as a possible bias.
- The word budget charged the tool for its links. That is a confound, but it is also the tool as it actually was.
- These limits could hide a small difference. They are unlikely to hide one large enough to reverse two consistent verdicts.

**Strongest dissent.**
- Sonnet in comparison 2 called change. Its reasons: the margins were small in three of four pairs, the gap logs name concrete and convergent fixes, and the word budget is a confound.
- An advocate for (c) adds that 1,500-word stories hide the payoff of tracing dependencies, which matters only when no reader can hold the whole story.
- The answer to both:
  - No judge preferred the tool in any clean pair. Its few sub-question wins, a couple of reworks and scenes, didn't add up to a pair on either premise.
  - The tracer it would need doesn't depend on the typed model.
  - The new mission's first increment tests the situation where that payoff would appear. It drafts a novella of about 20,000 to 30,000 words across many fresh sessions, each reading the notes and at most a fixed share of the draft, smaller than the draft. So the notes have to carry the story.

**Consequences.**
- Mission worldcrafter-z9qs is superseded, with all its evidence kept, and `docs/strategies/structure-first.md` is marked superseded.
- Its typed-model and app backlog is superseded: frqk, iaoc, eg96, 3nnq, js5y, ed6e, oes2, j8pr, l2e5, y2y2, jd8b, wllv, 3ugg, asip, e33n and bftc. worldcrafter-08kf, an app test bug, moves to the rebuild mission worldcrafter-3otd.
- A new mission with strategy `docs/strategies/notes-first.md` holds what follows.
- This supersedes decision worldcrafter-ok5a's structure-first story model as the product's direction, and decision worldcrafter-ddha's typed records.
- The prose foundation from the rebuild, and decision worldcrafter-gcox's platform, are not reopened here. Whether anything uses them follows the new mission's results.
- The typed-model CLI and skill in `app/src/story/` and `.agents/skills/story-sketch/` stay as they are, frozen copies included. They are not built on. Whether to retire them is left until the new mission shows whether anything reuses them.
- `craft.md` is kept, because both arms used it.
- PRODUCT.md, AGENTS.md `docs/rebuild/story-model.md` and `.agents/skills/story-sketch/SKILL.md` still describe the typed model or steer agents to it. A task in the new mission, worldcrafter-5xig, corrects them.
- Six older app backlog items related to this mission (8agg, eh1z, lhh3, vw7x, wknl, yx9v) are prose-editor features from the rebuild, not typed-model work. They lose the link to the superseded mission and stay in the loose backlog, to be re-planned only if the new mission's results call for an app.
- The product name (worldcrafter-cogw) stays with Sumeet.

## Notes

- 2026-11-05 [note] 2026-11-05: Evidence, independent reading of where the notes arm fell short (a fresh agent, read-only, over both comparisons' Part 1 reports and notes packets; its report as returned). Stale text or contradictions left: comparison 1 MGT-1-B 'Twenty years ago' (line 382) against 'sixteen years' (421, 515) and 'You were seventeen' (608); comparison 2 premise-c-2-B sketch 'That evening' (460) against the scene's confession 'yesterday morning' (626); comparison 2 Thukker-2-B scene puts Ryn's sale on the trail ('Yard confirmed. Six days.', 436) though the outline puts it after they find Teiko, undercutting the Act IV reveal (opus and fable Part 1), a who-knows-what-when slip; comparison 2 Thukker-1-B the stipend 'bought the hauler' yet the broker 'called in the hauler debt' (fable); comparison 1 Thukker-2-A 'none true' against reports that grew 'less true every year' (opus). Rework leftovers and deleted questions: MGT-1-B deleted 'Will Dani let go?' though the climax still pays it off; premise-c-1-A dropped its Rejected lists and two lines; premise-c-2-B cut 'Walt killed his brother' and 'only home for the funeral' while other text relies on them; Thukker-1-A lost Kaari's logistics job. Motivation gaps (weighed more by judges, unreachable by a tracer): premise-c-1-A, Thukker-1-B, Thukker-1-A, Thukker-2-A. Weak scenes: Thukker-1-B 'Terms' (fable); premise-c-1-A 'The 1:50'. Flattened questions: barely any. Its summary: about one or two stale-text slips per packet, none decided a preference; the one recurring class an aid might help is who-knows-what-when; real headroom is in motivation and scene quality. The reader also argued for closing without a new mission, or testing at length or with the human team; the decision takes the length test. Spot-checked by the planning reviewer: the two quoted slips exist.
- 2026-11-05 [note] 2026-11-05: Evidence, the advocate's case for (c) (a fresh agent, read-only, asked to argue for redesigning the typed model; its report as returned). For: the word budget charged the tool for its links, and fable, opus and sonnet Part 2 each name this as a confound (comparison-2 fable-part2.md:67, opus-part2.md:54, sonnet-part2.md:70); short stories hide the payoff of tracing dependencies; much that lost was render or guidance (rejected candidates hidden once decided, fable-part2.md:31,69; fractional years); the gap logs converge on a specification (knowledge and belief, objects, participants, drive lifecycle, finer time, content-matched mentions); the sample is small and judges say flipping one close pair moves them toward change. Cheapest credible version: re-render the comparison-2 tool files without the link tax, with rejected candidates and named days, and re-judge blind against the same notes packets; if that moves, add knowledge, objects and participants and test on a new held-back premise with three runs per arm, with drop written down in advance. Against, in its own words: the cycle already happened (comparison 1 gap logs 6ae4e0b3.md:9 and 3c094cd9.md:7 named the link tax; opus warned the next verdict should be drop if changes didn't reach an even result, comparison/opus-part2.md:42); the notes arm weighed alternatives unprompted; the fixes amount to a different tool; nothing in either comparison shows the tool helping at any size. Why the decision doesn't take it: a re-render can't restore what sessions cut while writing, and a third panel on twice-judged material invites fishing.
- 2026-11-05 [note] 2026-11-05: partly reversed by Sumeet's decision worldcrafter-jeue: the typed-model CLI and skill are used again (the writer uses 'Demiurge (CLI plus skill)'), now as an author-side bible separate from the prose, and head-to-head comparisons are dropped. The rest of 03rp's record stands as history.

## Close Reason

End the typed-model bet: supersede mission worldcrafter-z9qs and its typed-model backlog, evidence kept; open mission worldcrafter-p3k7 (notes first), whose first increment finds where an agent with plain notes falls short on a finished long story before any aid is built. Rejected: redesigning the typed model, aids at sketch scale, the on-screen bet. Agents' decision under worldcrafter-zybl; independent review outstanding; Sumeet reviews after.
