---
status: superseded
last_changed: "2026-11-05: superseded; the typed-model bet ended on the second comparison's drop verdict, and what follows is docs/strategies/notes-first.md (decision worldcrafter-03rp, agents' decision under worldcrafter-zybl)"
---

# Result

The bet this strategy rests on lost. In two blind comparisons, plain notes beat
the typed model, and the second verdict was drop (worldcrafter-i2uz,
worldcrafter-iu6l, `docs/verdicts/`). Decision worldcrafter-03rp ends the mission
and supersedes its backlog. The rest of this file is kept as it stood, for the
record. What follows is `docs/strategies/notes-first.md`.

# Why

A story is easiest to make satisfying at the structural level, where one
change reaches every scene it touches. A story in the writer's head is
high-dimensional, and a page is linear: writing it down too early flattens it,
and after that it stops evolving. That is why most stories never leave the
head.

The rebuild (`docs/strategies/rebuild.md`) gave Demiurge a sound
foundation for prose: stable block IDs, AI projections, generation with
visible context, a storage adapter and story time. But it was planned as a
manuscript tool. Decision worldcrafter-ok5a makes it structure-first: the
world and the plot are the structure, the AI inspects them while they're still
exposed, and prose is the finish, anchored to the structure rather than
compiled from it (`docs/rebuild/story-model.md`).

Outlining tools already exist (Plottr, Dabble's plot grid, Scrivener's
corkboard), but their structure is cards and rows the app doesn't understand.
Demiurge's structure is a typed model of actors, drives and questions that
the app can check, and that prose hangs off.

Holding a story is only half of it. Stories get made by picking elements that
seem interesting and weaving them into place, jigging things around until they
fit. That is what fluidity means here, and it isn't a stage after the first
draft: it's how the story gets found. Nabokov's version: "I fill in the gaps of
the crossword at any spot I happen to choose." A story stays alive while its
makers can jump between its levels and sides, try answers to what's still open,
and rework it in the abstract: shift when something happened, change why a
character acts, or change the events that made them want it.

The goal is to make it easier to tell great stories, by making sure a story has
what it needs to be interesting before final drafting begins. The user is a team
of a human and an agent, so the model has to make sense to both, and an agent
using it to write well counts as success. Whether the model makes that team
better than the same team with plain notes is the mission's main unknown.

We use AI to assist and enhance the creative process, up to and including writing
the story, because we think that's the best way to create compelling stories. We
don't see AI-written work as inherently good or bad. Our hunch is that a story
needs to be co-authored by a human and an AI to be good, which is a reasonable
belief but an unverified one. What we don't want is a slop cannon: volume that
nobody has judged. The product's form, web app or otherwise, follows the results
(decision worldcrafter-45an).

# Outcome

A team can start from a premise, hold a story at any level of detail, move
between its levels and sides in any order, find satisfying answers to its open
questions, and rework it at the highest level where a change applies, seeing
what each change touches and what the story still lacks. The structure is a
graph of actors, drives, questions, events and scenes, seen through outline
and weave-grid views, never stored as a linear document. Scenes can be
rearranged freely, with their prose travelling with them and reveal-order
problems flagged. Prose is written by hand or drafted from the structure, and
is marked stale when the structure under it changes. The app points out
structural problems while they're still cheap to fix.

Worth having on its own: `sketch` and `rework`, headless, used by an agent in an
ordinary session. If that doesn't beat the same agent with plain notes, the rest
of this plan should change.

# Success Criteria

- sketch: From a short premise, an agent working alone can build a story in the
  model, working at any level and side in any order: elements that aren't woven in
  yet, open questions with candidate answers, and contradictions it hasn't
  resolved. It can see what each candidate declares it would connect to, one step
  on from there, and what the story lacks, such as a character with no drive or a
  drive nothing opposes. Shown by a comparison read as blind as is practical: fresh
  sessions take the same premise and the same craft advice, with the tool and with
  plain notes, and a judging panel (see Verdicts) reads the results without being
  told which is which and says which they'd rather keep developing. Format may give an arm away, which
  is accepted. One premise is held back until the tool is frozen.
- rework: From any character, event, drive, scene or open question, the team can
  see everything connected to it and go there. They can shift an event, change a
  drive, or change an event behind a drive, and see what the change touches
  before deciding what to change next. Nothing moves or is rewritten silently,
  and a contradiction stays until the team resolves it.
  Shown by scenario tests over a fixture story and by the comparison, where fresh
  sessions see only the saved sketch, change a motivation, shift an event and draft
  a scene those changes affect, and the judging panel judges how well each
  followed through.
- on-screen: A writer can do `sketch` and `rework` on a screen, jumping between
  levels and sides without losing their place. This is the part of fluidity a
  conversation can't test, and a bet like any other: it comes out if a judging
  panel decides, from the verdicts, that the best stories don't need a screen.
  Shown by component tests and by an agent validator using it in a browser on a
  real story, judged by the panel.
- coarse-to-fine: A story can exist as a premise alone and be refined into
  books and chapters, scenes and beats, in any order: a scene can have a summary
  and beats before it has a place in a chapter. Outline and weave-grid views are
  derived from the structure; neither is stored as a document. The weave
  grid's rows are questions and drives, and threads join them with `lenses`.
  Shown by tests over a fixture story at several levels of detail.
- arrangement: Chapters are packaging over scenes. Moving a scene between
  chapters carries its prose with it.
  The manuscript is a view assembled from the arrangement. After a move, the
  app flags questions progressed or answered before they open, story-time
  constraints the new order breaks (the rebuild's story-time model), and the seams: the
  moved scene's opening and closing and the facing ends of its old and new
  neighbours. Checking that a scene relies on something the reader hasn't
  learned yet waits until the model records what scenes rely on. Shown by
  scenario tests over a fixture with a flashback.
- anchored-prose: Each passage is anchored to a scene or beat, and reordering
  passages within a scene carries their prose with them. A passage can be
  hand-written or drafted, and drafting assembles its context from the
  structure: the actors' drives, the open questions, and what the reader knows
  at that point. When the structure under a passage changes, the passage is
  marked stale, and the writer chooses to rewrite, redraft or keep it. Shown by
  scenario tests against a stub OpenAI-compatible server.
- inspection: A question ledger (questions open too long without
  progress, promises with no planned payoff), a collision map (actors with no
  opposition, drives that never meet in a scene) and a list of scenes that move
  no question and pressure no drive are computed from the model without the AI.
  They report when asked and never block anything. Shown by tests over fixture
  stories with planted problems. The first few reports arrive with `sketch`.
- lenses: The writer can create, name and curate threads over the
  primitives, and see them as weave-grid rows, and can trace an actor's arc
  (its drives and state across scenes). The AI can propose threads and their
  membership as inferred data, and the writer's corrections win. Shown by
  scenario tests.

# Shape

- **Value decides.** Each increment leaves the team something to try on a real
  story, and tests the biggest open bet first. It ends with a judging panel's
  verdict (see Verdicts): keep, change or drop. Tests show a thing works; only use
  shows it is worth having. Later increments are bets, not commitments.
- **The user is a team.** A human and an agent work on the same model, so it has
  to be readable by both. Building for the agent side first is fine, and an agent
  can drive alone and reason beyond the model. An independent panel's judgment
  settles whether the result is any good, and Sumeet can overturn it when he
  reviews it after the fact.
- **Headless first.** The first version is a CLI and a skill, used in an ordinary
  agent session, over one readable file per story in git. Screens, the storage
  collections and their upgrades wait for a verdict that supports them. This is a
  way to find out. The web app (decision worldcrafter-gcox) is the current plan
  and not a commitment: if the best way to get a good story is an agent with an MCP
  server, a database and a skill, that's what this becomes (decision worldcrafter-45an).
- **Fluidity is how stories get made.** Start anywhere. An element can sit in the
  model with nothing connected to it, and blank squares in the crossword are
  normal, so a gap report never reads as an error. Each answer constrains the ones
  crossing it, which is why connections are the thing to get right.
- **Open questions are records.** "Why did he leave?" can stay unanswered, holding
  candidate answers and what each is declared to connect to, so a candidate can be
  weighed against the story before anyone commits to it. A conflict that's been noticed can be one too. How
  much a candidate touches is a signal, not a score: the most connected answer
  isn't always the most satisfying, and that call is judgment.
- **Builds on the rebuild.** Platform, storage, the LLM client, model
  control, stable IDs and story time are as in `docs/strategies/rebuild.md`.
- **Structure is a graph, not a document.** Outlines, lists and grids are
  views. Change things at the highest level where they apply.
- **Primitives and lenses** (`docs/rebuild/story-model.md`). Tools reason
  about the primitives: actors, drives, questions, open questions, events, scenes
  and world facts. A question is what the reader is waiting for; an open question
  is what the story's makers haven't decided. Threads and arcs are writer-owned lenses over them.
- **Scenes and entries stay documents** (decision worldcrafter-9zj1, amended
  by worldcrafter-ok5a). A scene is a structural unit first, and its prose is
  a set of passages anchored to its beats. The manuscript is only ever a view.
- **The film-editing model.** The structure is the script, prose is footage,
  and the arrangement is the edit. Prose is anchored, not compiled.
- **Contradiction is material.** Stories run on motivations that pull against
  each other and events that overlap, and early on they are full of
  contradictions. Much of the tension comes from resolving them satisfyingly. So
  the app holds contradictions, shows them and never refuses them; resolving one
  is the team's act.
- **Connections carry the leverage.** A change reaches only what is linked to
  it, so links between events, drives and scenes matter more than fields inside
  them. The tool shows what a change touches; the team decides what follows. The
  tool itself doesn't rewrite free text.
- **Inspection before generation.** Deterministic checks over the model come
  before AI features. They inform and never gate. The AI proposes and infers; the
  writer's corrections win.
- **The unreliable narrator is out of scope.** What the telling states is true
  in the world. Characters can still believe false things.
- **When qualities conflict:**
  1. The quality of the story, as the judging panel judges it, and as Sumeet
     judges it whenever he reviews.
  2. The writer's visibility into and control over the AI.
  3. Leverage: structural changes are cheap and propagate.
  4. AI capability.
  5. Feature speed.

# Verdicts

Each increment ends with keep, change or drop, decided by a judging panel of
agents (decision worldcrafter-zybl). Sumeet isn't the gate; he can read the
reports after the fact and overturn a verdict.

- **Independent and isolated.** Judges are fresh agent sessions that didn't build
  the work. Each runs isolated, as the comparison's sessions do: it can reach only
  the material under judgment and the rubric, pinned at a named commit, with no
  access to the repository, Atelier, git history, handoffs, the key or other
  judges' reports. Each judge's transcript is checked for reads beyond what it
  was given.
- **Blind, in two parts.** Where the work compares arms, a judge first files a
  blind report (Part 1), recorded as evidence before it sees anything more. Part 2
  is a fresh session of the same model, given its own Part 1 report, the same
  material and the key, which makes the keep, change or drop call and leaves Part
  1 as it was.
- **Exactly three judges, on three models**: Opus, Sonnet and Fable, so two of
  the three differ from the authoring model. They judge independently. A judge
  whose run fails, or whose transcript shows it reached beyond what it was given,
  is replaced by a fresh judge on the same model, and the replacement is recorded.
- **A rubric fixed before anyone reads.** It is written, reviewed and committed
  before the judges see the material, says what to judge and how to weigh it,
  and doesn't change once judging starts. Part 1's wording says nothing that
  hints at which arm is which.
- **Each judge records** keep, change or drop with reasons, and answers every
  rubric question.
- **Aggregation.** The verdict is the call at least two of the three judges make.
  If all three differ, the verdict is change, because it keeps the work while
  naming what to fix, and the dissent is recorded. "Drop" is a useful result.
- **Recorded.** Each judge's report and the verdict go into Atelier as evidence on
  the verdict item, which closes with the verdict and the next step.
- **Checked, then acted on.** The panel is the review of the outcome. Before the
  next increment starts, a fresh reviewer checks only that the procedure held:
  the rubric commit, the isolation and blindness, the number of judges and their
  models, and the rule applied. The next increment is then chosen from the verdict
  and the changes the judges name.

# Scope

In scope:

- the story primitives and their commands
- a CLI and skill over them, and the comparison against plain notes
- seeing what a change touches, and focus and timeline views
- outline and weave-grid views
- arrangement: chapters, scene moves, seam, question-order and story-time checks
- anchored prose, passage reordering and staleness
- deterministic inspection
- threads as lenses

Out of scope:

- playing an actor ("what would X do?")
- voice profiles
- the entity pipeline, discovery and bookkeeping, AI edit proposals and talk
  pages (in the backlog, to be re-planned under the story model)
- sync, the inference proxy and server-side jobs
- the unreliable narrator
- strict continuity checking. A canon database like Lucasfilm's Holocron is
  useful for keeping a franchise consistent across many authors, but it treats
  the story as settled and polices it. This app is for a story still in motion:
  it shows what a change touches and where the story conflicts, and it doesn't
  keep an official canon, rule on what's correct or hold back a change.

Environment: as in the rebuild. One user (the author), desktop Chromium and a
phone, local llama.cpp and hosted OpenAI-compatible providers. The headless
version runs in an agent session on the author's machine.

# Authority

The orchestrator may change, without asking:

- the increments, their sequencing and the issues
- libraries within the Shape
- how the views look and are laid out

These are decided by agents, each recorded as an Atelier decision and
independently reviewed by an agent that didn't make it before the work it
governs proceeds. Sumeet reviews them after the fact and can reverse any of them
(decision worldcrafter-zybl):

- the success criteria
- the primitives and lenses, and how scenes relate to documents
- adding a backend service
- reopening decisions worldcrafter-ok5a, worldcrafter-gcox or the platform
- keep, change or drop after trying an increment, by a judging panel (Verdicts)
- the premises, and the rubric the judging panel uses

Only these wait for Sumeet, because they're irreversible or public:

- pushing to the remote, deploying or publishing anything
- spending money, such as buying a domain
- the product's name and anything published under it
- anything destructive that git history can't undo

# Risks and Unknowns

- That a story needs to be co-authored by a human and an agent to be good is a
  hunch. The first comparison doesn't test it: an agent writes alone in both arms
  and the judging panel only judges the results. It tests the model, not co-authoring. We
  won't test the hunch directly: if the Claude-first headless approach works fine,
  that's the answer (Sumeet).
- A capable agent can make a weak model look fine by working around it. The
  plain-notes arm of the comparison and a log of what the model couldn't hold are
  the check.
- The comparison is a few runs on two premises, read by three agent judges, and
  format can give away which is which. It can show the tool is clearly better or clearly not,
  but not a small difference. It also can't show how working on a screen feels,
  which `on-screen` would have to, if it stays.
- The judges are models too, mostly from the same family as the authoring
  sessions, and may prefer what an agent writes or miss what a reader would feel.
  Two of the three judges on other models, a rubric fixed before reading, and Sumeet's
  after-the-fact review are the check; disagreement among judges is reported, not
  hidden.
- The gap reports are a first guess at what a story needs to be interesting, and
  are the part most likely to be wrong. Runs on the premises should change them.
- The story file isn't how the app stores things. A keep verdict has to map it onto
  documents and collections (decision worldcrafter-ddha), which `worldcrafter-4t98`
  and the app's storage work then pick up. In the file a scene also has no place
  in story time, only links to the events it depicts.
- The three modelling questions (where drives and questions live, beats,
  scenes and events) are settled by decision worldcrafter-ddha: their own
  typed records, optional beats inside scenes, and scenes that depict events.
  `depicts` is descriptive; story-time placement alone says when a scene
  happens.
- Seeing what a change touches may not feel like reworking. The tool can follow
  links but can't reach what summaries and prose only mention, such as a line of
  dialogue saying how long ago something happened. The first increment tests this.
- Drives change over story time. For now a changed motivation is a second drive
  with its own origin events (worldcrafter-o8b7 walkthrough, on paper only).
  Whether they need `Fact`-style changes anchored to events is open until arcs
  are built.
- Order isn't cause. Events have before and after but not "because", so a chain
  of events behind a motivation can't be recorded yet. Sketching from a premise
  will likely run into this, and the log of what the model couldn't hold should
  show it.
- Passage anchors were designed by spike worldcrafter-4vxp, and some of their
  failure paths are reasoning only. The passages work has to prove them.
- Deterministic inspection may be too noisy to trust. Fixture stories with
  planted problems are the check.
