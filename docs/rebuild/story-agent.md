# The story agent runner

The app runs its own tool-calling loop between a model and the story bible (`app/src/agent/`, `worldcrafter-667u`) instead of handing the conversation to a vendor's agent framework. The app decides everything the model sees: the system prompt, the context, the tools, and which model and sampler each kind of work uses. Every step is logged in storage. The runner touches no DOM, so it runs headless in tests against a stub server and the memory adapter.

## Sessions and roles

A session has a role, a scope and a system prompt, fixed when it starts.

- **Role.** `plan` is structural work and talk: outlining, reworking, weighing open questions. It offers every story tool by default. `prose` is drafting a scene, and offers no tools by default. Each role is bound to its own backend profile and sampler (`ProfileBindings` in `profiles.ts`), so planning can go to a reasoning model and drafting to a finetune or a local model. A binding can narrow or widen its tools (`all`, `queries`, `none`) and can stream. Bindings are browser configuration like the backend profile: the runner is given them, and a session records only its role, so no API key is stored.
- **Scope.** The whole story, one scene, or one bible record (`drive:keep-light`). A scope the bible doesn't have is refused when the session starts.
- **System prompt.** Editable per session. The default for `plan` is `.agents/skills/story-sketch/craft.md` word for word, then that skill's mechanics rewritten for the tools; a test fails when craft.md changes and the copy in `prompt.ts` doesn't. The default for `prose` is drafting guidance drawn from the skill's "Writing a scene".

## The context packet

Each writer message is sent with a context packet assembled from the store as it stands (`context.ts`). Every section is the output of a story query, the same lines the CLI prints. A scene's packet has the scene record; `reader-order --before` the scene, which holds what the reader has been told and what is held back, the viewpoint character's marks and each count as the scene opens; each event it depicts; each person in it; and its prose so far. A world's packet has the premise, the scenes, the open questions and the contradictions. A record's has the record, what it touches and the scenes that touch it. The packet is deterministic: the same world gives the same text, byte for byte, which is what makes replay work.

The packet goes at the top of the writer's message, not in the system prompt, so the conversation's prefix stays fixed and a local server can reuse its cache. Earlier messages keep the packet they were sent with; tool results after them are newer.

## Running, stopping and the log

A run starts with a message (`send`) or a `resume`. It calls the model, runs the tools it asks for, and calls it again until the model answers without a tool call. It stops early, and `resume` goes on, when the writer asks it to pause (checked before each model call and each tool call), when it has made `maxSteps` model calls, when the session asks for approval before edits (`resume` with `decline` refuses them and tells the model why), or when a model call fails. Aborting the signal cancels instead: the call in flight is dropped, calls not yet run are answered as cancelled, and the session waits for the writer.

Storage holds the session (`<id>/session`: the conversation, each writer message with its packet, and where it stands) and one record per step (`<id>/step/000001`: the exact request, the model's answer, and each tool call with its result and the story records it changed, before and after), in the `agentRecords` collection. The session and its current step are saved in one batch after every model call and every tool call, so a session stopped anywhere, even by a crash, resumes where it was. `replayModel` answers with a log's recorded responses and refuses a request that differs from the recorded one, so a session can be replayed on a copy of the world as it started and checked against what it did.

## What it does not do yet

- Most of the UI (`worldcrafter-mtkn`) and running sessions in the Worker (`worldcrafter-ji5d`). Talk pages run their turns through the runner (`docs/rebuild/talk-pages.md`).
- Writing a draft into the scene's document: the prose role's answer is in the log and the conversation, and putting it in the document is the editor's job.
- Completion-endpoint models: every role uses chat. A finetune served only as raw completions would need a prompt layout for the conversation.
- Timeline values the model writes are asserted, as the CLI's are. Whether they should carry an `inferred` authority is a product call.
- A story edit and the log entry recording it are two writes. If the app stops between them, resuming runs that call again.
