---
schema: atelier.review
schema_version: 1
id: worldcrafter-lp1a
title: approval on worldcrafter-hqgq @5fe09a73
target: worldcrafter-hqgq
identity: code-reviewer
commit: 5fe09a736296a39962d1a7f7a8d6679b4faea2f6
created_at: 2026-11-05T02:27:45.966902105Z
event:
  event: approval
---

Review of 8937c5a (worldcrafter-ac45 harness changes) at 5fe09a7. readHeldBack: realpaths the premise file, refuses it under the repo or the frozen tool/ (tests cover both), checks the sha256 of the raw bytes (sha256sum of sealed/premise.txt is 7d488ce0..., matching kkmy), checks the slug's form and that it doesn't clash with thukker. The text goes only into heldBackPremise -> stepPrompt; RunRecord holds slug, title (= slug) and tunedOn; FROZEN.json and freeze are unchanged; sandbox mounts are unchanged (sealed/ is never mounted); errors print hashes, not text. Prompts: stepPrompt is unchanged, and a new test shows the step-1 prompt around the held-back text matches Thukker's for both arms. run still refuses anything but thukker (line 1020, tested). key.json is now an object with packets[]; app/scripts/judging/panel.ts doesn't read key.json (judging/README.md:53 excludes it) and only tests use it. bun test scripts/comparison: 46 pass. bun run check (twice): tsc + biome pass, 961 pass, 1 fail. The failure is generate.test.ts 'streaming 50 KB ... stays fast', a wall-clock budget test (12.9s and 31.8s against 10s) at load average about 17-19. generate is untouched by this change; author's evidence worldcrafter-aall has exit 0. Two low no_action findings.
