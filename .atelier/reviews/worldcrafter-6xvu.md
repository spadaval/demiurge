---
schema: atelier.review
schema_version: 1
id: worldcrafter-6xvu
title: finding on worldcrafter-hqgq @5fe09a73
target: worldcrafter-hqgq
identity: code-reviewer
commit: 5fe09a736296a39962d1a7f7a8d6679b4faea2f6
created_at: 2026-11-05T02:27:45.720561680Z
event:
  event: finding
  recommendation: no_action
---

low: app/scripts/comparison/README.md:27-30 says the held-back text 'is never written to this repository, a commit, FROZEN.json, run.json or the key' (the commit message says the same), but the key directory does hold it: key/raw/<run>/step-n/prompt.md (README.md says so in the same paragraph), each step's files/ snapshot and readable.md, and the packets, since the sketch starts from the premise. All of these are written by phase-b after the freeze, so nothing leaks before it; only the wording is wrong. Suggest: 'The text reaches only the sessions' prompts and what phase-b writes after the freeze (key/raw and the packets); never this repository, a commit, FROZEN.json or run.json.'
