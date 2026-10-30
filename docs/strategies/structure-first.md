---
status: draft
last_changed: "2026-10-30: rework added as the first bet; primitives criterion removed; passage reordering moved to anchored-prose; increments judged by trying them (Sumeet)"
---

# Why

A story is easiest to make satisfying at the structural level, where one
change reaches every scene it touches. A story in the writer's head is
high-dimensional, and a page is linear: writing it down too early flattens it,
and after that it stops evolving. That is why most stories never leave the
head.

The rebuild (`docs/strategies/rebuild.md`) gave WorldCrafter a sound
foundation for prose: stable block IDs, AI projections, generation with
visible context, a storage adapter and story time. But it was planned as a
manuscript tool. Decision worldcrafter-ok5a makes it structure-first: the
world and the plot are the structure, the AI inspects them while they're still
exposed, and prose is the finish, anchored to the structure rather than
compiled from it (`docs/rebuild/story-model.md`).

Outlining tools already exist (Plottr, Dabble's plot grid, Scrivener's
corkboard), but their structure is cards and rows the app doesn't understand.
WorldCrafter's structure is a typed model of actors, drives and questions that
the app can check, and that prose hangs off.

Holding a story is only half of it. A story stays alive while the writer can
jump between its levels and sides and rework it in the abstract: shift when
something happened, change why a character acts, or change the events that
made them want it. Whether that is worth having is the mission's main unknown,
and only using it on a real story can answer it.

# Outcome

A writer can hold a story at any level of detail, from a premise to beats, move
between its levels and sides in any order, and rework it at the highest level
where a change applies, seeing what each change touches. The structure is a
graph of actors, drives, questions, events and scenes, seen through outline
and weave-grid views, never stored as a linear document. Scenes can be
rearranged freely, with their prose travelling with them and reveal-order
problems flagged. Prose is written by hand or drafted from the structure, and
is marked stale when the structure under it changes. The app points out
structural problems while they're still cheap to fix.

Worth having on its own: `rework`, with no prose and no AI at all. If it isn't,
the rest of this plan should change.

# Success Criteria

- rework: From any character, event, drive or scene, the writer can see
  everything connected to it and go there. They can shift an event, change a
  drive, or change an event behind a drive, and see what the change touches
  before deciding what to change next. Nothing moves or is rewritten silently.
  Shown by scenario tests over a fixture story, and by the writer trying it on a
  real story.
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
  stories with planted problems.
- lenses: The writer can create, name and curate threads over the
  primitives, and see them as weave-grid rows, and can trace an actor's arc
  (its drives and state across scenes). The AI can propose threads and their
  membership as inferred data, and the writer's corrections win. Shown by
  scenario tests.

# Shape

- **Value decides.** Each increment leaves the writer something to try on a real
  story, and tests the biggest open bet first. It ends with the writer's verdict:
  keep, change or drop. Tests show a thing works; only the writer's use shows it
  is worth having. Later increments are bets, not commitments.
- **Builds on the rebuild.** Platform, storage, the LLM client, model
  control, stable IDs and story time are as in `docs/strategies/rebuild.md`.
- **Structure is a graph, not a document.** Outlines, lists and grids are
  views. Change things at the highest level where they apply.
- **Primitives and lenses** (`docs/rebuild/story-model.md`). Tools reason
  about the primitives: actors, drives, questions, events, scenes and world
  facts. Threads and arcs are writer-owned lenses over them.
- **Scenes and entries stay documents** (decision worldcrafter-9zj1, amended
  by worldcrafter-ok5a). A scene is a structural unit first, and its prose is
  a set of passages anchored to its beats. The manuscript is only ever a view.
- **The film-editing model.** The structure is the script, prose is footage,
  and the arrangement is the edit. Prose is anchored, not compiled.
- **Connections carry the leverage.** A change reaches only what is linked to
  it, so links between events, drives and scenes matter more than fields inside
  them. The app shows what a change touches; the writer decides what follows. It
  doesn't rewrite free text.
- **Inspection before generation.** Deterministic checks over the model come
  before AI features. They inform and never gate. The AI proposes and infers; the
  writer's corrections win.
- **The unreliable narrator is out of scope.** What the telling states is true
  in the world. Characters can still believe false things.
- **When qualities conflict:**
  1. The writer's visibility into and control over the AI.
  2. Leverage: structural changes are cheap and propagate.
  3. AI capability.
  4. Feature speed.

# Scope

In scope:

- the story primitives and their commands
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

Environment: as in the rebuild. One user (the author), desktop Chromium and a
phone, local llama.cpp and hosted OpenAI-compatible providers.

# Authority

The orchestrator may change, without asking:

- the increments, their sequencing and the issues
- libraries within the Shape
- how the views look and are laid out

These must come back to the human:

- the success criteria
- the primitives and lenses, and how scenes relate to documents
- adding a backend service
- reopening decisions worldcrafter-ok5a, worldcrafter-gcox or the platform
- keep, change or drop after trying an increment

# Risks and Unknowns

- The three modelling questions (where drives and questions live, beats,
  scenes and events) are settled by decision worldcrafter-ddha: their own
  typed records, optional beats inside scenes, and scenes that depict events.
  `depicts` is descriptive; story-time placement alone says when a scene
  happens.
- Seeing what a change touches may not feel like reworking. The app can follow
  links but can't reach what summaries and prose only mention, such as a line of
  dialogue saying how long ago something happened. The first increment tests this.
- Drives change over story time. For now a changed motivation is a second drive
  with its own origin events (worldcrafter-o8b7 walkthrough, on paper only).
  Whether they need `Fact`-style changes anchored to events is open until arcs
  are built.
- Order isn't cause. Events have before and after but not "because", so a chain
  of events behind a motivation can't be recorded yet. The first trial shows
  whether that is missed.
- Passage anchors were designed by spike worldcrafter-4vxp, and some of their
  failure paths are reasoning only. The passages work has to prove them.
- Deterministic inspection may be too noisy to trust. Fixture stories with
  planted problems are the check.
