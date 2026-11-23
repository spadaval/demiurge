---
schema: atelier.review
schema_version: 3
round: 2
commit: 05e4e0cca3a3ef6e81f1fe855f68d59e7ebb5737
reviewers:
- thread:delegated-task:command%3Amcp%3Ac5f28f35-c8c7-4483-a421-3a27108a9e7b%3Adelegate-task%3A28df40d7-b2ed-4b03-8a01-8db1de1a67a2
model: gpt-6.1-sol
verdict: changes
created_at: 2026-11-23T08:30:00.529599437Z
---

## Summary

Complexity: high. The whole change connects persistent session configuration, profile defaults, per-topic drafts, request inspection and the topic sheet layout.

Value: high. Hosting the existing slip is needed to inspect and edit topic requests, an explicit mission outcome.

Risk of merging: high. The remaining prompt extraction error silently removes writer-authored instructions from saved defaults and future requests.

I checked both carried findings and the changes from `172929e2` to `05e4e0cc`, including preparation before message storage, draft retention after errors, prompt extraction, and the added regressions. I also read the surrounding topic host, reference navigation, defaults initialization, stylesheet rules and documentation against the Done when lines. `cd app && bun run check` passes: TypeScript and Biome are clean, 1761 tests pass and none fail. The topic tests pass without act() warnings; other app tests still print them.

I reproduced a remaining instance of Finding 2 using `createTalk`, the memory adapter, `createAgentDefaultsStore` and the stub LLM server, without changing source files. The smaller extraction test also reproduces it. The integration is worth its size; no separate shrink is warranted. I did not inspect browser rendering, so the gloss leader and narrow layout are checked through source and stylesheet tests only.

## Finding 1: Keep unsent edits when saving a profile default fails
Recommendation: fix now
Was: 1-warp.1
Response: fixed in d4c0024
Now: fixed

`take` now calls `prepareNextTurn` before committing the human message. A refused default therefore returns before that message is stored. The new app regression exercises both a new topic and an existing topic, checks that the message, prompt and context remain, and then accepts the save and verifies one delivery with those edits. The separate error-display fix also keeps the quota error visible for an unsaved topic.

## Finding 2: Preserve appended instructions when saving the prompt default
Recommendation: fix now
Was: 1-warp.2
Response: fixed in d4c0024
Now: kept

The direct append case is fixed, but the new renamed-topic fallback still removes appended writer instructions. At `app/src/talk/talk.ts:253-256`, `topicPart` takes everything after the last topic heading from the session's existing prompt whenever the newly generated topic part no longer matches. That includes instructions appended during an earlier turn. `profilePrompt` then removes that whole string at lines 272-274.

Reproduction against the stub server:

1. Start topic A as "Who lit the lamp?".
2. Append "Always answer in exactly one sentence." to its next-turn system prompt, choose Profile default and send. The saved default correctly contains that instruction, and the session keeps it after its topic part.
3. Rename A to "Who lit it?".
4. Open its next-turn prompt, prepend "Be concise.", choose Profile default and send. This succeeds, but the saved default loses the one-sentence instruction. A new topic's next-turn prompt also lacks it.

The observed checks were `true` for the instruction in the default after step 2, `false` after step 4, and `false` in the new topic. The existing renamed-topic unit test starts from a prompt with no appended text, so it misses this case. Preserve the boundary of the generated topic part independently of later writer text, or refuse an ambiguous extraction instead of silently deleting it. Add a regression combining an appended instruction, a rename and a second default save. This remains the original finding's silent loss of appended instructions, so it still blocks merge.
