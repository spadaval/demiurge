# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Demiurge is a web app in `app/`, built from a fresh skeleton (decision worldcrafter-zyc2): Vite, TanStack Router, React 19 and Plate (a Slate-based rich-text editor), styled with plain CSS to the Night Edition design in `DESIGN.md`, with local-first storage on IndexedDB behind a storage adapter. It is to become an installable PWA. A sync backend (a Cloudflare Worker) comes later so one writer can switch between laptop and phone (decision worldcrafter-gcox), planned in mission worldcrafter-3z9j. Desktop and mobile wrappers may come later. All of this is the current plan and not a commitment (decision worldcrafter-45an).

## Users

Demiurge is for writers and worldbuilders equally. Some users mostly draft prose, some mostly build the world, and many do both. It was built first for its author, a long-form speculative-fiction writer, and is meant for others later. The user is a team of a human and an agent, so whatever holds the story has to make sense to both (decision worldcrafter-2y4g; its single-file trial format is superseded by the typed store below).

## Product Purpose

Demiurge exists to get to the best possible story. It makes that easier by making sure a story has what it needs to be interesting before final drafting begins. We use AI to assist and enhance the creative process, up to and including writing the story, because we think that's the best way to create compelling stories. We don't see AI-written work as inherently good or bad. Our hunch is that a story needs to be co-authored by a human and an AI to be good, which is a reasonable belief but an unverified one. What we don't want is a slop cannon: volume that nobody has judged (decision worldcrafter-45an). The current direction is Sumeet's of 2026-11-22, recorded in mission worldcrafter-k7uh: a story is a complex typed schema, so it lives in a typed store inside the app, not in plain files on disk. Demiurge combines three things: the story bible (`app/src/story/`), tested over five rounds of the World first mission; a story agent runtime the app owns, so the writer controls system prompts, tool schemas, context assembly, output formats and model and sampler routing, which coding harnesses obscure or fight; and the Night Edition UI (`DESIGN.md`).

How we got here, kept as record:

- **Structure first** bet that a typed story model would beat plain notes. It lost two blind comparisons and ended (decision worldcrafter-03rp, `docs/strategies/structure-first.md`, `docs/verdicts/`).
- **Notes first** followed, with plain markdown notes as the approach (`docs/strategies/notes-first.md`). It was superseded before any long run.
- **World first** (decision worldcrafter-jeue, `docs/strategies/world-demo.md`) dropped head-to-head comparisons as a poor test for short stories, brought the typed model back as the author's bible, separate from the prose, and ran five rounds of a writer agent using the story CLI and its skill. Results are in `docs/rounds/README.md`.
- **The 2026-11-22 direction** moves the bible from a JSON file driven by a CLI into the app, and replaces the dropped rebuild mission worldcrafter-3otd.

What ships in `app/` today: the Night Edition workspace with document tabs and the Manuscript, World and Topics rail; the Plate editor with block IDs and AI segments; paint-only apparatus layers and gloss notes; single-turn streaming generation with a model and sampler profile and a context viewer; IndexedDB storage behind the `StorageAdapter`; and the story bible's schema, commands and checks in `app/src/story/`, driven by the story CLI (`app/scripts/story.ts`) over a JSON file.

What is planned:

- Mission worldcrafter-r7vd: persist the whole bible through the `StorageAdapter` with scenes linked to Plate documents, export and import a world as JSON, expose story commands and queries as typed LLM tools, add multi-turn tool calling, and build the app-owned Story Agent Runner.
- Mission worldcrafter-mtkn: a bible inspector in the World view, live bible-driven layers on scene prose, scoped talk pages in Topics, and a prompt, context and tool-trace inspector.
- Mission worldcrafter-3z9j: prose finishing from live bible context, one-click controls for frequent bible edits, and multi-device sync.

Stories get made by picking elements that seem interesting and weaving them into place, jigging things around until they fit. Fluidity is what keeps that possible: jump between levels and sides, rework in the abstract, try answers against the rest of the story, and leave things undecided or contradictory until a satisfying way through appears (first written up in `docs/rebuild/story-model.md`).

Success means a story can grow outside the writer's head without being flattened onto the page too early, and that what we build makes the team's stories better, as an independent panel judges them from the prose alone.

The web app is the current plan and not a commitment: the form follows the results.

## Positioning

Not yet earned. An earlier positioning around a typed story model the app checks was dropped with the Structure first bet (decision worldcrafter-03rp). The World first rounds showed the bible working as an author's tool but moved no judged score (`docs/rounds/README.md`), so positioning waits for evidence from the app itself.

## Operating Context

As planned for the web app.

- Sessions mix outlining, building the world, arranging scenes, drafting and reviewing what the AI inferred or proposed. The agent works on the same typed bible as the writer, through the same commands.
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
- **Undecided:** whether non-actor world kinds (places, cultures, magic systems and the like) need their own entry documents beside the bible, to be settled when the UI moves onto the bible in missions worldcrafter-mtkn and worldcrafter-3z9j. Scenes and entries are documents (decision worldcrafter-9zj1, amended by worldcrafter-ok5a); each scene record will link to its prose document.

## Brand Commitments

The name is Demiurge (decision worldcrafter-cogw): Plato's craftsman, who shapes a world from material that already exists, and the Gnostics' flawed creator of a broken world who thinks he's the true god. Both sides are meant. The intended domain is demiurge.ink, which isn't bought yet. There are no other binding visual or voice commitments.

## Evidence on Hand

There are no users, testimonials or metrics yet. Don't invent any. The five World first rounds left their outlines, scenes and judges' scores in `docs/rounds/`. Design docs are in `docs/rebuild/` and the visual design in `DESIGN.md`. Past strategies are in `docs/strategies/`; the current direction is in mission worldcrafter-r7vd and its siblings under `.atelier/missions/`.

## Product Principles

1. **The best story wins.** Whatever gets to the best story is what we build, whether that's a screen, a database or an agent. An independent panel of judges decides what's good, and Sumeet can overturn it (decision worldcrafter-zybl).
2. **Stories stay fluid.** Anything can be reworked at any time, in any order, and unfinished or contradictory is a normal state for a story to be in.
3. **Change things where they apply.** Work happens at the highest level where a change applies, so a change to a motive or an event is made there and followed through, not patched sentence by sentence.
4. **The AI is an accountable teammate.** It can do the bookkeeping, drive a whole sketch or write the prose, and it signs its work. In the app it stays quiet and doesn't compete for attention.
5. **The writer stays in control.** Context is visible and editable, AI changes are reversible, and the writer's corrections always win.
6. **Results decide the form.** What holds the story (notes, a model, an app) is whatever judged runs show works best. The typed model lost two blind comparisons to plain notes (decision worldcrafter-03rp), then came back as the author's bible under World first (decision worldcrafter-jeue), and is now the app's typed store. World and story shape each other both ways.
7. **Don't lose the writer's work.** Losing data is a bug, but this is a personal project: a schema version and a backup export are enough, and breaking changes are fine when they make the model better.
