---
schema: atelier.review
schema_version: 1
id: worldcrafter-quzq
title: approval on worldcrafter-ql1d @c340f7a1
target: worldcrafter-ql1d
identity: rubric-reviewer
commit: c340f7a150622852090eaa142b61f73b105c457e
created_at: 2026-11-05T08:35:13.404510122Z
event:
  event: approval
---

Approves ql1d (blvm, w716, x2ij) at c340f7a after master was merged in at 166af10, adding to worldcrafter-midy. The merge changes nothing under app/scripts/round, judging or comparison except the fixture fix in c340f7a, which adds plants and paysOff to the round test's scene stub to match the new scene type. Checked the round runner against the merged CLI: VOCAB_KINDS now includes object (actor candidate constraint drive event fact knowledge object open-question reader-question scene version) because it is derived from KIND_NAMES; commandNames on the merged story.ts --help finds 58 hyphenated commands, including add-object, set-participant, add-drive-turn and reader-order; vocabHits flags object:<id> refs and add-object in sample text. Single-word commands (trace, show, render, gaps, list, scenes, mentions, touches, init, constrain, contradictions) aren't checked, by design, since they're ordinary English words; a ref like object:x is still caught. The writer prompt and skill still agree: the skill still has init, scenes/<id>.md, 'show scene:<id>' printing the prose path (verified on the merged CLI) and model-gaps.md, and set-scene-links now documents plants and paysOff, which the scene prompt's 'link ... and update the story file where needed' leaves to the skill. bun run check at c340f7a: 1100/1100 pass.
