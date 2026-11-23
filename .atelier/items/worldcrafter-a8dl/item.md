---
schema: atelier.item
schema_version: 3
id: worldcrafter-a8dl
title: 'Agent runner: an edit and its log step are two writes, and the busy lock is per runner'
status: open
mission: null
labels: []
priority: medium
blocked_by: []
implementers: []
ready: null
trivial: null
caused_by: null
created_at: 2026-11-23T04:13:38.387736223Z
---

## Goal

Taken from deferred finding worldcrafter-667u/1-z9kc.1, in .atelier/items/worldcrafter-667u/reviews/1-z9kc.md:

> Finding 1: A story edit and the step that records it are two writes
> Recommendation: defer
> `executeStoryToolCall` saves the bible inside `executeStoryCommand` (`tools.ts:1171`), then the runner appends the tool result and calls `saveSession` (`runner.ts:630-645`). Those are separate `storage.batch` calls. If the process stops between them, `session.next` is still `tools`, the call is still unanswered, and `resume` runs it again. `story-agent.md:31` and the Report say this; `story-agent.md:23` still says a crash resumes where the session was. Adds of an existing id refuse the retry; `moveScene` to the same index is idempotent. A later item can put the story writes and the agent records in one batch.

Also covers finding 2 of the same review (worldcrafter-667u/1-z9kc.2): the busy lock is a `Set` on one `createAgentRunner` instance, so two runners on the same adapter can run one session at once and the last write wins.

## Done when

- [ ] A story edit and the agent step that records it are written in one `storage.batch`, or `resume` detects an edit that already landed and does not run it again; a test stops between the two writes and resumes.
- [ ] Two runners on one `StorageAdapter` cannot run the same session at once, or `docs/rebuild/story-agent.md` states the one-runner-per-world rule and the UI and Worker items (`worldcrafter-w4mr`, `worldcrafter-ji5d`) are checked against it.
- [ ] `docs/rebuild/story-agent.md` line on crash recovery matches the behaviour.
- [ ] `cd app && bun run check` passes.

## Scope

In: `app/src/agent/`, `app/src/story/tools.ts` where the batch has to be shared, `docs/rebuild/story-agent.md`.
Out: multi-device sync of agent sessions.
