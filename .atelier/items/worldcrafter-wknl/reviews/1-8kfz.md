---
schema: atelier.review
schema_version: 3
round: 1
commit: 0177af781b1e959b6c4c0d25a400c68ff5f1777d
reviewers:
- thread:delegated-task:command%3Amcp%3A80910097-6b0b-4133-9c95-9f3a98d79e46%3Adelegate-task%3A07e745cf-4ce8-4bba-9f76-3b375b4d9b6f
- thread:delegated-task:command%3Amcp%3A6d73f777-f6d1-4f6c-b6f0-9f634b2c4463%3Adelegate-task%3A7921d88b-4c9f-4fb1-a9f8-5a4bcfb9b8cc
model: gpt-6.1-sol
verdict: approve
created_at: 2026-11-23T05:05:18.169543345Z
---

## Summary

Complexity: medium. Removing notes adds cut ranges to the existing source map and shares the matcher between projections and workspace decoration.

Value: high. Keeping writer notes out of scene context is required before prose generation can use that context safely.

Risk of merging: medium. The projection and cursor mapping affect generation, but stored content and exports remain intact and the change is easy to revert.

Reviewed the full diff against master at 0177af781b1e959b6c4c0d25a400c68ff5f1777d and checked every Done when line. The literal-text representation is documented in the Report and data-model boundaries. The shared matcher preserves the workspace's existing note syntax. Prose removes notes across marks and links, handles multiple notes and notes-only blocks, and preserves unclosed or malformed brackets. Plain projection and export retain their existing behavior.

Read the source-map implementation and its cursor consumer in the context builder. The earlier reviewer independently compared forward positions, character positions and 6,103 nonempty ranges against retained source-character indices across 343 combinations of notes, whitespace, unclosed brackets and Unicode, and reported that all passed. After taking over the review, I independently read the full diff, source-map boundary behavior, shared matcher, whitespace cuts and downstream cursor fallback. I found no correctness issue.

Ran `cd app && bun run check`: it exited successfully, with all 1,165 tests across 54 files passing, including every story CLI test. TypeScript passed and Biome reported only three existing warnings in the unchanged `scripts/story.ts`. The earlier reviewer also reported a full passing check. The context tests verify that writer notes and entities named only within them stay out of the request, and that cursors within notes resolve correctly.

Checked the unchanged `.lm-note` CSS against DESIGN.md: notes remain italic sans at 15px, and toggling Notes changes paint only. The workspace rendering and paint-only DOM tests passed. I did not run a browser geometry measurement; neither the note matcher behavior nor the rendering/CSS rules changed.

No findings. The scope is appropriate for the goal, and the value warrants the source-map changes.
