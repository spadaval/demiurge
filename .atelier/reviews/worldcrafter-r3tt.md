---
schema: atelier.review
schema_version: 1
id: worldcrafter-r3tt
title: finding on worldcrafter-hqgq @0df51cbf
target: worldcrafter-hqgq
identity: code-reviewer
commit: 0df51cbf15fcdc910b82305333c2eff9948808a0
created_at: 2026-11-05T02:14:47.706177439Z
event:
  event: finding
  recommendation: no_action
---

low (worldcrafter-fax9): app/scripts/comparison/transcript.ts:199 mentionsCalls matches any Bash command containing 'mentions <word>:', so a commit message such as git commit -m 'Fix what mentions event:wreck showed' counts as a mentions call and ranMentions passes without the CLI running. Only the pre-freeze skill-check uses it (not freeze/run/phase-b), and the smoke's one match is a real CLI call, so no action now; tighten to require STORY_CLI or $S before mentions if skill-check becomes a gate.
