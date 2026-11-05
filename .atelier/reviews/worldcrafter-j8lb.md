---
schema: atelier.review
schema_version: 1
id: worldcrafter-j8lb
title: finding on worldcrafter-7coc @2c16c377
target: worldcrafter-7coc
identity: round0-reviewer
commit: 2c16c3775186a50ab5e8ae46fd219395561ed448
created_at: 2026-11-05T06:50:46.714641573Z
event:
  event: finding
  recommendation: defer
---

low: .atelier/issues/worldcrafter-7coc.md Done when: the restructure drops a requirement. The old 7coc Done when 'the skill ... describes the tool as it now is' was checked after all six fixes; it now sits only on 7coc, closed after fix 1. r26d, 6m2v, j6z1 and s2mz each add CLI commands or states, but none of their Done whens asks for the skill to describe them (only wefn mentions the skill). The Round 1 writer learns the tool from the skill, so add 'the skill describes the new commands' to those four Done whens, or a skill-is-current check to xzee, before they start.
