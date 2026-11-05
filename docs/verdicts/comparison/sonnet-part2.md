# Part 2 (key open)

Part 1 is untouched in `my-part1.md`. Here is what my Part 1 preferences look like once the key says who used what.

| Pair | Tool | Notes | My Part 1 preference | Confidence |
|---|---|---|---|---|
| MGT 1 | A | B | B (notes) | medium |
| MGT 2 | B | A | A (notes) | medium |
| Thukker 1 | B | A | A (notes) | high |
| Thukker 2 | B | A | A (notes) | low |

The notes session was preferred in all four pairs. None of the 8 runs failed (`failures.md`).

## 6. Keep, change or drop

**Change.** This is a low-to-medium-confidence call. Drop is the nearest alternative.

**Held-back premise (weighted most).**
- Both MGT pairs went to the notes session, each at medium confidence. The tool did not make those stories better.
- It wasn't uniformly worse. In MGT 1 the tool session (A) did the more structural rework 2: it moved Halsey Street into the present and kept the knock-on changes to Marcus and the kitchen scene. It also had a clean, tight confession scene.
- In MGT 1 the notes session still won on the bigger central pressure, the planted twist and the better scene.
- In MGT 2 the notes session won on the world rule, the cleaner reworks and the better scene. The tool session's scene had a dialogue glitch and a long expository speech.

**Tuned-on premise.**
- The notes session won both Thukker pairs, one of them at high confidence.
- This premise should have flattered the tool, and it didn't. So the tuned-on pairs moved me toward drop, not toward keep.
- They pulled me a bit further from keep, because even the favourable premise showed no benefit.

**Why change and not drop.**
- The four gap logs describe specific, repeated and fixable problems. Section 7 covers them.
- The costliest one is not the model's structure. The ~1,500-word render budget made the tool sessions delete true links, settled questions and rejected candidates, as the logs say. That plausibly cost the tool arm some of its structural advantage.
- The logs show the tool's help was real but small. It caught contradictions and gave `touches` lookups. Stale free text still had to be found by reading.
- Four preferences, all pointing the same way, with two at only medium or low confidence, can't separate "the tool hurts" from "the tool as rendered and budgeted hurts".

I would not build on the tool as it is. If the named changes don't move a rerun on a fresh premise, drop it.

## 7. What was missing

The gap reports said the same things across all four runs.

**1. A causal "because" link between events, and from events to drives and scenes. Change this first.**
- Positions alone carry no cause. The logs say so in several places:
  - Run e388bae7: moving Aino's desertion turned an effect into a cause, and nothing objected. The ordering constraint was then deleted for length, so nothing guards that order.
  - Run 12ed319c: "her light goes out, so Ruth holds alone" lives only in summaries.
  - Run 6ae4e0b3: "this happened because of / right after that" was lost when constraints became plain years.
- Rework 1 changes a motivation and rework 2 changes timing. Both are causal edits, so this is exactly where the tool should help most. The sessions fell back on reading.
- The matching missing piece is a flag when a move changes the gap between linked events, or when free text mentions the moved event's timing. Four runs reported this separately.

**2. A way to reach what the text only mentions.**
- Plants and payoffs, motifs, mirrors and echoes live only in free text. Examples:
  - Dani's door chair and window chair.
  - Ines's mother's call echoing Dee's father's call.
  - Hask's belief that belonging must be paid for, mirrored by Kiri.
  - June at Halsey Street mirroring the girl on Bridget's roof.
  - The knot-song.
- Add a light relation such as `echoes`, `plants` or `pays off`, and let `touches` follow it. The scene text that depends on a changed fact should be findable.

**3. Different gap reports, and a rendering fix.**
- The render repeats each want in every relation, and ordering constraints print verbosely. The budget therefore pushed sessions to delete true structure.
- Four of the logs record this.
- Add a "decided, absorbed into the story" state. A settled question or a superseded candidate would stay in the file but drop out of the readable form.
- Mark superseded answers instead of deleting them. Three runs lost the before-and-after of the rework to git only.
- Make the gap check accept deliberate exceptions: an origin-less minor drive, a deliberate ambiguity, an intentional unexplained beat. Today those show up as unresolved flags.

**4. Time units.**
- Years are too coarse. Three logs report faking "same year" or "same night" ordering with fractional years such as 22.5 or 2026.801. Those hacks produced spurious contradictions.
- Finer units or a "same day, after" relation would fix it.
- This is a smaller fix than the others, but a recurring one.

**Not the main gap.** A type the model lacks is not the main problem, apart from small cases: a group actor with no drive of its own (the Office), a condition rather than an event as an origin (the Jovians dying out), and a drive that ends in being given up rather than met or thwarted.

## 8. Doubts

- **Small sample.** There are 4 pairs, one run per cell, and I am a single judge. Two of my preferences were low or medium on narrow margins (Thukker 2 low, MGT 1 B narrowly). Run-to-run variation in the sessions could account for a lot.
- **The word budget confound.** The tool sessions reported pruning links, settled questions and rejected candidates to meet a roughly 1,500-word readable-form target. The notes sessions also trimmed. The `a0d95482` log shows word-count trims, but their notes could keep prose that the tool's render could not. The comparison may measure the budget and render as much as the model.
- **Open-questions criterion.** My Part 1 verdict on this criterion didn't clearly separate the arms. The notes sessions' "Decided" lists flattened things too. That weakens any reading that the tool's candidate structure helped.
- **Format giveaway.** I can't rule out that the packet format hinted at the arm. Part 1 judged the story on the page, and I made no guess at the arm, so I don't think it moved my judgments.
- **Same model throughout.** The failures file shows `claude-opus-5-5` throughout. That is consistent, but it also means one model's habits are all that was tested.
- **Judge panel.** The verdict is the call two of three judges make. A change from me is consistent with either a keep or a drop from the others.

VERDICT: change
