# Part 2 (key open)

Part 1 is untouched in `my-part1.md`. Below I map my blind calls onto the key and answer 6-8.

## What the key does to my Part 1 calls

| Pair | Premise status | Tool was | My blind preference | Went to |
|---|---|---|---|---|
| MG pair 1 | held back | A | B, medium | **notes** |
| MG pair 2 | held back | B | A, medium | **notes** |
| Thukker 1 | tuned-on | B | A, high | **notes** |
| Thukker 2 | tuned-on | B | A, low | **notes** |

The notes session won all four pairs, and the tool never won one. Sub-calls:
- **Reworks.** The tool took 1 of the 8 rework comparisons that I gave to a side: rework 2 in MG pair 1 (Halsey Street pulled onto the page). I called MG1 rework 2 only "slightly", and called MG1 rework 1 for the notes. Notes took the other rework comparisons, including both reworks in MG pair 2 and both in Thukker 1. Thukker 2 went to notes slightly on both reworks.
- **Scenes.** The notes scene was better in all four pairs.
- **Open questions.** Notes were better or equal in every pair. Both arms tended to settle things early, but the notes arm weighed candidates more (the Carrow Street alternatives, the Auditor's unresolved "mercy or control").

## 6. Keep, change or drop

**Drop.**

- **Held-back premise (weighs most).** Both pairs went to notes, each at medium confidence. In MG1 the notes session had the better central pressure, a twist that recasts earlier beats, and the better scene. In MG2 the notes session had the stronger engine ("the town needs its girls to stay hurt") and the cleaner reworks. The tool's one win there was a single rework. Nothing on the page suggests the tool made these stories better.
- **Tuned-on premise.** The tool was built against Thukker, so it should have flattered the tool, yet it lost both pairs. Thukker 1 was a clear loss: the tool story's confusing socket line and its uncommented timeline clash with the Lattice hauler. Thukker 2 was a loss at low confidence, with the tool story arguably the more thematically interesting one. The tuned-on pairs moved me only slightly. If anything they count against the tool, because the tool lost even where it had home advantage. I did not use them to offset the held-back result.
- **Why drop and not change.** "Change" fits a mixed result. Mine is not mixed: 0 of 4 pairs, 1 of 8 rework comparisons, 0 of 4 scenes. The model-gaps logs also show a mechanism that depresses the output, not just friction: the tool's render length budget (about 1,500 words) pushed every tool session to delete true links, answered questions and rejected candidates, so the stories carried less structure than the sessions knew. That is a design problem in the tool, not a fixable tweak. I would not build on the current tool. If someone rebuilds it, the budget problem in Q7 is the place to start.

## 7. What was missing

Across all four tool logs, the same gaps recur. Roughly in order of how often they appear:

1. **Render length versus links (all four logs).** Every session says the readable form repeats wants and pressures for each relation, so to hit the word target they cut links, present-day events, answered questions, rejected candidates and the Office group. The model held more than the file could show. **This is the first thing I'd change.** Stop printing repeated wants, let settled questions and rejected candidates stay in the file but out of the render, and drop the hard word target or apply it only to the prose view.
2. **A chain of causes ("because").** Asked for in three logs. Examples: the Thukker 2 desertion that turned from effect into cause with nothing to object, "her light goes out, so Ruth holds alone", and Thukker 1's "Haruka's call causes the second hull". Constraints only order events, and they print verbosely. A `caused` relation between events would catch the failures that appeared in the reworks.
3. **Reaching what text only mentions.** Every log says rework edits needed the author to find scene and fact text by reading. `touches` finds linked records but not the sentences that mention a moved date or a changed motive. The leftovers I saw in Part 1 are the same problem on the page: "twenty years" versus sixteen, the stale waiting-list questions, and the Thukker 1 timeline clash. A way to list the free text that mentions an event, or to refer to an event's position from text, would address it.
4. **Types the model lacks.** Plants and payoffs or motifs, mirrors and echoes between actors or events, and superseded answers. Each log asked for at least one. An intended ambiguity (the Archivist's ship) and a drive that ends given up were also asked for. These are real but second-order next to 1-3.
5. **Time units.** Whole years only, so same-year and same-day ordering needed fractional hacks and produced spurious contradictions.
6. **Gap reports.** The gaps check flagged origin-less drives (Velan, Ondrai, Saevel). The sessions called the flags unhelpful for temperament or condition motives and left them standing. The reports were mostly about the model, not the story. I'd add a way to mark a flag as deliberate, and I'd want the check to find stale text after a rework.

Order: (1) render budget, (2) causal link, (3) text-reference finding, then the rest.

## 8. Doubts

- **Sample size.** One run per cell, four pairs, three judges. A single pair at low confidence (Thukker 2) is a close call. The verdict rests on the consistency of the direction, not on the size of any one gap.
- **Format giveaway.** Tool and notes packets may look different, which could bias a judge. I did not use format to judge, but I can't rule out an effect.
- **Confounds.** The tool sessions had a word cap on the render, and by their own logs it changed what they kept. That is part of the tool as built, but it means the loss may owe more to the budget than to structured modelling as an idea. The data can't separate the two. A rebuild with no length cap might do better, and I can't say from this evidence that it would.
- **My Part 1 confidence.** Mostly medium. Only Thukker 1 was high.
- **Failures.** None: 0 of 8 runs failed, and every run's step list shows exit 0. The notes runs touched files outside the story directory only for scratch notes (one rework-notes file moved into the story folder, and a few editing scripts), which I read as harmless. They don't affect the verdict.
- **Premise leak.** Thukker was used to tune the tool. That cuts toward flattering the tool, so the loss there is more telling than a win would have been.

VERDICT: drop
