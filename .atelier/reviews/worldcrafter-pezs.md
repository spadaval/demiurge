---
schema: atelier.review
schema_version: 1
id: worldcrafter-pezs
title: finding on worldcrafter-hqgq @5fe09a73
target: worldcrafter-hqgq
identity: code-reviewer
commit: 5fe09a736296a39962d1a7f7a8d6679b4faea2f6
created_at: 2026-11-05T02:27:45.839125639Z
event:
  event: finding
  recommendation: no_action
---

low: app/scripts/comparison/comparison.ts:855-860 readHeldBack checks the premise file's sha256 but not the slug file's, although decision worldcrafter-kkmy records both (slug.txt sha256 4e2e7cde...). A different slug file would be accepted silently. The slug isn't secret and only names the premise in packets and the key, so the effect is cosmetic. Optional: a --slug-sha256 flag, or check the slug against a value given on the command line.
