# Story Model

Status: accepted (2026-10-29, decision worldcrafter-ok5a). Strategy: `docs/strategies/structure-first.md`.

## Identity

WorldCrafter is a tool for building stories from the frame out. The world and the plot are the structure, and the AI inspects them while they're still exposed. Prose is the finish: written by hand, drafted by AI, or both, and anchored to the structure rather than compiled from it. This is a tool for crafted stories, not a text generator.

It is about stories, not manuscripts. A story that never reaches the page is still a story, and work on its structure is still progress.

The goal is to make it easier to tell great stories, by making sure a story has what it needs to be interesting before final drafting begins. The user is a team of a human and an agent, so the model has to make sense to both, and an agent using it to write well counts as success. The human's judgment settles whether the result is any good (decision worldcrafter-2y4g).

## Fluidity

Stories get made by picking elements that seem interesting and weaving them into place, jigging things around until they fit. Fluidity is what keeps that possible once a story is written down. It isn't a stage after the first draft: it's how the story gets found, so it's the test for the model and the plan. If a rework is expensive or its effects are hidden, the model has failed, however much it can check.

Nabokov described it as a crossword: "The pattern of the thing precedes the thing. I fill in the gaps of the crossword at any spot I happen to choose." That captures most of it, though here the pattern often emerges as you go. In practice:

- **Start anywhere.** There's no required order, between levels or between sides: a character's motive, an event, a world fact or a scene can come first.
- **Blank squares are normal.** An element can sit in the model with nothing connected to it. A report that it isn't woven in yet is a prompt, not an error.
- **Each answer constrains the ones crossing it.** Connections matter more than fields inside records, because they're how one change reaches the rest.
- **Open questions are part of the story.** What isn't decided yet is held as a question with candidate answers, and a candidate can be tried before anyone commits to it.
- **Contradictions are material.** Motivations pull against each other and events overlap, and early on a story is full of contradictions. Much of the tension comes from resolving them satisfyingly, so the tool holds them and doesn't refuse them.
- **Rework happens in the abstract.** Shift when something happened, change why a character acts, or change the events that made them want it, and see what each change touches.

For example, take a premise where an orphan raised by the Thukker tribe leaves, and later helps find a girl's sister, who has been fused into a Titan. Why did he leave? "He wanted adventure" touches nothing else. "The caravans unknowingly carried something for the Titan program, and he found out" touches the sister, the conspiracies and his loyalty to the people who raised him, though it may be too neat. How much an answer touches is a signal and not a score, and whether it satisfies is a judgment call. Johnstone's idea of reincorporation is a good question to ask of it: does the answer bring back something already planted?

Fluidity isn't a free-form canvas: the structure is still typed, because that's what lets a change reach things. It also isn't strict continuity checking, which treats the story as settled (`docs/strategies/structure-first.md`, Scope).

Other writers describe parts of this. Woolf dug "beautiful caves" behind her characters, where "the caves shall connect, & each comes to daylight at the present moment", which is a good test of drives and their origins. Le Guin called a novel "a medicine bundle, holding things in a particular, powerful relation to one another and to us". Gabaldon writes pieces where she can see things happening and glues them together. Martin's "Meereenese knot", his long struggle to make converging storylines line up, shows what this costs by hand.

## Leverage

A story is easiest to make satisfying at the structural level. One change to a drive, a question or a world constraint reaches every scene it touches. The same change made in prose has to be found and repeated by hand, and is usually missed somewhere.

A story in the writer's head is high-dimensional: threads, drives, the world and the telling all evolve together. A page is linear. Writing it down too early flattens the story into one order, and after that it stops evolving. That flattening is the main reason stories never leave the head.

So the app keeps the story in its high-dimensional form for as long as possible, and makes flattening cheap, late and repeatable:

- **Change things at the highest level where they apply**, and let the change flow down. Editing prose to fix structure is the expensive path.
- **The outline is not a document.** A list or a document is already linear. The structure is a graph, and lists, grids and outlines are views of it.
- **Rework in the abstract.** The writer can shift when something happened, change why a character acts, or change the events that made them want it, and see what each change touches. They jump between levels and sides in any order. See [Fluidity](#fluidity).
- **Prose is anchored, not compiled.** Each passage hangs off the scene or beat it tells. When the structure under it changes, the passage is flagged as stale, and the writer decides whether to rewrite it by hand, redraft it with the AI, or keep it.

The words still matter a great deal: the same structure told differently is a different story. The difference is reach. A structural choice affects every scene it touches, while a sentence mostly matters inside its own scene. That's why prose can hang off the structure without being an afterthought.

## Construction

A building takes months of framing, wiring and plumbing that look ugly, then becomes beautiful in a few days of drywall and flooring. The finishing sets how it feels, but it can't save a flawed structure.

- **Inspect before the drywall.** The AI's most valuable work is checking the structure while it's still visible: stale promises, drives that never collide, world constraints the plot breaks, reveals that come too early. Reviewing finished prose is reviewing the drywall.
- **Finishing is fast, and that's where generation goes.** Voice, the choice of finetune and sampler control matter most here.
- **Finishing talks back.** Unlike a building, drafting a scene can show that the structure is wrong. The tool isn't a one-way pipeline. A scene that contradicts its beat asks: update the beat, or rewrite the scene?

## Arrangement

The model is film editing, not a compiler. Footage is shot against a script, but the film is made in the edit.

- **The structure is the script**: who wants what, what happens, what the reader is waiting for.
- **The prose is the footage**: passages attached to scenes or beats, hand-written or drafted.
- **The arrangement is the edit**: which scenes go in which chapters, and in what order. It belongs to the telling layer and is held separately from the prose.

Moving a scene to another chapter, or reordering passages within a scene, changes the arrangement, and the prose travels with it. Chapters are packaging over scenes, not containers that own text. The manuscript is a view assembled from the arrangement, never a stored document. This amends decision worldcrafter-9zj1, which already made the manuscript outline a layer that references scene documents: scenes and entries stay documents, but a scene is a structural unit first, and its prose is a set of passages anchored to its beats (decision worldcrafter-ok5a).

Prose has seams. It refers outward ("later that night", a pronoun whose antecedent was two scenes back, a character acting on something the reader hasn't learned). After a move, the app flags:

- **question-order breaks**: a question progressed or answered before it opens
- **story-time breaks**: constraints in `story-time.md` that the new order contradicts
- **seam passages**: the openings and closings that tie a scene to its neighbours

Catching a character acting on something the reader hasn't learned needs a record of what a scene relies on. The model doesn't have one yet.

## Layers

The story has four layers, each running from coarse to fine (snowflake-style: premise, books and chapters, scenes, beats, prose). They aren't stages: the writer moves between them in any order.

| Layer | What it holds | Narratology |
|---|---|---|
| World | places, peoples, systems, history (macro and micro, after Jemisin) | |
| Story | actors, drives, events, and how they collide | fabula |
| Telling | point of view, narrative order, reveals, what's hidden, parallels | syuzhet |
| Prose | voice: rhythm, sentence length, diction | |

The world exists before the story to some degree, but only as deep as the story needs (Sanderson's third law: expand what you have before adding something new). World and story shape each other both ways. A story need asks the world a question ("this scene needs a place where X is possible"). A world fact constrains the story ("that can't happen there, because…"). Constraints matter more than decoration (Sanderson's second law: limitations are more interesting than powers).

The unreliable narrator is out of scope. What the telling states is true in the world. Characters can still believe false things; that is character knowledge, not narration.

## Primitives

These are what the tools reason about.

- **Actors**: characters and organisations.
- **Drives**: an actor's want or intention, what's at stake, and what it will do about it. Drives oppose, ally or compete. They are the engine: *why* things happen. A drive links to the events that created it, so reworking those events reaches it.
- **Questions**: what the reader is waiting for. A question opens at a scene, makes progress, and is answered (Sanderson's promise, progress and payoff). Every MICE thread reduces to one: will she get out, who did it, will he become whole, will order be restored. Questions are about reader knowledge, so they belong to the telling layer and use the "revealed" model in `story-time.md`.
- **Open questions**: what the story's makers haven't decided, such as "why did he leave?". An open question holds candidate answers and what each would connect to, and it can also record a conflict someone has noticed. These aren't the questions above, which are what the reader is waiting for.
- **Events**: what happens, with a summary, placed in story time.
- **Scenes**: units of the telling, where drives collide and questions move. A scene records which actors are in it.
- **World facts**: as in `story-time.md`, changing at events.

## Lenses

These are what the writer thinks in. They are named, writer-owned groupings over the primitives. The AI can propose them and fill in membership as inferred data, and the writer's corrections win.

- **Threads**: usually anchored on one or more questions, pulling in the actors and drives that push on them and the scenes and events they pass through. A thread can also be a motif or a parallel that has no question. Tools don't need to understand threads, so a thread that fits no pattern breaks nothing. Threads are the rows of the weave grid (scenes × threads).
- **Arcs**: one actor's drives and state traced across scenes.

## Tools this enables

- **What this touches**: from any character, event, drive, question or scene, or from a candidate answer, everything linked to it. It is the review list after any change, and the way to try a candidate. It follows links only, so what free text merely mentions is out of its reach.
- **What's missing**: a character with no drive, a drive with no origin, a drive nothing opposes, a scene with no drive under pressure. These are prompts for a sketch, and a first guess at what a story needs to be interesting.
- **Question ledger**: questions open too long without progress, and promises with no planned payoff.
- **Collision map**: actors with no opposition, drives that never meet on the page, actors who want the same thing and never share a scene.
- **Scene check**: lists scenes that move no question and put no drive under pressure. It informs and doesn't judge.
- **Playing an actor**: "given what X wants and knows at this point, what would X do?", using drives and the story-time knowledge model.
- **Staleness**: prose anchored to structure that has since changed.
- **Seam check**: question-order and story-time breaks, and stale transitions, after scenes or passages move.
- **Weave grid**: threads across scenes, with convergence visible where several questions close together.

## Effect on the plan

Adopted on 2026-10-29 (worldcrafter-uicb). The rebuild mission (`docs/strategies/rebuild.md`) was narrowed to the foundation it had mostly built, and the story model continues as its own mission in `docs/strategies/structure-first.md`. Recognition, discovery and bookkeeping, AI edit proposals and talk pages moved to the backlog, to be re-planned under this model. Story time, AI segments, provenance and stable IDs keep their place.

The first version is headless: a CLI and a skill over one readable file per story, tested by a blind comparison against the same agent with plain notes (decision worldcrafter-2y4g). This is a way to find out and not how the product ships. A screen comes after a verdict supports it, since how jumping around feels is the part of fluidity a conversation can't test.

## Records

Decision worldcrafter-ddha settled how the primitives are stored:

- Drives and questions are their own typed records, not entries or facts on entries. Actors stay entry documents. A drive links to its origin events. A changed motivation is a second drive with its own origins, until arcs show whether drives need changes anchored to events.
- Beats are optional, inside scenes. A passage anchors to a beat if there is one, otherwise to its scene.
- A scene is a telling unit that depicts one or more events. `depicts` is descriptive: the scene's own event, placed in story time, alone says when the scene happens. A flashback is placed earlier, and also depicts the earlier events it shows.

That is how the app will store things. In the headless version's file, actors and scenes are plain records and not documents, and a keep verdict has to map one onto the other (decision worldcrafter-2y4g).

## Sources

- Brandon Sanderson, 2025 writing lectures: [plot](https://www.brandonsanderson.com/blogs/blog/brandon-sandersons-2025-guide-to-plot-lecture-2) and [structure](https://brandonsanderson.com/blogs/blog/brandon-sandersons-2025-overview-of-story-structure-lecture-3); [Sanderson's Third Law](https://brandonsanderson.com/sandersons-third-law-of-magic/).
- Mary Robinette Kowal, MICE quotient: [Writing Excuses](https://writingexcuses.com/?p=16418).
- N.K. Jemisin, macro and micro worldbuilding: [Cornell Daily Sun](https://cornellsun.com/2023/10/12/n-k-jemisin-gives-bartels-world-affairs-lecture-speaks-on-building-a-better-world/).
- Ursula K. Le Guin, *Steering the Craft* (point of view, sentence length, crowding and leaping); [*The Carrier Bag Theory of Fiction*](https://san-serriffe.com/?p=10993) (checked against secondary sources only).
- Vladimir Nabokov, *Strong Opinions*, p. 99: [Nabokov Society](https://nabokovsociety.org/node/1620).
- Virginia Woolf, diary, 30 August 1923: [Blogging Woolf](https://bloggingwoolf.org/2023/08/30/virginia-woolf-100-years-ago-today-on-writing-mrs-dalloway/).
- Diana Gabaldon: [Penguin](https://penguin.co.uk/articles/2017/11/diana-gabaldon).
- George R.R. Martin, the Meereenese knot: [A Wiki of Ice and Fire](https://awoiaf.westeros.org/index.php/Meereenese_knot).
- Keith Johnstone, *Impro* (reincorporation; from memory, not checked against the book).
