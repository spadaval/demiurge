---
schema: atelier.review
schema_version: 1
id: worldcrafter-s26s
title: finding on worldcrafter-o8b7 @287d51e5
target: worldcrafter-o8b7
identity: code-reviewer
commit: 287d51e5051ef14e74b916c3198e6cce16bb9b9b
created_at: 2026-11-04T21:20:11.354522205Z
event:
  event: finding
  recommendation: fix_now
---

medium: app/src/story/render.ts:269-290 render lists every open question under "## Not decided yet", including answered ones (marked only by "(chosen)" after the answer) and all their rejected candidates. Probe: answer-open-question why guild, then render shows the settled question and its rejected candidate under "Not decided yet". The human reads render output in the 04z5 packets and is asked (i2uz) whether open questions got satisfying answers; settled decisions read as undecided, and rejected candidates count toward the ~1,500-word step-1 budget. Fix before freezing: put answered questions in their own section (question then chosen answer, rejected candidates omitted or briefly), keep "Not decided yet" for unanswered ones; add a render test.
