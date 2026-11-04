---
created_at: "2026-11-02T03:56:08.532951150+00:00"
id: "worldcrafter-la1m"
issue_type: "task"
labels: []
workflow_branch:
  branch_base: master
  work_branch: task/worldcrafter-la1m
priority: "P2"
relationships:
  blocks: []
  children: []
  attachments: []
  relates:
  - kind: "issue"
    id: "worldcrafter-cogw"
    type: "implements"
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-11-02T03:57:56.880891672+00:00"
status: "done"
title: "Rename the product to Demiurge"
updated_at: "2026-11-02T03:57:56.880891672+00:00"
---

## Goal

Current-facing names say Demiurge instead of WorldCrafter (decision worldcrafter-cogw), and the docs frame the product by that name, without changing its product positions or voice.

## Done when

- README, PRODUCT.md, DESIGN.md, AGENTS.md, AI.md, current docs, package names, app titles and user-visible strings use Demiurge, and the README intro says what the name means, including its dark side.
- Existing data still opens: IndexedDB names, localStorage keys and the writer lock keep their names, with a comment saying why.
- Atelier IDs, the `worldcrafter-` prefix and past records are unchanged, and `atelier check` passes.
- `bun run check` passes in `app/`.
- Independently reviewed.

## Scope

Not in scope: the Cloudflare Worker's name, the domain, and moving the checkout directory.

## Close Reason

Current-facing names say Demiurge; data-bearing storage names, the Worker and Atelier IDs keep worldcrafter on purpose
