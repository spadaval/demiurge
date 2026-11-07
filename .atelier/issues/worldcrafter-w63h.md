---
created_at: "2026-11-07T14:40:15.520112573+00:00"
id: "worldcrafter-w63h"
issue_type: "task"
labels: []
workflow_branch:
  branch_base: master
  work_branch: atelier-lifecycle
priority: "P2"
relationships:
  blocks: []
  children: []
  attachments: []
  relates: []
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-07T15:10:58.864490741+00:00"
status: "done"
title: "Move demiurge onto Atelier's new lifecycle"
updated_at: "2026-11-07T15:10:58.864490741+00:00"
---

## Goal

Move this repository onto Atelier's new lifecycle (atelier-mmpv in spadaval/atelier): the starter's policy shape, statuses the new policy lacks moved first, AGENTS.md in Atelier's words. The one installed Atelier binary serves every repository on this host, and demiurge still runs the old starter (fast_forward_only, blocked and review statuses, a close step for work).

## Done when

- [x] `.atelier/workflow.yaml` has the starter's shape, as Atelier's own policy has it on atelier-nn67, with `merge_strategy: merge_commit`: no `blocked` or `review` status, no `close` transition for work, and `loose_end` and `validation` on the `on_base` workflow, which keeps `backlog` with `plan` and `defer`. `base_branch: master` and the issue types stay.
- [x] No record sat in a status the new policy lacks (`blocked` or `review`), so none moves, and `atelier check` finds every record valid under the new policy.
- [x] AGENTS.md describes the lifecycle in the same words as Atelier's AGENTS.md and keeps the repository's own notes (`atelier work ready`, the app and mission notes, naming).
- [x] `atelier check` and `atelier doctor` pass on the branch.

## Scope

The policy and AGENTS.md. Not `atelier migrate dispositions`.

## Context

atelier-nn67 in spadaval/atelier (the rollout), ADR 0028 there, and its starter policy.

## Report

demiurge's policy has the starter's shape with `merge_commit`, its `on_base` workflow keeping `backlog`, and AGENTS.md describes the new lifecycle in Atelier's words; no record needed moving, and `atelier check` and `atelier doctor` pass on the branch.

- Policy: `diff` of `.atelier/workflow.yaml` against a fresh `atelier init` policy with `base_branch: master` and `merge_strategy: merge_commit` shows only `on_base`'s `plan`, `defer` and `supersede` from `backlog`, identical to the `on_base` section of Atelier's policy in the atelier-nn67 worktree.
- Statuses: no record, on `master` or here, is in `blocked` or `review`, and its four validations are all `done` or `superseded`; `atelier check` passes under the new policy.
- AGENTS.md: read against Atelier's AGENTS.md (spadaval/atelier master).
- `atelier check` passes, noting the older disposition form; `atelier doctor` passes.

### Deviations

- The branch began on the light path, but `atelier land` refuses an unowned branch that changes `.atelier/workflow.yaml` (`land_work_untraceable`), so `doctor` failed. This issue owns the branch instead; the fix is being made in Atelier on atelier-nn67.

### Decisions

- With no merge policy section here, the "One issue" bullet ends at `atelier merge <id>`, and the base-branch rule ("Unreviewed non-trivial code never reaches `master`…") replaces the old line about what may be committed to `master`.
- `on_base` keeps `backlog` with `plan` and `defer`, the coordinator's design change, matching Atelier's starter on atelier-nn67. It changes the policy after approval worldcrafter-xgwl, so that approval is stale.
