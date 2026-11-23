---
schema: atelier.review
schema_version: 3
round: 1
commit: 172929e25e520e5a531f138cac83cece66ff3d3c
reviewers:
- thread:delegated-task:command%3Amcp%3Ac5f28f35-c8c7-4483-a421-3a27108a9e7b%3Adelegate-task%3Af57f64d9-7061-4547-b678-e61e6ffce58f
model: gpt-6.1-sol
verdict: changes
created_at: 2026-11-23T08:22:01.495625305Z
---

## Summary

Complexity: high. New per-topic draft and slip state crosses the app service, talk service, session configuration, defaults store and sheet layout.

Value: high. This makes the existing agent slip reachable and lets the writer inspect and change topic requests.

Risk of merging it: high. Two reproduced paths silently discard the writer's prompt or context edits.

I read the full code change, the existing slip and next-turn implementation, session request recording, the relevant DESIGN.md requirements and the added tests. `cd app && bun run check` passed: typecheck and Biome clean, 1756 tests passed, none failed. The app tests cover Request, both Context controls, Discard edits, invalid sampler blocking, composer sending, profile defaults and record navigation with the slip retained. I also ran isolated Bun reproductions against the stub LLM and memory storage for first-turn prompt/model/sampler/context edits, inheritance by a second topic and the two failures below. First-turn model and sampler defaults and the context override reached the stub correctly.

The hosting and responsive rules follow the specified sheet structure in code, and the documentation no longer lists hosting as unfinished. I did not render the layout in a browser; the stylesheet tests verify declarations rather than placement. The reported absence of a live running-turn slip is outside the item's explicit acceptance criteria.

The scope is worth its cost; I found no smaller change that achieves the acceptance criteria. Fix the two losses of writer edits before merging.

## Finding 1: Keep unsent edits when saving a profile default fails
Recommendation: fix now

`app/src/talk/talk.ts:590` commits the human topic message before `sendNextTurn` attempts to save defaults or configure the session (`:619`). When that save is refused, `sendNextTurn` returns before the session accepts the message. However, `app/src/app/talk.ts:458-461` treats the stored topic as proof that the edits were sent and calls `nextSent`, which deletes the draft. The existing-topic path makes the same mistake at `:489-491` by testing only the topic's message count.

I reproduced this with a key-value store that throws on the agent-defaults key: edit the next turn's prompt with scope `default`, edit its context, then send the first message. `start` returns false with the quota error and the stub receives zero requests. Nevertheless the composer text becomes empty, the next-turn draft is discarded, the topic contains the human message, and its session has zero runs and its original prompt. The topic has `stop: null`, so it offers no retry. Sending another message then sends only that new message under the old prompt; the first message and both edits never reached the model.

Distinguish a topic message being stored from the runner accepting its request. Retain the unsent prompt/context edits and provide a retry that delivers the original message once, without adding a duplicate topic turn, when defaults or session configuration fails before acceptance. Cover both a new topic and an existing topic with a refused defaults save.

## Finding 2: Preserve appended instructions when saving the prompt default
Recommendation: fix now

`app/src/talk/talk.ts:249-251` removes everything from the last `# This talk page` heading onward, and `topicDefaults` applies that truncation to every profile-default prompt edit at `:263`. Since the generated topic section is at the end of the editable prompt, a writer who adds an instruction at the end of that field has that instruction silently removed from the saved default.

I reproduced this by reading topic A's next-turn prompt, appending `Always answer in exactly one sentence.`, choosing the default scope and sending. Topic A's request contains that instruction, but `defaults.get(profile, "plan").systemPrompt` does not, and topic B's first request does not. The default save succeeds. The added app test prepends its instruction before the topic heading, so it misses this normal way to edit a prompt.

Removing topic A's generated context from a shared default is valid, but deleting all following writer-authored text is not. Track or remove the generated topic text without truncating appended instructions, and add an app regression that appends an instruction, saves it as the profile default, and verifies that a new topic receives it together with only its own topic context.
