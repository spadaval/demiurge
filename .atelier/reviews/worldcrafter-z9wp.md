---
schema: atelier.review
schema_version: 1
id: worldcrafter-z9wp
title: finding on worldcrafter-03rp @e9db738c
target: worldcrafter-03rp
identity: planning-reviewer
commit: e9db738ce72f889cc01ae6da80c82063ff299986
created_at: 2026-11-05T05:41:40.951529845Z
event:
  event: finding
  recommendation: defer
---

R8 low: efis:42 has each judge read all three finished runs with their notes, which at the guessed length is 60-90k words of story plus notes per judge session, larger than anything the panel runner has handled (comparison packets were ~5-8k words each). Long-context reading degrades and a judge run can fail on size. Fix in the harness/rubric child: size-check the judge input after the trial run, and allow one isolated session per run with a final ranking session if it doesn't fit comfortably.
