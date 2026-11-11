---
status: superseded
last_changed: "2026-11-05: superseded by Sumeet's direction (decision worldcrafter-jeue); head-to-head comparisons and the notes-first framing are dropped, and what follows is docs/strategies/world-demo.md"
---

# Result

Superseded on 2026-11-05 by Sumeet's direction (decision worldcrafter-jeue) before any long run. The rest of this file is kept as it stood. What follows is `docs/strategies/world-demo.md`.

# Why

The Structure first mission (`docs/strategies/structure-first.md`) bet that a
typed story model would make an agent better at finding a great story than the
same agent with plain notes. Two blind comparisons said no. Every judge
preferred the notes arm in every clean pair, the second verdict was drop, and
the notes sessions did unprompted what the tool was built for: they kept
rejected alternatives with reasons, weighed candidates and followed reworks
through (decision worldcrafter-03rp, `docs/verdicts/`).

So the baseline is strong: a capable agent, the craft advice and plain markdown
notes. Those comparisons only judged short sketches, reworks and one scene,
where an independent reading found little the notes arm got wrong. The
product's goal is still a great finished story, made easier to tell. Before
anything is built, we need to know where that baseline actually falls short on
the way to one.

# Outcome

We know, from runs judged by an independent panel, where an agent working in
plain notes with the craft advice falls short when it takes a premise to a
finished story that no session re-reads whole. In practice that means a
novella drafted across many fresh sessions. Each session sees the notes in
full but may read only a fixed share of the draft, smaller than the draft, and
the harness measures what it reads. The budget stands in for a novel too long
to re-read every session, at a novella's cost, so the notes have to carry the
story and "notes are enough" can't come out true by construction. One of two
things then
follows. An aid aimed at the costliest shortfall beats plain notes in a blind
comparison and is kept. Or the record says that no aid is needed, or none
worked, and that the product for now is the craft advice plus notes.

Worth having on its own: the ranked list of shortfalls, even if no aid follows.

# Shape

- **The notes are the story.** Plain markdown in git, readable and editable by a
  human and an agent alike, in whatever shape the session finds useful. No
  schema is imposed on them.
- **Aids are bets over the notes.** An aid can be a script, a check, a skill
  or a change to the craft advice. It reads the notes and reports, and it never
  rewrites them or requires them to change shape. Each is tested on its own,
  blind, against the same agent with plain notes, with a judging panel (see
  Verdicts), and is kept only on a keep verdict.
- **Find the headroom first.** An aid is built only for a shortfall that judged
  runs have shown costs the story. The comparisons showed that an aid aimed at
  slips the judges don't weigh can't be measured.
- **Reuse what exists.** The comparison harness (`app/scripts/comparison/`),
  the panel runner (`app/scripts/judging/`), `craft.md` and the Verdicts
  procedure carry over. The typed-model CLI and skill are not built on.
- **Form follows results** (decision worldcrafter-45an). Nothing on a screen
  until a verdict asks for it. The rebuilt app (`.atelier/missions/worldcrafter-3otd/mission.md`)
  is neither used nor retired here.
- **When qualities conflict:** the quality of the story as the panel judges it,
  then the cost of finding out, then speed.

# Verdicts

Carried over from structure-first, where it was decided (decision
worldcrafter-zybl). Sumeet isn't the gate; he can read the reports afterwards
and overturn a verdict.

- **Panel.** Exactly three judges, on Opus, Sonnet and Fable. They are fresh
  agent sessions that didn't build the work, and they judge independently.
- **Isolated.** Each judge can reach only the material under judgment and the
  rubric, pinned at a named commit. Its transcript is checked for reads beyond
  that. A judge whose run fails, or which reached beyond its material, is
  replaced by a fresh judge on the same model, and the replacement is
  recorded. A flag from the check starts a diagnosis; it doesn't replace a run
  by itself.
- **A rubric fixed before anyone reads.** It is written, reviewed and
  committed before the judges see the material, and it doesn't change once
  judging starts.
- **Recorded and checked.** Each report goes into Atelier as evidence. A
  fresh reviewer checks only that the procedure held before the next step
  starts.
- **Comparing arms** (an aid against plain notes) adds blindness and a call.
  Each judge first files a blind Part 1, whose wording doesn't hint at which
  arm is which, and it is recorded before anything more is seen. Part 2 is a
  fresh session of the same model, given its Part 1, the material and the key.
  Each judge calls keep, change or drop with reasons. The verdict is the call
  at least two of the three make, or change if all three differ.
- **Reading one arm** (as in a run that looks for shortfalls) has no key and
  no keep, change or drop. Each judge files one report against the rubric. The
  result is what at least two of the three name, and the rubric says how they
  are ranked.

# Scope

In: long runs with plain notes, panels that read them, and aids aimed at what
those runs show, each tested blind.

Out: the typed story model and its views, arrangement, anchored prose,
inspection and lenses (superseded with structure-first); screens; testing
co-authoring with a human (Sumeet: if the agent-first approach works, that's
the answer).

Environment: agent sessions on the author's machine, on the same authoring
model as the comparisons unless a decision changes it.

# Authority

As in structure-first (decision worldcrafter-zybl): agents decide the
increments, the success criteria, the premises, the rubrics and keep, change or
drop. Each choice is recorded as an Atelier decision and independently reviewed
before the work it governs proceeds, and Sumeet reviews after the fact and can
reverse it. Only irreversible or public things wait for him: pushing,
deploying, publishing, spending money, the product's name (worldcrafter-cogw),
and destructive actions git can't undo.

# Risks and Unknowns

- A long run may not show shortfalls that matter, because notes and a capable
  agent may be enough. That is a useful result, and the mission can close on
  it.
- Long runs cost more than sketches, and a single story is noisy. A few runs on
  one fresh premise is the first measure, with no comparison until there is
  something to compare.
- The judges are agents, mostly from the authoring model's family, and may miss
  what a human reader would feel, or prefer what an agent writes.
- How long is long enough to stress the notes, without making each run too
  costly, is the first increment's unknown.
