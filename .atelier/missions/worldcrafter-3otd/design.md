---
status: draft
last_changed: "2026-10-30: consistency checking against canon dropped as a likely next mission (Sumeet)"
---

# Shape

- **Fresh skeleton, web-first.** A new app is built as an installable PWA
  and the keep-list modules are ported into it. The old app is reference only
  until it is retired. Storage is local-first in the browser. A sync backend
  (a Cloudflare Worker, behind Cloudflare Access) comes in a later mission, so
  that one writer can switch between laptop and phone. Desktop and mobile
  wrappers may come later.
- **Story time is world-first** (`docs/rebuild/story-time.md`). Events are
  ordered by happens-before. Clocks are frames, with the world calendar as the
  default frame. Fact changes are anchored to events. Narrative order comes
  from the manuscript outline. This is in the world-fact schema from the
  first increment, not added afterwards.
- **Data boundaries** (`docs/rebuild/data-model-boundaries.md`). Content,
  annotations, world facts and discussions live in separate stores.
  Annotations never write to the content tree.
- **A typed model with standoff layers.** The TypeScript model is the
  source of truth: content nodes with stable IDs, plus annotation layers
  anchored to them, like a screenplay breakdown over locked scene numbers.
  Serialisation belongs to the storage and export adapters, not the model.
  The content node types are our own, written so that Plate's nodes satisfy
  them, so Plate is an editing view rather than the domain model. Markdown
  export is readable and one-way (worldcrafter-7hjn).
- **Restricted content schema.** A node type is only allowed once its AI
  projections (`prose`, `addressable`, `plain+map`) are defined.
- **Conversions are asymmetric.** Tree to text goes through purpose-specific
  projections with source maps. Text to tree only happens inside an AI
  segment, as block-ID edit operations, or on import.
- **One OpenAI-compatible LLM client** with sampler, system prompt and
  logprob passthrough and backend profiles (llama.cpp, OpenRouter,
  featherless). It replaces the three old backends. It reaches a backend
  either directly (local llama.cpp) or through the Worker (hosted providers,
  and a home llama.cpp over a Cloudflare Tunnel). The proxy comes with the
  sync mission. Stored requests look the same either way.
- **Entities and discussion** (`docs/rebuild/entity-pipeline.md`,
  `docs/rebuild/talk-pages.md`) moved out of this mission. The old NER model
  and global chat are removed without replacements here.
- **Commands first.** Actions are typed commands, the UI calls them, and an
  external agent (MCP, later) can call the same ones. Commands, projections
  and context assembly use no DOM or browser-only APIs, so they can run in a
  Worker later (for example, background jobs).
- **Keep list, ported deliberately:**
  - `docs/philosophy.md`
  - AI segments and placeholders
  - the document-model V2 entry model
  - `relation-model.ts`
  - `entity-suppression.ts`
  - sampler control
- **When qualities conflict:**
  1. The writer's visibility into and control over the AI.
  2. AI capability.
  3. Feature speed.

  This is a personal project, not an enterprise app. Losing data is still a
  bug, but durability is not ranked above the rest: a schema version and a
  backup export are enough, and breaking changes are fine when they make the
  model better.

# Risks and Unknowns

- Plate's node IDs may not survive split and paste without custom handling.
  The first increment tests this before anything else depends on it.
- It is not yet settled whether annotations anchor by offset or by quote
  (`data-model-boundaries.md`, open questions).
- Hosted providers may not pass through the samplers we want (XTC, DRY and
  others). The fallback is a home llama.cpp reached over a Cloudflare Tunnel,
  which only works while that machine is on.
