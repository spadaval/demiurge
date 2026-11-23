# Demiurge

Some writers can just write - no preparation, no planning, no thought. Just words. 
If that's you, move along. This is for the rest of us.

Demiurge is an AI-native tool for creating imaginary worlds, inspired by software engineering tooling. 

The name is Plato's: the demiurge is a craftsman who shapes a world from material that already exists, not a creator working from nothing. The Gnostics' version is a flawed creator of a broken world who thinks he's the true god, which is also a fair description of the job.

Stories get made by picking elements that seem interesting and weaving them into place, jigging things around until they fit. Demiurge keeps that fluid: you can jump between levels and sides, rework a motivation or a timeline in the abstract while seeing what it touches, try answers, and leave things undecided or contradictory for as long as you need.

We use AI throughout the work, up to and including writing the story, because we think that's the best way to create compelling stories. We don't see AI-written work as inherently good or bad. Our hunch is that a story needs to be co-authored by a human and an AI to be good, which is a reasonable belief but an unverified one. What we don't want is a slop cannon: volume that nobody has judged.

So this is built for a team of a human and an AI agent, working on the same typed story bible, to make sure the story has what it needs to be interesting before final drafting begins. See [the story model](docs/rebuild/story-model.md#fluidity). The bible was first tested headless, through a CLI and a skill in an agent session, over [five rounds](docs/rounds/README.md). It is now moving into the web app, with a story agent the app runs itself so the writer controls its prompts, tools, context and models. [PRODUCT.md](PRODUCT.md) says what ships today and what is planned.

## Key Differentiators

- **Structured Writing Experience**: Move beyond the blank canvas with a typed story bible of actors, drives, events, timelines, knowledge and open questions, checked as you work.
- **Deep AI Integration**: AI is integrated into various aspects of the workflow to assist and enhance the creative process, up to and including writing the story. AI-written text is marked until you accept it.
- **Extreme AI Control**: Gain fine-grained control over the input to the AI model, including context, parameters, and samplers. Full support for local models.

## Tech Stack

The application is in [`app/`](app/). The repository root has no `package.json`.

- **Frontend**: React 19 with TypeScript, built with Vite
- **Routing**: TanStack Router, on hash history
- **Editor**: Plate (`platejs`, on Slate), with block IDs and AI segments
- **Styling**: plain CSS in `app/src/app/styles.css`, following the Night Edition design in [DESIGN.md](DESIGN.md)
- **Storage**: IndexedDB behind a `StorageAdapter`, with an in-memory adapter for tests
- **LLM Integration**: streaming over Server-Sent Events from OpenAI-compatible backends (llama.cpp, OpenRouter and others), with sampler settings passed through
- **Error Handling**: neverthrow `Result`s for expected failures
- **Tests**: `bun test`, with happy-dom and fake-indexeddb
- **Code Quality**: Biome for formatting and linting
- **Hosting**: static assets on a Cloudflare Worker (`app/wrangler.jsonc`)

## Development

### Prerequisites

- [Bun](https://bun.sh/) (v1.1 or later)

### Setup

```sh
git clone <repository-url> demiurge
cd demiurge/app
bun install
```

### Commands

Run these from `app/`.

- `bun run check` runs the type check (`tsc`), lint (Biome) and tests.
- `bun test` runs the tests alone.
- `bun run build` type-checks and writes the static web app to `app/dist/`, for any static server.
- `bun run format` formats with Biome, and `bun run lint` lints.
- `bun scripts/story.ts --help` runs the story CLI, which edits a story bible held in one JSON file.

There is no dev server script. To try the app, build it and serve `app/dist/`.

## Project Structure

```
app/
├── scripts/       # Story CLI, comparison, round and judging tools, measurement scripts
├── src/
│   ├── app/       # Shell, routes, pages, rail and styles
│   ├── editor/    # Plate configuration, block IDs, AI segments
│   ├── content/   # Content schema and its Markdown projection
│   ├── storage/   # StorageAdapter: IndexedDB and in-memory
│   ├── story/     # The story bible: schema, commands, checks and queries
│   ├── world/     # World entries, kinds, names and facts
│   ├── time/      # Timelines, frames and chronology
│   ├── outline/   # Manuscript outline: books, chapters, scenes
│   ├── layers/    # Apparatus layers painted over prose
│   ├── context/   # Model context assembly
│   ├── generate/  # Generation, profiles and the context viewer
│   ├── llm/       # Streaming LLM client
│   ├── workspace/ # Workspace, tabs, document sessions, writer lock
│   └── test/      # Test setup for browser APIs
└── wrangler.jsonc # Cloudflare Worker for the hosted static app
docs/
├── rebuild/       # Design of the current app
├── strategies/    # Past strategies and their results
├── rounds/        # The World first rounds and their results
├── verdicts/      # Comparison and judging rubrics
└── philosophy.md  # The product's principles
```

[PRODUCT.md](PRODUCT.md) and [DESIGN.md](DESIGN.md) describe the product and its design. [AGENTS.md](AGENTS.md) is the guide for agents working in this repository, and `.atelier/` holds work tracking.
