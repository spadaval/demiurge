---
schema: atelier.review
schema_version: 1
id: worldcrafter-y8q4
title: finding on worldcrafter-o8b7 @33cea9b2
target: worldcrafter-o8b7
identity: code-reviewer
commit: 33cea9b283a42c6f2a2936e52a59fa60d341a5d1
created_at: 2026-11-04T22:20:16.407087068Z
event:
  event: finding
  recommendation: no_action
---

low: app/scripts/comparison/sandbox.ts:95-98 the host's live ~/.claude/.credentials.json, which the host's other claude sessions (the T3 server) depend on, is bind-mounted read-write into every session, so any session can overwrite or truncate it, and the transcript check counts that as inside the home and doesn't report it. The bind also may not do what its comment says: if claude saves credentials by write-then-rename, renaming onto a bind-mounted file fails with EBUSY. I didn't verify either way. ensureToken (comparison.ts:293) makes an in-sandbox refresh unlikely, which limits both effects. Consider an ro-bind (a refresh then fails loudly inside the sandbox, without touching the host file) and reporting any Bash command that names .credentials.json.
