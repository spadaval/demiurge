# Part 2: with the key open

My Part 1 report (`my-part1.md`) is unchanged. Here is how its preferences line up with the key:

| Pair | Tool packet | My Part 1 preference | Confidence | Who won |
|---|---|---|---|---|
| Thukker 1 (tuned-on) | A | B | medium | notes |
| Thukker 2 (tuned-on) | A | even | low | tie (the notes run failed) |
| premise-c 1 (held back) | B | A | low–medium | notes |
| premise-c 2 (held back) | A | B | medium–high | notes |

I didn't prefer the tool packet in any of the four pairs. On the held-back premise the notes packet won both pairs, one of them clearly. The tool's best result was a tie on a tuned-on pair, and only because the notes run in that pair failed partway through.

## 6. Keep, change or drop the tool

**Drop.**

**Held-back premise (premise-c), weighted most.** The notes sessions were better in both pairs on almost every question I asked:

- **Keep developing:** notes both times. In pair 1, Ruth's forty dollars and the Dale lock gave the notes sketch a sharper engine. In pair 2, the red mackinaw and Ruth's lie told twice did the same.
- **Open questions:** notes both times. The notes sketches showed their weighing on the page: "Rejected" alternatives with reasons in pc1-A, and candidate lists for who burned the mill in pc2-B. The tool sketches gave flat "Decided" lists. pc2-A even settled its one open question during a rework without comment. The tool has open questions and candidates as a record type, so this is the area where it should have helped most. In the rendered sketches it didn't.
- **Reworks followed through:** notes in all four held-back reworks (pc1 rework 1 and rework 2, pc2 rework 1 and rework 2). Carrying a change through is what the tool is built for, so this weighs most against it. The gap logs back this up from the tool's side. In both premise-c tool runs, `mentions` and `set-position` missed most of what depended on the change: "`mentions` after the move missed the scenes", "Moving an event didn't flag what its new date implies… I found them by reading the render". The tool sessions caught their leftovers by reading the render, which is the same thing the notes sessions did.
- **Scene:** split. The tool won pc1 slightly ("The hook") and lost pc2 ("The Viewing" beat "The deed on the flour bin").
- **Has what it needs:** both tool sketches had what a story needs, but each was weaker in places: Doak in pc1-B; June, Amstutz and an accidental fire with no one behind it in pc2-A.

**Tuned-on premise (Thukker), and how much it moved me.** These pairs barely moved me, and they didn't move me toward the tool. In pair 1 the notes sketch had the stronger engine. The tool won rework 2 there, but only on tidiness. In pair 2 the tool did better on execution: both reworks done, and a scene that matches its sketch. But that win rests mostly on the notes run failing (rework 2 missing, and step 4 changed story.md). Even against a broken notes run, I judged the notes story the better story. If the tool can't win clearly on the premise it was tuned on, the held-back result looks like the real one, not bad luck.

**Why drop rather than change.** "Change" is for promise or a mixed result. The only promise I can point to is modest. Tool sketches were consistently orderly, and some tool reworks were tidy (Thukker 1 rework 2, Thukker 2 both reworks). But the tool sessions paid for that order on the page:

- The gap logs say rendered links cost words. Sessions cut true pressure links, merged events, and dropped a minor character "because an actor with no drive shows up as a gap" (40d78a42, ac0caf8b, d8577118). That goes against the tool's own advice to "cut story, not links".
- The tool's change-tracking, which is its main reason to exist, missed the dependencies in every run's logs.

A tool that adds overhead and doesn't catch what it exists to catch hasn't helped. If the project still wants a structured tool, I'd treat the next version as a rebuild around the changes in question 7, tested again from scratch, not as building on this one.

## 7. What was missing

Taking each candidate the rubric names:

- **A chain of causes ("because"):** partly there, but not enough. Causes exist, but they only check order in time, not meaning. 40d78a42 put it best: "A move that keeps causes 'valid' in order can still leave them wrong in meaning; nothing prompts you to re-check them." d8577118 found that causes don't affect story order at all. When a cause was reversed, nothing offered a replacement. The tool needs to ask, after a move, "is each cause into or out of this event still true?", not just "is it still in order?"
- **Types the model lacks.** The same gaps come up across runs, and they are the stuff these stories run on:
  - **Who knows what, and what each person believes.** This is the biggest gap. It came up in 396ea293 (secrets, the town's versions, witnesses) and in d8577118 (Lew's false belief, the public accounts). Both premise-c stories are about secrets, so this mattered most on the held-back premise.
  - **Objects:** the knife, the sack hook, the letter, the coat.
  - **Who did an event:** event agents. 40d78a42 needed this to trace who sold the core.
  - **Promises and debts between people.**
  - **Time finer than a year:** days or named days. Both premise-c runs used fractional years like "1954.786".
  - **A drive's history and state:** satisfied, given up, replaced, or flipping from ally to opponent.
- **A way to reach what text only mentions:** this is the most direct failure. `mentions` matches by name, year and span. So it missed "his dead wife", "only here to bury his mother", the old motive in scene summaries, and everything that depended on a date (ac0caf8b, d8577118, 396ea293, 40d78a42). Every tool run ended up reading the whole render by hand, as the notes runs did.
- **Different gap reports:** yes. Reporting an actor with no drive as a gap pushed sessions to delete minor characters. The deliberate-gap flags went stale silently (ac0caf8b). Gap and length pressure fought each other: sessions cut links, then put them back to close gaps.

**What I'd change first:** make change-tracking reach the text. After any change to a drive, event or position, the tool should show every record whose meaning depends on it: free-text summaries, scenes, causes and decided answers. "Same name" isn't enough. That is the tool's core promise, and in every run it was the thing that failed. Second, add a knowledge/belief record (who knows or believes what, and from when), since that's what both held-back stories turned on. Third, stop counting links against the word budget: keep links in the model and leave them out of the readable form unless asked, so sessions stop trading true structure for length.

## 8. Doubts

- **Format giveaway.** The tool packets all share a template ("People and groups / Events, in story order / Scenes, in telling order / Decided"), and the notes packets are free-form. I noticed this in Part 1 and set it aside, but I could tell the two kinds apart in every pair. That may have biased me, though I didn't know which kind was the tool. The template also made the tool sketches read as more list-like, which is part of what I marked down, so part of my judgment may be about the render's format, not the story thinking behind it.
- **A failed run.** The notes run in Thukker pair 2 (04648983) failed at step 3 (rework 2 missing), and its step 4 changed story.md. That pair is close to useless as a comparison. Its scene also contradicted its sketch, which may come from the failure, not from the method.
- **Too few runs.** Only four pairs, two of them held back, one run per arm per pair, all on one model (Opus). Two held-back wins are a consistent signal, not a strong one.
- **Close calls.** premise-c pair 1 was low–medium confidence. With pair 1 flipped, the held-back result would be 1–1 and I'd lean "change". premise-c pair 2 (medium–high) carries most of the weight.
- **Variance within each arm.** Differences between pairs may come from run-to-run variance in how a session reads a premise (Ruth's forty dollars, the red coat) as much as from the tool or notes.
- **Steps outside the allowed directories.** These were harmless as far as I can see. Notes runs wrote helper scripts to /tmp. One tool run piped the CLI's render through awk to count words. Neither changes the comparison.
- **I'm one judge of three.** My verdict counts as one call.

VERDICT: drop
