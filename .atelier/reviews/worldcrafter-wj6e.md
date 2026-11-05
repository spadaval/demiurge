---
schema: atelier.review
schema_version: 1
id: worldcrafter-wj6e
title: finding on worldcrafter-gwx3 @c9b93a51
target: worldcrafter-gwx3
identity: planning-reviewer-gwx3
commit: c9b93a51657508a7eef8f1f5d3013fd68697c036
created_at: 2026-11-05T06:30:50.844536751Z
event:
  event: finding
  recommendation: fix_now
---

low: worldcrafter-w716 has no blocked_by on worldcrafter-blvm, yet it must feed judges 'the judge-facing rubric' and tabulate scores from the rubric's 'fixed machine-readable block' that blvm defines. Built in parallel, the runner will invent a format blvm then has to match, or be reworked; its smoke would also run judges on an unreviewed rubric. Fix: add w716 blocked_by blvm (or state in w716 that it parses blvm's block format and smokes only after blvm is reviewed).
