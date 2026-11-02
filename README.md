# Demiurge

Some writers can just write - no preparation, no planning, no thought. Just words. 
If that's you, move along. This is for the rest of us.

Demiurge is an AI-native tool for creating imaginary worlds, inspired by software engineering tooling. 

The name is Plato's: the demiurge is a craftsman who shapes a world from material that already exists, not a creator working from nothing. The Gnostics' version is a flawed creator of a broken world who thinks he's the true god, which is also a fair description of the job.

Stories get made by picking elements that seem interesting and weaving them into place, jigging things around until they fit. Demiurge keeps that fluid: you can jump between levels and sides, rework a motivation or a timeline in the abstract while seeing what it touches, try answers, and leave things undecided or contradictory for as long as you need.

We use AI throughout the work, up to and including writing the story, because we think that's the best way to create compelling stories. We don't see AI-written work as inherently good or bad. Our hunch is that a story needs to be co-authored by a human and an AI to be good, which is a reasonable belief but an unverified one. What we don't want is a slop cannon: volume that nobody has judged.

So this is built for a team of a human and an AI agent, working on the same model of the story, to make sure the story has what it needs to be interesting before final drafting begins. See [the story model](docs/rebuild/story-model.md#fluidity). The first version is headless, a CLI and a skill used in an agent session, to test the model before building screens for it. The web app is the current plan and not a commitment: the form follows the results.

## Key Differentiators

- **Structured Writing Experience**: Move beyond the blank canvas with a structured approach to writing and worldbuilding.
- **Deep AI Integration**: AI is integrated into various aspects of the workflow to assist and enhance the creative process, up to and including writing the story.
- **Extreme AI Control**: Gain fine-grained control over the input to the AI model, including context, parameters, and samplers. Full support for local models.


## Tech Stack

- **Frontend**: React 19 with TypeScript
- **Routing**: TanStack Router
- **State Management**: @legendapp/state with localStorage persistence
- **UI Framework**: Tailwind CSS
- **API Client**: Auto-generated OpenAPI client with @hey-api/openapi-ts
- **LLM Integration**: SSE (Server-Sent Events) streaming
- **Error Handling**: neverthrow for functional error handling
- **Build Tool**: Vite
- **Code Quality**: Biome for formatting and linting

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Bun](https://bun.sh/) (v1.1 or later)

### Setup

1. Clone the repository:
   ```sh
   git clone <repository-url>
   cd demiurge
   ```

2. Install dependencies:
   ```sh
   bun install
   ```

3. Start the development server:
   ```sh
   bun dev
   ```

This starts your app in development mode, rebuilding assets on file changes.

### Available Scripts

- `bun dev` - Starts the development server with hot reloading
- `bun build` - Builds the application for production
- `bun start` - Starts the production server
- `bun format` - Formats code with Biome
- `bun gen-client` - Regenerates the OpenAPI client from spec

## Project Structure

```
src/
├── client/              # Auto-generated OpenAPI client
├── components/          # Reusable UI components
├── lib/                 # Business logic and state management
│   └── state/           # Application state (chat, LLM)
├── routes/              # TanStack Router route components
├── styles/              # CSS files
├── utils/               # Helper functions
└── router.tsx           # Router configuration
```
