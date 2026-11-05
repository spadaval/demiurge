---
status: active
last_changed: "2026-11-05: opened on Sumeet's direction of 2026-11-05 (decision worldcrafter-jeue), replacing notes-first"
---

# Why

Sumeet's direction of 2026-11-05 (decision worldcrafter-jeue) replaces the
Notes first mission (`docs/strategies/notes-first.md`) and its head-to-head
framing.

- **Head-to-head comparisons are dropped.** A short story is naturally better
  done in one shot, so a 1,500-word race against plain notes says little.
- **The last test mixed up the author's bible with the story.** Judges read the
  tool's `render` (drives, causes, "Decided" lists) as if it were the story.
  Link text was taxed against a word budget, and gap reports pushed sessions to
  delete true story. On actual prose (the 800-word scenes) the result was
  split. Drives and open questions are author-side; nobody said they have to
  appear in the text.
- **Core thesis:** a rich, full world makes the story feel more alive.

# Outcome

A demonstration of the Demiurge-assisted process, not a comparative eval. A
fresh writer agent uses Demiurge (the story CLI and its skill) to build a rich
world and outline a novel-scale story on one premise, then writes four scenes
from points the orchestrator picks. A panel of four judges reads only the
final prose, one scene and its story so far at a time, and scores it against a
fixed rubric whose thesis criterion is world aliveness. Between rounds the
tool and skill are fixed from what the writer's transcript and model show, so
the improvements show in the next round. Judge only the final prose.

# Shape

- **The bible is not the story.** The model and its render are author-facing,
  carry no word budget, and are never shown to readers or judges. Prose
  (scenes and drafts) is stored separately and linked to what each scene
  reveals, implies or withholds.
- **Open is not one state.** Undecided (an author task, with candidates and
  rejected options and their reasons kept and shown); decided but not
  revealed; deliberately left open for the reader; revealed in scene X.
  Unclosed threads are normal: short and medium stories leave most questions
  unanswered.
- **Gap reports are advisory** and never push deletion. "Actor with no drive is
  a gap" is not pressure.
- **Don't gold-plate.** The rounds show what matters.
- **Reuse** the sandbox (`app/scripts/comparison/sandbox.ts`), the judging
  runner (`app/scripts/judging/`) and the transcript check. The long-run
  harness work (worldcrafter-9ecm) is parked unmerged on
  `feature/worldcrafter-efis` and may be mined for parts.

# The exercise

- **Prompt:** "Wait. Let me get this straight. You are a warlock that doesn't
  have a single patron, but hundreds of lesser patrons all watching you at the
  same time? And... you call them 'Chat'?"
- **The writer is a subagent, never the orchestrator.** A fresh Opus 5.5
  session using Demiurge (CLI plus skill). It builds a rich world and outlines a
  much larger story (novel-scale, roughly 25 to 40 chapters' worth of beats)
  in the model.
- **Four scenes** of about 1,200 to 2,000 words each, at points the
  orchestrator chooses from the outline, not the writer: two at random and two
  at interesting turns (a reveal, a reversal, a cost being paid), spread across
  the arc. How each point was chosen is recorded.
- **A story so far** for each scene (about 300 to 500 words), written by a
  separate agent from the outline, in plain prose with no tool vocabulary.

# Verdicts

- **Four judges:** Opus 5.5, Sonnet 5.5, Fable 5.1 and Grok 4.7. Grok runs
  through the `grok` CLI (`/home/supadava/.grok/bin/grok`) headless in the same
  sandbox, its credentials mounted read-only and never written from inside; if
  it can't run headless there, through T3's `delegate_task` with
  providerInstanceId `grok`, model `grok-4.7`.
- **Each judge gets only one scene plus its story so far,** and isn't told
  about Demiurge or the process.
- **A rubric written and reviewed before any judge reads anything.** Each
  criterion scored 1 to 10, with written anchors for 2, 5 and 8 and a short
  quoted line of evidence: pacing; intrigue (does it make you want the next
  scene?); subtext; character (motive, interiority, distinct voices); prose and
  voice; tone and humour fit for this premise; **world aliveness**, the thesis
  criterion (the world feels lived-in beyond the scene, through implied
  history, institutions, economies, consequences and specific texture that
  isn't exposition); continuity with the story so far. Plus an overall score
  and the single best and worst moment.
- **Scores are reported per judge,** never as a pass/fail vote. Scores across
  rounds are indicative only. Judges stay fresh, isolated agent sessions whose
  transcripts are checked, as in decision worldcrafter-zybl.

# Rounds

Round 0 fixes the tool before any run, in this order, each independently
reviewed and merged locally:

1. Separate the bible from the prose.
2. Distinct open states.
3. Advisory gap reports.
4. Knowledge and belief: who knows or believes what, from when, and the
   versions different people tell, tied to reveals, so telling order is
   separate from true order.
5. The remaining model gaps: objects (planted in one scene, paid off in
   another), event participants, a drive's life (satisfied, renounced,
   replaced, flipped), and time finer than a year.
6. A first pass at change tracing on content: after a change, list the records
   and prose that depend on it by meaning, not just by name.

Then up to five rounds. Each runs from scratch with a fresh writer on the same
prompt, is judged, and is followed by a reading of the writer's full transcript
and model: misunderstandings of the tool fix the skill or docs; the tool doing
something stupid (bad defaults, noisy output, missed dependencies, friction
that made the writer route around it) fixes the tool. Each fix is
independently reviewed and merged locally. A round log records the tool
changes, how the writer used the tool (commands, where it struggled, what it
ignored) and every judge's scores with quotes. Stop early if a round shows no
meaningful tool or skill issues.

# Authority

As in decision worldcrafter-zybl, agents decide increments, rubrics and fixes,
each recorded and independently reviewed, and Sumeet reviews after the fact.
Only irreversible or public things wait for him: pushing, deploying,
publishing, spending money, the product's name (worldcrafter-cogw), and
destructive actions git can't undo.

# Constraints

- No `git push`.
- Credentials stay read-only in every sandbox; no sandbox writes them.
- One writer subagent at a time. The panel may run all four judges at once if
  `free -g` shows more than 5 GB available.
- Boat only for genuinely heavy builds.
- Atelier is kept current after each round.

# Risks

- Without a comparison, a good score can't be credited to the tool; this is a
  demonstration, and the round log is its main evidence.
- Judges are agents and may prefer what an agent writes.
- Fixes chosen from one writer's transcript may fit that writer only.
