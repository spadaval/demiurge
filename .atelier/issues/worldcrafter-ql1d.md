---
created_at: "2026-11-05T06:28:35.404385689+00:00"
id: "worldcrafter-ql1d"
issue_type: "feature"
labels: []
workflow_branch:
  branch_base: master
  work_branch: feature/worldcrafter-ql1d
priority: "P1"
relationships:
  blocks: []
  children:
  - kind: "issue"
    id: "worldcrafter-blvm"
  - kind: "issue"
    id: "worldcrafter-w716"
  - kind: "issue"
    id: "worldcrafter-x2ij"
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-gwx3"
    type: "advances"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-05T08:32:42.845556014+00:00"
status: "done"
title: "Set up the exercise: rubric, writer runner, panel"
updated_at: "2026-11-05T08:32:42.845556014+00:00"
---

## Goal

Everything a round needs, built and reviewed before Round 1: the rubric, a runner for the writer and the story-so-far agent, and a four-judge panel runner (decision worldcrafter-jeue, docs/strategies/world-demo.md).

## Done when

- The three children are closed, each independently reviewed and merged locally.

## Close Reason

Rubric (blvm, docs/verdicts/world-demo-rubric.md), four-judge scene panel with sandboxed headless Grok (w716, app/scripts/judging/scenes.ts, grok.ts) and the round runner (x2ij, app/scripts/round/) are built, smoke-tested and independently reviewed (rubric-reviewer, approval midy). Security findings f9l3 (host git in writer repo) and rkqy (unbounded output) fixed; ptrace-based bypass of the output cap noted as theoretical, bounded by the 120 s timeout.
