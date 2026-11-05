# Part 2 report

## What the key shows against my Part 1 calls

| Pair | Tool | Notes | My Part 1 preference | Confidence |
|---|---|---|---|---|
| premise-c 1 | B | A | A (notes) | low–medium |
| premise-c 2 | A | B | B (notes) | medium–high |
| Thukker 1 | A | B | B (notes) | medium |
| Thukker 2 | A | B (failed run) | B (notes) | medium |

I preferred the notes session in all four pairs. Each call was made blind, and I'm not revising it.

## 6. Keep, change or drop

**Change.** The result is mixed, and it leans against the tool. I'd rather say that than call it a win.

**Held-back premise (premise-c), weighted most:**
- **Pair 2** is the clearest result. The notes session was ahead on the page, and I rated that medium–high.
  - Its sketch weighed real candidates for the fire.
  - Its reworks reached the structure. Ruth's false account to Walt changed what she wants. Walt's early confession added a whole office scene and motivated the fire.
  - Its scene dramatised the rework directly.
  - The tool session's sketch settled nearly everything and left an empty "Not decided yet" section. Its reworks were sound but less consequential.
- **Pair 1** was close, low–medium for notes. The tool session had the tighter mystery and the better scene (the hook, the letter). The notes session had the more character-driven engine, and its rework 2 was somewhat better followed through.
- The tool session's scene was the stronger one in pair 1 and the weaker in pair 2. So the tool is not clearly worse at scenes, but it didn't give a reliable gain either.

**Tuned-on premise (Thukker), weighted less.** The tool should have been flattered here, and it still lost both pairs.
- **Pair 1:** notes B, medium. The tool's sketch kept placeholder scenes and settled early.
- **Pair 2:** the notes run failed. It has no second rework and no scene for one, and I still preferred it. This is the weakest data point in the set. It is not evidence that the tool is bad, only that the tool did not clearly beat a run that was missing a whole deliverable.
- Thukker moved me slightly toward drop. A tool tuned on this premise should show some edge there, and I saw none.

**Why not drop.** The margins were small in three of the four pairs. The sessions' own gap logs name concrete and convergent problems, and several of them plausibly caused the shortfalls I saw:
- The tool's headline benefit is holding open questions. In my reading it did not show that benefit on the page. The tool sketches were as flat as the notes sketches, or flatter.
- The tool's word budget made sessions cut true links (scene pressures, merged events). That hurts the structure the tool is meant to protect.
- Change tracking (`mentions`) missed what reworks left behind, in every log. Sessions found the leftovers only by reading the render, which is what plain notes require anyway. So the tool's main promise on reworks went unmet.

**Why not keep.** I found no pair where the tool clearly made the story better. Evidence of improvement is needed to build on it as it is.

I'd move to drop if a rerun with the fixes in 7 still showed notes ahead on a held-back premise.

## 7. What was missing

The logs ask for the same few things again and again. In order of what I'd change first:

1. **Reach what text only mentions (change tracing).** All four logs report this. After a rework or a move, `mentions` found nothing, and the dependent text (old motives, "dead", "killed", "only here for the funeral", scenes that assumed the old order) was found by hand.
   - Match on the content of a changed drive or event, and on the actors involved.
   - When a record is changed, list the records that depend on it through causes, scene links and participants.
   - This is the first change. A tool that can't do this adds little over notes for the rework task, which is what the comparison tests.
2. **A chain of causes ("because").** This is partly there already, but it was thin in practice.
   - Causes are event→event only. They don't carry agents, so "who did it" lives in summaries (ac0caf8b, 40d78a42).
   - Causes don't order events (d8577118).
   - A move can leave a cause valid in time but wrong in meaning (40d78a42). Moving a reveal also broke old effects without any warning.
   - A cause was reversed by hand and nothing offered a replacement (d8577118).
   - Fix: add an agent or participants to events, make causes show up when a move invalidates them, and let a cause link to a change in a character, not only to an event.
3. **Types the model lacks.** These are reported across several runs.
   - Beliefs and knowledge ("who knows what", the town's versions versus the truth). Three of four logs call this out, and it is the heart of both premise-c stories.
   - Objects (the hook, the letter, the knife).
   - Promises.
   - Places.
   - Drive history, or a drive that is satisfied, superseded or renounced.
4. **Time.** Years are too coarse. Sessions used fractional years that print as "year 1954.786", and equal-position "before" was reported as a contradiction. Add days or an in-moment order.
5. **Different gap reports.** The logs are useful but open-ended. Ask for a fixed list of questions: what you wanted to record and couldn't, what you cut for length, and what a rework left behind that the tool didn't flag. Tell sessions that trimming links for length is a cost to be reported.

## 8. Doubts

- **Failed run.** Thukker pair 2 notes (04648983) failed: step 3 exited 1, so the second rework and its note are missing, and step 4 changed `story.md`. The pair is not a clean comparison. I credited the notes run on its story work but can't credit it for the missing rework. The failure also makes the 4–0 count look stronger than it is.
- **Sample size.** There are 8 runs, 2 per premise per arm, one model, and no repeats. Run-to-run variance could be as large as the arm difference, especially at low–medium confidence.
- **Close calls.** I called premise-c pair 1 at low–medium confidence, and Thukker 1 and 2 at medium.
- **Format giveaways.** The tool's rendered form is recognisable, for example the "year 1954.xxx" strings and the Decided and Open-question layout. I judged on story work and made no guess about the difference, but I can't rule out a halo effect on either side.
- **Confound with the length limit.** The tool sessions repeatedly cut true links and merged events to meet a word target. Some of the gap may come from that limit rather than the tool's model. A test with a looser budget might look different.
- **Process notes.** Both arms ran some edits through scripts outside the story directories. The checks flagged them, but I saw no sign of reading outside the allowed directories. The notes arm committed to git, and the tool arm used its CLI.
- **My Part 1 slip.** I labelled premise-c pair 2 as "Lusk (B) and Kessler (A)". That is only a labelling quirk, not a judgment error.
- **Held-back premise.** It counts more, yet premise-c has just two pairs. One of them was close, so the verdict rests mostly on one clear pair.

VERDICT: change
