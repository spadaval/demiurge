---
schema: atelier.review
schema_version: 1
id: worldcrafter-3tvf
title: finding on worldcrafter-s2mz @87093f72
target: worldcrafter-s2mz
identity: round0-reviewer
commit: 87093f723c888cfa56a358b3225708ebb5ee6c8e
created_at: 2026-11-05T08:14:46.944119734Z
event:
  event: finding
  recommendation: fix_now
---

medium: app/src/story/trace.ts (the 'the scene <how>' whole-file prose suspect in the prose loop) the edit prompt fills up with whole scene files that carry no evidence. Each scene touching the record is suspected with inText true and line 0, whatever the change was, so it passes the edit prompt's inText filter. On comparison-2 ac0caf8b story.json with 8 scene files of about 2,000 words: update-actor kesh --notes '...' (name unchanged) prompts 8 suspects, all 'scenes/<id>.md: the scene is in it', one per scene Kesh is in, and nothing in any of them states the old notes. update-drive kesh-what --stakes '...' prompts 4, all 'the scene puts it under pressure'. On a novel-scale bible a protagonist is in most scenes, so every small edit to a main actor or drive prints five whole files with no reason in their text: exactly the noise that makes a writer ignore the prompt. Fix: in change mode (was given), don't count the scene-touches suspect as in text, or drop it, unless a paragraph of that file matched. Keep it in on-demand trace.
