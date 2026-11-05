# Part 2: with the key open

I read the key, my Part 1 report (`my-part1.md`, which I haven't changed), all four model-gaps logs and `failures.md`. I also looked back at the packets to check which format belonged to which arm. The tool packets are the structured ones ("Wants / At stake / How / Comes from / Opposed by"). The notes packets are prose.

## How my Part 1 calls map onto the key

| Pair | Tool packet | My preference | Went to | Confidence |
|---|---|---|---|---|
| Thukker 1 (tuned-on) | B | A | notes | medium |
| Thukker 2 (tuned-on) | B | A | notes | low |
| Magical girl therapist 1 (held back) | A | B | notes | low |
| Magical girl therapist 2 (held back) | B | A | notes | low |

I preferred the notes packet in all four pairs. Three of those four calls were low confidence.

Here is how the tool did on each sub-question:

- **Reworks followed through (Q3).** This is the job the tool is meant to help with. Of the eight rework comparisons:
  - The tool won 2, both in held-back pair 1, where packet A was better on rework 1 (slightly) and on rework 2.
  - Notes won 5: both reworks in Thukker 1, rework 1 in Thukker 2 (slightly), and both reworks in held-back pair 2.
  - One was roughly even, with notes slightly ahead (Thukker 2, rework 2).
- **Open questions held usefully (Q2).** Notes did better in Thukker 2, held-back pair 1 and held-back pair 2. Thukker 1 was about even. Not one tool packet showed candidates being weighed or kept anything meaningfully open. Several deleted Decided answers without comment.
- **Scene (Q4).** Notes won three. The tool won only in Thukker 2, and only slightly.
- **Has what it needs (Q5).** All eight passed. The tool packets list wants and opposition most explicitly, but the notes packets had them too.

## 6. Keep, change or drop the tool

**Change. It is close to drop.**

On the page, the tool didn't make the stories better. Notes won every pair, and the tool lost most rework comparisons, which is the area it exists to help with. That alone points to drop. I am still calling change, for two reasons.

**1. The held-back premise isn't a clean loss.** In held-back pair 1 the tool session followed both reworks through better than the notes session. Its rework 2 caught a dependency the notes session would likely have missed: it replaced June with Sade in Dani's earlier panic attack, because June couldn't have covered Dani before she had the Bright. Meanwhile the notes packet left "Twenty years ago" standing against "sixteen years" and "You were seventeen". That is exactly the kind of win the tool is supposed to deliver. I still preferred the notes packet in that pair, at low confidence, for its opposition and its scene, not for its follow-through. In held-back pair 2 the tool lost on both reworks and on the scene, though only narrowly on rework 2.

**2. The logs show the main harm comes from one fixable part of the tool, not from structured notes as such.** All four tool logs report the same thing: the readable render repeats wants, relations and constraints, so the ~1,500-word target forced the model to delete true links, settled questions and rejected candidates.

- 6ae4e0b3 deleted three settled questions, including "did Mira cause the accident?"
- e388bae7 deleted "why he left", "what he seeks" and others, and removed the alternatives for Ondrai.
- 3c094cd9 weighed where Halsey Street should fall "in my head and left no record" because an open question would have printed.

This matches the faults I marked blind in Part 1: tool packets "show no alternatives being weighed", and Decided entries were "dropped without comment". So the tool's worst effect on the page came from its render budget. A change can remove it.

If the named changes below don't turn this into at least an even result on a fresh held-back premise, the next verdict should be drop.

**How much the tuned-on pairs moved me: very little, and if anything towards drop.** Thukker might have flattered the tool, but it didn't. The tool lost both Thukker pairs, Thukker 1 at medium confidence. So the tuned-on pairs give no reason to read the held-back result more kindly. They add only modest weight against keeping the tool as it is.

## 7. What was missing

The logs and packets show a need for all four of the things the rubric names. In priority order:

**1. Different rendering and gap reports. Change this first.** Every log reports cutting true structure to fit the length target. The specific complaints are:

- wants quoted again under every relation and pressure
- relations shown under both actors
- constraints printed even when positions already imply the order
- decided questions repeating the event, drive and scene that carry them out
- present-day events duplicating scenes

Needed changes:

- A "settled, absorbed or superseded" state that keeps a question and its rejected candidates in the file but out of the render. This also gives a record of what a rework replaced, which three logs asked for.
- A cheap "working, don't print" state for weighing candidates.
- A render that prints each want once and refers to it by name after that.
- No printing of constraints the positions already satisfy.

The gaps check should also accept a "deliberately has no origin" mark (Velan in 6ae4e0b3, Ondrai in e388bae7). And it should flag constraints that are still satisfied but now say the wrong thing after a move ("before" at a gap of zero, 12ed319c).

I'd do this first because it is the one problem that degraded every tool packet, and it works directly against the tool's purpose. In my Part 1 misses, the tool packets lost exactly the history and links that following a rework through depends on.

**2. A chain of causes ("because").** This was the most important missing type of link.

- e388bae7: moving Aino's desertion turned it from an effect into a cause, and "the timeline check had nothing to object to". The swap's motive went quietly wrong.
- 12ed319c: the model wanted "during, and causing part of".
- 6ae4e0b3: the model lost "this happened because of / right after that" when it swapped constraints for positions.

A cause link between events, with moves checking that each cause still comes before its effect, would have caught several of the misses I noted. One example is how the swap ends the hunt for Aino in Thukker 2-B, which the packet asserts without explaining.

**3. A way to reach what text only mentions.** Three logs found stale free text by reading:

- "three years dead", the funeral and the wreck count (6ae4e0b3)
- "spring" and "months" (12ed319c)
- the summaries implying Orsa's guilt (e388bae7)

The faults that got through are the same kind. Orsa still "Opposes Hask" in Thukker 2-B. In held-back 2-B, "I want to pick up" appears two sessions after Ruth's winter visit, yet Ines doesn't pick up until autumn. Summaries that can refer to records ("[Mira fused]'s year"), or a move that lists every record whose text names the moved event, would make `touches` reach where the story actually lives.

**4. Types the model lacks.** These are named repeatedly across the logs:

- plant and payoff (all three Thukker and held-back logs mention a motif or plant)
- mirrors and echoes between characters or events (Noreen/Dani, Ines's mother/Dee's father, Hask/Kiri)
- a drive outcome such as given up, met or thwarted
- an intended ambiguity, as distinct from an open question
- a reveal that changes what a past event means
- an event that happens between scenes
- finer-than-year time positions, needed in two logs

These matter, but less than the first three. The stories got by with free text for them. The render-budget harm and the missing cause links did more damage.

## 8. Doubts

- **Format giveaway.** The two arms look different on the page, and I noticed it in Part 1. I tried to discount it, but in held-back pair 2 I wrote that B's "structured format spreads attention across many threads". So format did enter at least one judgement. The render is part of what the tool produces, so this isn't purely bias, but a list-style packet may read worse than the story behind it is.
- **Close calls.** Three of my four preferences were low confidence, and several rework calls were "slightly" or "roughly even". A different judge could flip held-back pair 1, or Thukker 2, without either of us being wrong.
- **Too few runs.** There was one run per arm per pair: four pairs, only two of them held back. The held-back evidence is two comparisons, and they point in opposite directions on follow-through.
- **No failed runs, but some runs reached outside their directories.** `failures.md` reports 0 of 8 failures, but several runs wrote outside the allowed directories:
  - Two tool runs, 6ae4e0b3 and e388bae7, ran CLI and shell pipelines that `failures.md` flags as outside.
  - Two notes runs, c04e6f44 and a0d95482, wrote scratch files to `/tmp`.
  - c04e6f44 used a scratch "working-notes" file to weigh three rework candidates. That may be part of why Thukker 1-A's rework 1 was so good, and the tool arm had no cheap equivalent (see 3c094cd9). This is a real difference between the arms, though arguably it is a fair finding about the tool.

  None of these looks like it corrupted a packet.
- **Same model family.** The sessions ran on Opus, and so does this judge, so I may favour prose that reads like my own.
- **Length target.** Both arms seem to have had the same ~1,500-word target. For the tool, words spent on structure came out of story. This counts against the tool's current design rather than excusing it, but it means the verdict judges this render as much as the underlying model.
- **Missed faults.** My Part 1 misses were found by reading. I may have missed faults in either arm, which would shift the rework tallies.

VERDICT: change
