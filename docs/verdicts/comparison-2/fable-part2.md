# Part 2 report (with the key open)

Read: `key.md`, `my-part1.md`, the four logs in `model-gaps/`, `failures.md`, and the eight packets again. Part 1 is left as written; this report refers to it rather than restating it.

## How my blind calls line up with the key

| Pair | Tool | Notes | My Part 1 call | Who won |
|---|---|---|---|---|
| Thukker 1 (tuned-on) | A (40d78a42) | B (da8640ac) | B, medium | notes |
| Thukker 2 (tuned-on) | A (ac0caf8b) | B (04648983, failed) | A, low | tool, by default |
| premise-c 1 (held back) | B (d8577118) | A (f0a1e4ad) | A, medium | notes |
| premise-c 2 (held back) | A (396ea293) | B (5373e0b2) | B, high | notes |

By sub-question, counting only comparisons where both sides delivered:

- Keep developing: notes 3, tool 0. (Thukker 2 went to the tool only because the notes run lost its second rework; I wrote that B's story was the stronger one and the call would flip if the missing step were set aside.)
- Open questions: notes 4, tool 0. Every tool packet reads as "flattened early" in Part 1; every notes packet shows its weighing.
- Rework 1: notes 4, tool 0 (two of them "slightly").
- Rework 2: notes 2, tool 0, one even (premise-c 1), one tool by default (Thukker 2).
- The scene: notes 3, tool 1 (Thukker 1, "by a little").
- Has what it needs: all eight, yes.

## 6. Keep, change or drop the tool

**Drop.**

The held-back premise is the evidence that counts, and it is one-sided. On premise-c the notes session won both pairs, one at high confidence, and won every sub-question except a single tie on one rework. The tool did not produce a better sketch, a better-held set of open questions, a more thorough rework, or a better scene in either pair.

The tool lost on the two things it exists to do.

- **Holding open questions.** The tool has records for questions, candidates and answers with history. On the page that produced "Decided" lists of bare answers in all four tool packets, with rejected alternatives invisible and, in three packets, no open questions at all or one with no candidates. The notes sessions wrote "Rejected: … (reason)", "Candidates: … Settled: … because …", and "Left for drafting … leaning …" without any tool. Two gaps logs (40d78a42, 396ea293) say why the tool's version was hollow: the sessions wrote the answers into event summaries first and added the questions and candidates afterwards as bookkeeping. The render then shows candidates only for still-open questions, so the weighing that did happen is lost to anyone reading the result. In premise-c pair 2 the tool packet's only open question was settled during rework 1 without a word in the note, and the log for that run says length pressure drove it to collapse candidates.
- **Following a change through.** This is the tool's central promise: links let you find what a change affects. All four tool logs report that it failed at exactly this. `mentions` after a drive or event change "found nothing" or "reported no free text" while the old version lived on in scene summaries (40d78a42, ac0caf8b, d8577118, 396ea293). `set-position` after moving an event flagged nothing (396ea293), or only one cause that was already obviously wrong (d8577118), or left causes that stayed valid in order but wrong in meaning (40d78a42). Every tool session says it found the leftovers "by reading the render," which is what the notes sessions did, in a medium that was easier to read and rewrite. The notes reworks reached more of the story in every pair where both sides delivered: the Tavik cradle rework touches ten places and adds a reader question; the Thukker 1 tool rework 1 leaves the whole middle untouched because the event links did not require anything of it.

The tool also cost story. Three logs say the render's link boilerplate ("Pressure on Teyo: 'Get the navigation core back…'", "Comes from:", "Because of") ate the word budget, so the sessions cut true pressures, dropped a minor character who had no drive (Vauren), merged events and lost their causes, and trimmed scene links to two per scene. The notes sessions spent the same budget on the things Part 1 credited: plants, collisions, "why it should hold", rejected alternatives. The tool's year-fraction timestamps ("year 1954.786, day 1") and truncated drive quotes are noise in the readable form and two logs say so.

What the tool did well is thin. One run (d8577118) reports one correct catch: a reversed cause when Lew's return moved ahead of Greta's death. The tool packets have systematic raise/answer scene references for reader questions and printed want/stake/how for every actor, and premise-c pair 2 A has the best single want statement in the set (Danny's two wants against each other). None of this needed the tool; the notes packets did the same by hand, and in Thukker 2 the failed notes session's working file weighed three candidates for Anvo's motive with reasons, unprompted.

I considered "change." It would mean naming fixes and building on the tool. The fixes the logs call for are a record for knowledge and belief, a record for objects, participants on events, a drive lifecycle with history, time finer than a year, a content-based dependency tracer, and a render that shows weighing and does not tax links. That is a redesign of the model, the checks and the output. "Build on it after named changes" is not an honest description of that; "don't build on this one" is. The gaps logs and the notes sessions' working methods are the valuable output here and should seed whatever comes next.

**How much the tuned-on pairs moved me.** Not toward the tool, and only a little further away. I would reach the same verdict on premise-c alone. Thukker pair 1, where the tool should be at its most flattering, went to notes on every sub-question except the scene. Thukker pair 2 is the only pair the tool won and it won because the opponent's run failed; on the story work delivered, I preferred the notes packet there too. So the tuned-on pairs add a small amount of weight to "didn't help," but they are not what the verdict rests on.

## 7. What was missing

Taking the four questions in turn, then what I would change first.

**A chain of causes.** The tool has event-to-event causes and the sessions used them, but the logs show they could not carry what the stories needed: irony or backfire (Ama's sale sends the core to its maker; then Teyo's does), who did an event (the raid "guided by Saya's hull"), a cause that is a change in a person rather than an event (Lew leaving by daylight), a cause that reaches only half of an event (Lew's presence shapes Greta's telling, not her dying), and causes that stay valid in order while becoming false in meaning after a move. Causes also did not order events, so sessions fell back on fractional years. Meanwhile the notes packets' "Why it should hold" paragraphs are chains of because in prose, and they are the clearest causal reasoning in the set. The sessions wanted "because," but between people, wants and facts as well as events, and in a form the render could show.

**A type the model lacks.** Three stand out, and every one of the eight stories turns on all three.

1. **What a character knows or believes, and the versions a town tells.** Named in three logs (396ea293, d8577118, 40d78a42) and implied by the fourth (reveal order vs truth order). Ruth knows, Danny knows and never said, Walt believes he killed a man, Lew believes his mother did, Amos saw a coat, the town has three stories. The sessions put this in facts, drive text and summaries where nothing can check it or follow it through a move.
2. **Objects.** Named in two logs (ac0caf8b, d8577118). Every story is spined by one: Doran's knife, the sack hook, Greta's letter, the red mackinaw, the scale weight and deed, the navigation core, the ledger page. None can be linked to the scenes that plant and pay them off.
3. **Who takes part in an event, and a drive's life.** Participants or agents on events (three logs). A drive that is renounced, satisfied, superseded or flips from ally to opponent at a given scene (all four logs), with history kept the way answers keep theirs.

Also asked for: promises and obligations (396ea293), places (ac0caf8b), a reader question that opens in two halves or is answered in parts (ac0caf8b), time finer than a year or an order inside a position (three logs).

**A way to reach what text only mentions.** Yes, and this is the tool's core failure. `mentions` matches by name, year and span. It missed "his dead wife", "Lattice killed her for it", "the old motive lived on in the scene where Danny 'knew'", "says he's only here for the funeral" and the scenes that showed a moved arrival. The sessions wanted: when an event moves or changes agent, or a drive is rewritten, list every record whose free text assumes the old version, matched on content, not on the record's name. Without that, the links are a cost with no return.

**Different gap reports.** Yes. The sessions describe reports that were silent or wrong: `set-position` reporting no contradiction while causes had become false; a deliberate-gap reason going stale with no notice when the gap filled; a conflict flag that had to be cleared by hand with no record that it was resolved; an answered question that cannot be hidden without losing its history. What they wanted were reports that say "this moved; re-check these causes and these summaries," and reports that distinguish "the structure is consistent" from "the meaning still holds."

**What I would change first.** If anything is built on this, I would start with a record for what a character knows or believes, including the versions other people tell, with links from scenes that reveal it and from the events it concerns. It is the one thing all eight stories are made of, it is the gap three of four logs name, and no amount of fixing `mentions` helps while the stories' real spines live outside the model. Second, and cheap: print rejected candidates and their reasons for decided questions, stop printing truncated drive quotes and raw year fractions, and stop counting link boilerplate against the length target. Those two render changes are where the tool visibly lost these four pairs.

## 8. Doubts

- **One failed run decided a pair.** Thukker pair 2's notes run (04648983) produced no second rework, and its step 4 changed `story.md`, which the protocol did not allow. I gave the pair to the tool on completeness while saying the notes story was stronger. With a clean run that pair likely goes to notes; with it removed, the count is 3 to 0 for notes. Either way the verdict holds, but one of the four pairs is not clean evidence.
- **Format giveaway.** The tool's render is unmistakable (want/stake/how bullets, "Because of", "Pressure on", fractional years). I did not try to identify the difference in Part 1, but I cannot rule out that the render's noise and the notes' prose made the notes packets read as better thought-through than they were. Against that: the Part 1 calls on open questions and reworks rest on content that was or was not on the page (rejected alternatives, plants, places a change reached), not on tone.
- **Small sample, one model.** Four pairs, three clean, all on claude-opus-5-5, one session per cell. Session-to-session variance in a creative task is large. premise-c pair 1 was medium confidence, with an even rework 2 and two very good scenes; if it flipped, the held-back premise would be 1 to 1 and I would be closer to "change." premise-c pair 2 at high confidence is the anchor.
- **The word budget may be unfair to the tool.** Both sides were held near 1,500 words, but the tool's render spends many of them on link text. The comparison measures the tool as it is, which is right for this verdict, but a tool whose links did not count against the budget might show more story.
- **The tool's failures are self-reported.** I cannot see from the packets what `mentions` or `set-position` actually printed; I have the sessions' accounts in the gaps logs. They agree with each other across four independent runs, which is why I rely on them.
- **Some tool weaknesses may be guidance, not tool.** Deciding in summaries before adding questions, and adding candidates after the fact, could be fixed by instructions. I counted them against the tool because the notes sessions, with the same craft advice and no tool, weighed in the open without being told to.
- **A close call on drop versus change.** The result is not mixed, which argues against "change," but the named changes in question 7 are concrete, and a judge who treats the knowledge and object gaps as additions rather than a redesign could reasonably call this "change." I call it drop because no pair, no sub-question and no run shows the tool producing a better story, and because the fixes amount to a different tool.

VERDICT: drop
