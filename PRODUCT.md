# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

The app is being rebuilt from a fresh skeleton (decision worldcrafter-zyc2). It is web-first: a web app, to become an installable PWA, built on Vite, TanStack Router, React 19 and Plate (a Slate-based rich-text editor), with local-first storage on IndexedDB behind a storage adapter. A sync backend (a Cloudflare Worker) comes later so one writer can switch between laptop and phone (decision worldcrafter-gcox). Desktop and mobile wrappers may come later. The old app's styling stack (Tailwind with daisyUI and shadcn scaffolds) is evidence only and is not carried forward. The new styling approach is undecided. All of this is the current plan and not a commitment (decision worldcrafter-45an).

## Users

Demiurge is for writers and worldbuilders equally. Some users mostly draft prose, some mostly build the world, and many do both. It was built first for its author, a long-form speculative-fiction writer, and is meant for others later. The user is a team of a human and an agent, so whatever holds the story has to make sense to both (decision worldcrafter-2y4g).

## Product Purpose

Demiurge exists to get to the best possible story. It makes that easier by making sure a story has what it needs to be interesting before final drafting begins. We use AI to assist and enhance the creative process, up to and including writing the story, because we think that's the best way to create compelling stories. We don't see AI-written work as inherently good or bad. Our hunch is that a story needs to be co-authored by a human and an AI to be good, which is a reasonable belief but an unverified one. What we don't want is a slop cannon: volume that nobody has judged (decision worldcrafter-45an). The current approach is plain notes: an agent, with craft advice, keeps the story in readable markdown notes and drafts from them. An earlier bet that a typed story model would do better than plain notes lost two blind comparisons and has ended (decision worldcrafter-03rp, `docs/verdicts/`). Aids over plain notes are built only where judged runs show the notes falling short, and each is tested blind against plain notes (`docs/strategies/notes-first.md`).

Stories get made by picking elements that seem interesting and weaving them into place, jigging things around until they fit. Fluidity is what keeps that possible: jump between levels and sides, rework in the abstract, try answers against the rest of the story, and leave things undecided or contradictory until a satisfying way through appears (`docs/rebuild/story-model.md`).

Success means a story can grow outside the writer's head without being flattened onto the page too early, and that any aid we build makes the team's stories better than plain notes do, as an independent panel judges them.

The first version is headless, a CLI and a skill used in an agent session, to test the model before building screens for it. The web app is the current plan and not a commitment: the form follows the results.

## Positioning

Not yet earned. An earlier positioning around a typed story model the app checks was dropped with that bet (decision worldcrafter-03rp). Positioning waits for an aid that beats plain notes in a blind test.

## Operating Context

As planned for the web app; the headless first version runs in an agent session.

- Sessions mix outlining, building the world, arranging scenes, drafting and reviewing what the AI inferred or proposed. Most of the leverage, and most of the time, is in the structure.
- Mainly used on desktop Chromium, on a laptop or desktop screen, and also on a phone.
- Models are local (llama.cpp) or hosted (OpenRouter, featherless), and the user supplies their own keys. The writer controls samplers, system prompts and prompt format, which coding harnesses and chat frontends decide for you.
- Scenes and entries are documents, but a scene is a structural unit first, and its prose is a set of passages anchored to its beats. There is no global chat; discussion is planned as talk pages attached to what they discuss.

## Capabilities and Constraints

- The content schema is restricted to node types whose AI projections are defined: paragraphs, headings, lists, quotes, rules, basic marks, links, AI segments and placeholders. Tables, media and callouts are excluded for now. The TypeScript model is the source of truth, and a world round-trips exactly through every storage and export adapter. It also exports to readable markdown, one-way.
- **AI segments** are AI-written content that is visibly marked. You can accept it, which turns it into ordinary text, or regenerate it. Its provenance (the request, model and sampler) is kept alongside it.
- **AI presence in the app: a quiet colleague.** AI work is always visible and attributed, and its interface stays in the background: margins, underlines, an inbox, talk-page topics. It never crowds the story being worked on.
- **Power controls on demand:** the assembled request can be viewed and edited, and sampler settings and logprobs are available, but none of these is in the way by default.
- **Terminology:**
  - *entry*: a world document such as a character, place or faction
  - *topic*: a talk-page discussion
  - *arc*: an actor's drives and state traced across scenes (a lens; see `docs/rebuild/story-model.md`)
  - *timeline*, *frame*, *event*
  - *holds* and *revealed*
  - *inferred* and *asserted*: AI-inferred versus writer-confirmed data
- **Undecided:** the visual design, the styling stack, and whether entries need a different editing surface from scenes. Scenes and entries are documents (decision worldcrafter-9zj1, amended by worldcrafter-ok5a).

## Brand Commitments

The name is Demiurge (decision worldcrafter-cogw): Plato's craftsman, who shapes a world from material that already exists, and the Gnostics' flawed creator of a broken world who thinks he's the true god. Both sides are meant. The intended domain is demiurge.ink, which isn't bought yet. There are no other binding visual or voice commitments.

## Evidence on Hand

There are no users, testimonials, metrics or sample worlds yet. Don't invent any. Design docs are in `docs/rebuild/`, and the current strategy is `docs/strategies/notes-first.md`.

## Product Principles

1. **The best story wins.** Whatever gets to the best story is what we build, whether that's a screen, a database or an agent. An independent panel of judges decides what's good, and Sumeet can overturn it (decision worldcrafter-zybl).
2. **Stories stay fluid.** Anything can be reworked at any time, in any order, and unfinished or contradictory is a normal state for a story to be in.
3. **The structure is the stage.** Work happens at the highest level where a change applies. Prose is the finish, anchored to the structure rather than compiled from it.
4. **The AI is an accountable teammate.** It can do the bookkeeping, drive a whole sketch or write the prose, and it signs its work. In the app it stays quiet and doesn't compete for attention.
5. **The writer stays in control.** Context is visible and editable, AI changes are reversible, and the writer's corrections always win.
6. **Results decide the form.** What holds the story (notes, a model, an app) is whatever judged runs show works best; the typed model lost to plain notes (decision worldcrafter-03rp). World and story shape each other both ways.
7. **Don't lose the writer's work.** Losing data is a bug, but this is a personal project: a schema version and a backup export are enough, and breaking changes are fine when they make the model better.
