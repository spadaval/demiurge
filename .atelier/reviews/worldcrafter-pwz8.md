---
schema: atelier.review
schema_version: 1
id: worldcrafter-pwz8
title: finding on worldcrafter-ql1d @a77639c1
target: worldcrafter-ql1d
identity: rubric-reviewer
commit: a77639c1685a42e56e67438a90a279635051a8df
created_at: 2026-11-05T07:39:09.583359678Z
event:
  event: finding
  recommendation: defer
---

low: app/scripts/judging/scenes.ts:617 The credentials' sha256 is recorded before and after each session but never compared, so a change shows only to someone reading run.json. ro-bind already prevents writes from inside, but a hash change during a run, written into STATUS as a note (not a failure, since a host-side refresh may cause it), would surface the hard constraint's evidence where the round log reads it. Fix: add a non-failing 'credentials changed during the session' note to STATUS and the tables.
