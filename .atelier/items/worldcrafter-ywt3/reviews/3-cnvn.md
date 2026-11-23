---
schema: atelier.review
schema_version: 3
round: 3
commit: ac25c22e642f0c1b101069dc54153b6ac9be415f
reviewers:
- thread:delegated-task:command%3Amcp%3Ac5f28f35-c8c7-4483-a421-3a27108a9e7b%3Adelegate-task%3A6f36f11b-56a0-4518-8ba0-d094b6c4ebdc
model: gpt-6.1-sol
verdict: changes
created_at: 2026-11-23T08:36:07.263165925Z
---

## Summary

Complexity: high. The whole change connects persistent session configuration, profile defaults, per-topic drafts, request inspection and the topic sheet layout.

Value: high. Hosting the existing slip is needed to inspect and edit topic requests, an explicit mission outcome.

Risk of merging: medium. The new matcher can refuse valid profile-default edits and hold the composer's Send, but the refusal is visible and retains the writer's message and edits.

I checked the carried finding and the changes from `05e4e0cc` to `ac25c22e`, including the shared prompt template, extraction boundaries, default preparation and the expanded regressions. I also read the surrounding host, draft lifecycle, reference navigation, defaults initialization, stylesheet rules and documentation against the Done when lines. `cd app && bun run check` passes: TypeScript and Biome are clean, 1762 tests pass and none fail. The topic tests print no act() warnings; other app tests still do.

The append, rename and second-save regression now passes, and the extraction code preserves the appended instruction in that case. I independently reproduced a new refusal with a single newline before the appended instruction, first through `profilePrompt` and then through `createTalk`, the memory adapter, `createAgentDefaultsStore` and the stub LLM server, without changing source files. The integration is worth its size; no separate shrink is warranted. I did not inspect browser rendering, so the gloss leader and narrow layout are checked through source and stylesheet tests only.

## Finding 1: Preserve appended instructions when saving the prompt default
Recommendation: fix now
Was: 2-nd1g.2
Response: fixed in c3265cd
Now: fixed

`findTopicPrompt` now matches the generated section's template rather than taking everything after the heading. In the carried reproduction, it finds the old topic section after a rename and leaves the appended instruction outside the extracted string. The expanded app regression performs the first default save, rename and second default save, then verifies that a new topic receives both instructions. This fixes the reported silent loss.

## Finding 2: Allow a single newline after the generated topic section
Recommendation: fix now

`app/src/talk/scope.ts:175` requires the generated section to be followed by two newlines or the end of the prompt. The editor imposes no such formatting rule. An instruction appended with a single newline is accepted on its first save, but the session then holds a prompt that this new matcher cannot recognize. Every subsequent profile-default prompt edit is refused as if the writer had changed the topic section, even when that section is unchanged. This is a regression from the previous extraction, which recognized the unchanged generated section in this case.

I reproduced this against the stub server:

1. Start a world topic and read its next-turn system prompt as `prompt`.
2. Send a profile-default edit with `${prompt}\nAlways answer in exactly one sentence.`. It succeeds and the model answers.
3. Send another profile-default edit with `Be concise.\n` prepended to that same prompt. It returns `default_not_saved`, saying to keep the topic section as it is. The topic section was not edited, and the model receives no new request.

The observed results were `firstSave: true`, `secondSave: false`, and two stub requests both before and after the second attempt. A direct extraction check also returns null for the first saved prompt, whereas the same example with two newlines succeeds. No rename is needed. Because extraction reads the already stored prompt, adding a blank line only in the new draft does not repair it.

Recognize the unchanged generated section when ordinary appended text follows on the next line, while preserving that text. Add a regression that saves an appended instruction with one newline and then saves a second default edit successfully; the current regressions use two newlines throughout and miss this case.
