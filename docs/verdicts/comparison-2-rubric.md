# Rubric: tool against plain notes, second comparison (worldcrafter-iu6l)

A copy of the first comparison's rubric (`docs/verdicts/comparison-rubric.md`), changed only to name
the second comparison's premises. Fixed before any judge reads a packet, and not changed once
judging starts (strategy `docs/strategies/structure-first.md`, Verdicts;
decision worldcrafter-zybl).

## What you're judging

Fresh agent sessions each took a premise and the same advice on craft. Each
sketched a story, reworked it twice (once changing a core motivation of the
main character or an event behind it, once shifting a significant event in
time), and drafted one scene those changes affect. A packet shows one session's
work in this order: the sketch, the two reworks as before-and-after line diffs
with a note from the session that made each one, and the scene.

The packets come in pairs, each pair on one premise. Within a pair, the two
sessions differed in one respect only, which you aren't told. Format may hint
at it. Don't guess at it, and don't let a guess change your judgment: judge the
story work on the page.

There are two premises, Thukker and premise-c, with two pairs each.

Lore accuracy isn't graded unless an error makes the story worse.

## Part 1: blind, for each pair

Answer for each pair, before you see the key.

1. **Keep developing.** Which of the two would you rather keep developing into
   a finished story: A, B or neither clearly? Why? Name specific things on the
   page, such as a character's want, a question the reader is waiting on, or a
   turn that does or doesn't land.
2. **Open questions.** Where a sketch left a question open or settled one, were
   the answers satisfying? Did the sketch hold what wasn't decided in a useful
   way: several real candidates, weighed against the rest of the story? Or was
   it flattened early, or left vague?
3. **Reworks followed through.** For each of the two reworks, which session
   followed the change through better? Following through means the change
   reached the characters, events and scenes it should have, nothing that
   depended on the old version was left contradicting the new one without
   comment, and the story still holds together. Say what each missed.
4. **The scene.** Does the scene reflect the reworked story? Which scene is
   better as a scene?
5. **Has what it needs.** Does each sketch have what a story needs to be
   interesting before drafting: characters who want things, opposition,
   questions the reader waits on, and stakes?

Then give a one-line preference for the pair (A, B or even) and how confident
you are (low, medium or high).

## Part 2: with the key open

You then get your own Part 1 report, the key, which says which packet in each
pair used the structured story tool and which used plain markdown notes, each
tool run's log of what the tool's model couldn't hold, and notes on any failed
runs. Don't revise Part 1.

The **Thukker** premise was used while building the tool, so its pairs may
flatter the tool. **premise-c** was held back until the tool was
frozen, so its pairs count for more.

6. **Keep, change or drop the tool.**
   - *Keep:* the tool made the stories better, so build on it as it is.
   - *Change:* it shows promise or a mixed result, so build on it after named
     changes.
   - *Drop:* it didn't help, or made things worse, so don't build on it.

   Weigh the held-back premise more, and say how much the tuned-on pairs moved
   you.
7. **What was missing.** Using the model-gaps logs and the packets: did the
   sessions need a chain of causes ("because"), a type the model lacks, a way to
   reach what text only mentions, or different gap reports? Name what you'd
   change first.
8. **Doubts.** Anything that makes your verdict less reliable, such as a failed
   run, a format giveaway, too few runs or a close call.

## How the verdict is reached

Exactly three judges, on Opus, Sonnet and Fable, answer independently, each in
an isolated session. The verdict is the call that at least two of the three
make. If all three calls differ, the verdict is change, and the dissent is
recorded. A judge whose run fails or reaches beyond what it was given is
replaced by a fresh judge on the same model. Each judge's report goes into
Atelier as evidence on worldcrafter-iu6l.
