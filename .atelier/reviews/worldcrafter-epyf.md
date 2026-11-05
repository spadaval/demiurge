---
schema: atelier.review
schema_version: 1
id: worldcrafter-epyf
title: finding on worldcrafter-03rp @e9db738c
target: worldcrafter-03rp
identity: planning-reviewer
commit: e9db738ce72f889cc01ae6da80c82063ff299986
created_at: 2026-11-05T05:41:40.636767625Z
event:
  event: finding
  recommendation: fix_now
---

R2 medium: worldcrafter-efis is in todo as a single feature with no children or blocked_by links, though it is a whole increment: rubric plus review, a premise decision, a harness change plus review, a trial run, three long runs, a three-judge panel plus procedure check, a ranked list and a closing decision record (efis:31-45). references/tracker-records.md (Increment) requires immediate children and dependencies as native links before an increment goes to todo. The order gates the item states in prose (rubric reviewed before judges read; harness reviewed before runs; premise decided before runs) are exactly what blocked_by links should enforce, and each child needs its own review record. Fix: add the children (rubric, premise decision, harness change, runs, panel/verdict) with blocked_by links, or narrow efis to its first evidence boundary.
