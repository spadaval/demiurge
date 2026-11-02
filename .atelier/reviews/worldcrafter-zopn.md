---
schema: atelier.review
schema_version: 1
id: worldcrafter-zopn
title: finding on worldcrafter-la1m @ff94ab64
target: worldcrafter-la1m
identity: code-reviewer
commit: ff94ab641ab8085b5cd9cfa3e1713b3a79709d9b
created_at: 2026-11-02T04:00:51.082828804Z
event:
  event: finding
  recommendation: fix_now
---

low: README.md:47 The setup step now reads 'git clone <repository-url>' then 'cd demiurge', but the repo is still spadaval/worldcrafter (spadaval/demiurge does not resolve on GitHub), so a fresh clone creates worldcrafter/ and the cd fails. This branch introduced the false instruction; on master it worked. Fix: 'git clone <repository-url> demiurge', which holds before and after any repo rename.
