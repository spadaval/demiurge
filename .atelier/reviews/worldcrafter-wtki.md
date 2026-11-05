---
schema: atelier.review
schema_version: 1
id: worldcrafter-wtki
title: finding on worldcrafter-ql1d @936e93ec
target: worldcrafter-ql1d
identity: rubric-reviewer
commit: 936e93ec82fa0ae4c689c646938215f7333b0767
created_at: 2026-11-05T07:03:15.738162418Z
event:
  event: finding
  recommendation: fix_now
---

low: docs/verdicts/world-demo-rubric.md:122 Verbatim quotes go inside JSON strings, and scene lines are mostly dialogue with double quotes; the instructions never say to escape them, so an unescaped quote breaks JSON.parse and, per Part 2, fails the run (and smart vs straight quotes confuse the 'quote not in the scene' check). Fix: add 'escape any double quote inside a string as \" ' to the report instructions; in w716, compare quotes to the scene after unescaping and normalizing quote marks and whitespace.
