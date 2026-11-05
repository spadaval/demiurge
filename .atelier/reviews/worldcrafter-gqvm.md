---
schema: atelier.review
schema_version: 1
id: worldcrafter-gqvm
title: finding on worldcrafter-03rp @e9db738c
target: worldcrafter-03rp
identity: planning-reviewer
commit: e9db738ce72f889cc01ae6da80c82063ff299986
created_at: 2026-11-05T05:41:40.586006090Z
event:
  event: finding
  recommendation: fix_now
---

R1 medium: the first increment may not test the failure it exists to find. 03rp:81,93-94, p3k7:24 and notes-first.md:27 define the target as a story 'longer than one session can hold' across 'fresh sessions that can't hold the whole of it', and 03rp:94 says efis 'tests exactly the larger scale where that payoff would appear'. But efis:49 guesses 20,000-30,000 words, roughly 30-40k tokens, which any current session can read whole alongside its notes, and efis:50 leans toward letting sessions read the whole draft. Together the runs would measure an agent that can re-read everything, so notes would never carry the story and a 'notes are enough' result would be built in, after three costly multi-session runs. Fix before efis starts: define 'can't hold' operationally in the strategy Outcome and efis (e.g. a per-session read budget smaller than the draft, with the reason it is realistic, or a length that actually exceeds what sessions read), or restate the outcome honestly as 'across many fresh sessions' and change 03rp:94 to match; make the length guess consistent with the definition.
