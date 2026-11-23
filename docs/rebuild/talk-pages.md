# Talk Pages

Status: built (`worldcrafter-lhh3`, 2026-11-23): topics, turns through the story agent runner, and the World inbox. Anchored launch from scenes, passages and records is `worldcrafter-rxvy`; the agent slip is `worldcrafter-w4mr`, hosted on topic sheets by `worldcrafter-ywt3`; edit proposals by block ID are `worldcrafter-yx9v`.

## Idea

Chat is useful, but Demiurge isn't a chatbot. Use Wikipedia's model: **every document has a talk page**. The document is the artifact. The talk page is where you discuss it. Conversation is always *about* something, and it's kept next to the thing it's about.

This replaces the old global chat threads (the old app's `src/lib/state/chat.ts`, now removed), which weren't attached to anything.

## Scopes

| Scope | Wikipedia analogue | Used for |
|---|---|---|
| Document talk | Talk:Article | "Is Ardelia too young to lead the Ninefold?", rework this section, research |
| World talk | Village pump | brainstorming before any document exists, cross-cutting questions |
| Block anchor (optional) | — | a topic pinned to a specific paragraph (like a margin comment that grew up) |

## Structure

- A talk page is a list of **topics** (Wikipedia's word; "thread" is avoided because it means story time to writers). Each has a title and a status: `open` / `resolved` / `archived`.
- Each message records its **author**: you, or a model (with model id and an assembled-request reference, so you can inspect exactly what it saw).
- **Either side can start a topic.** The AI posts discovery proposals, possible contradictions and upkeep suggestions as topics on the relevant page. The **world inbox** is just "all open topics started by AI, across the world".

## Context is automatic and visible

When you're on a document's talk page, the context builder includes:
- that document (`prose` projection)
- its world-fact card and relations
- cards for entities it mentions
- the current topic

Like generation requests, the assembled request can be viewed and edited.

## Output goes to the artifact, as proposals

The talk page is never where content lives. Useful results are moved into the document or the world:

- **Propose edit:** AI edit operations against block IDs, which land in the document as reviewable suggestions.
- **Propose fact or relation:** go to the world-facts store after you accept them.
- **Record decision:** turns a conclusion ("Ardelia is 340 and looks 30") into a fact proposal, so the decision isn't buried in chat history.

Closing a topic can prompt: "Record anything from this as a fact?"

## Data model

Discussions are their own store, the `talkRecords` collection (neither content nor annotations): one record per topic (`<topic>/topic`) and one per message (`<topic>/message/000001`). `app/src/talk/records.ts` owns the shapes:

```ts
type TopicScope =
  | { kind: "world" }
  | { kind: "scene"; scene: string }                 // a bible scene ID
  | { kind: "passage"; scene: string; documentId: string; blockId: string; quote: string }
  | { kind: "record"; ref: string };                 // `drive:keep-light`

type TalkAuthor =
  | { kind: "human" }
  | {
      kind: "model";
      profile: string;          // the profile's label, signed "Model · <label>"
      model: string;
      session: string | null;   // the agent session the turn ran in
      requestId: string | null; // the agent step record whose answer this is
      trace: string[];          // every step record of the run: its tool calls
    };

type Topic = {
  id: string;
  title: string;
  scope: TopicScope;
  status: "open" | "resolved" | "archived";
  startedBy: TalkAuthor;
  session: string | null;       // one agent session per topic, once a turn ran
  messages: number;
  answered: number;             // the last agent run whose answer is recorded
  createdAt: number; updatedAt: number; closedAt: number | null;
};

type TalkMessage = {
  id: string; topic: string; index: number;
  author: TalkAuthor;
  body: string;                 // markdown
  calls: { name: string; ok: boolean; summary: string }[];
  createdAt: number;
};
```

A topic's turns run through the story agent runner (`docs/rebuild/story-agent.md`) as one `plan` session per topic, in the agent scope its scope maps to (a passage's model sees its scene, and the passage is quoted in the topic's prompt). A session started on a topic that already has turns (one the model raised) takes them up as its conversation. The full request, tool arguments and results stay in the agent records; a message keeps a reference to them and a one-line summary of each call. A model message is recorded from the run's stored steps, and `answered` says which run it was, so an answer whose save failed is recorded on the next load, send or Try again, once. Every write of a topic goes through one queue per topic, so a rename during a turn isn't lost. A topic whose block anchor goes stale (the block is gone or no longer holds the quote) falls back to the scene.

The World inbox (`app/src/talk/inbox.ts`) is every open topic a model started, newest first, then the contradictions the story keeps (`storyContradictions`).

Not built yet: a tool for the agent to raise a topic itself (`Talk.raise` is the command it would call), proposals in a turn ("Record as fact"), and rendering a turn's Markdown beyond paragraphs.

## Why this fits the philosophy

- Writing stays the main surface. Chat sits beside it, scoped to one thing.
- The AI is a participant whose contributions are attributed and reviewable, the same way other people's are on Wikipedia, and like Patchwork's bots.
- Every action available in a topic (propose edit, add fact) is a typed command that an external agent can call as well.
