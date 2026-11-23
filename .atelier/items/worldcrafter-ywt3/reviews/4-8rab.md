---
schema: atelier.review
schema_version: 3
round: 4
commit: d09e4bbd34ad078711864e73907d4a94a383a93e
reviewers:
- thread:delegated-task:command%3Amcp%3A80f30bfb-85ec-4753-b756-70605113a278%3Adelegate-task%3A01475a1d-6ee8-4a9b-8f00-ac197004c350
model: gpt-6.1-sol
verdict: approve
created_at: 2026-11-23T08:44:15.146498669Z
---

## Summary

Complexity: high. The whole change connects persistent session configuration, profile defaults, per-topic drafts, request inspection and the topic sheet layout.

Value: high. Hosting the existing slip provides the request inspection and editing the mission needs.

Risk of merging: medium. It changes the requests sent from topic sheets and the saved defaults for later sessions; failures reach writers, but the work is reversible and refusals retain the message and edits.

I checked the carried finding and the changes since `ac25c22e`, including `402c267` and the merge of anchored topics. I read the prompt matcher, extraction boundaries, repeated-save regressions and conflict resolutions, and checked the host, draft lifecycle, defaults initialization, reference navigation, stylesheet rules and documentation against the Done when lines. The shared prompt template retains anchored topics' multiline passage quoting, and the anchored-topic tests use the new turn wrapper correctly.

`cd app && bun run check` passed: TypeScript and Biome are clean, 1789 tests pass and none fail. This includes the stub-server app tests for Request, composer edits, defaults reaching a new topic, reference navigation, refusal recovery and repeated default saves. I also independently exercised 12 extraction and repeated-save cases across world, scene and multiline passage scopes, combining one and two newlines on both sides of the generated section. All passed and preserved the writer's instructions. `git diff --check master...d09e4bbd` passed.

The integration is worth its size; no separate shrink is warranted. I found no new problem. I did not inspect browser rendering, so the gloss leader and narrow layout are verified through source and stylesheet tests only. The running-turn slip remains explicitly documented as unbuilt and outside this item's Done when lines.

## Finding 1: Allow a single newline after the generated topic section
Recommendation: fix now
Was: 3-cnvn.2
Response: fixed in 402c267
Now: fixed

`findTopicPrompt` accepts the generated section on lines of its own with a single newline before or after it. `profilePrompt` removes that exact section and preserves the writer's text on both sides. The new app regression saves an instruction on the next line, saves another default edit from the same session, and verifies that a new topic receives both instructions with only its own topic section. It passes, as do the independent repeated-save checks, including multiline passage quotes after the merge.
