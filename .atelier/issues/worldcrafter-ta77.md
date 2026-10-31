---
created_at: "2026-10-31T08:00:55.508770965+00:00"
id: "worldcrafter-ta77"
issue_type: "bug"
labels: []
workflow_branch:
  branch_base: master
  work_branch: bug/worldcrafter-ta77
priority: "P1"
relationships:
  blocks: []
  children: []
  attachments: []
  relates: []
schema: "atelier.issue"
schema_version: 2
closed_at: "2026-10-31T08:01:03.414664089+00:00"
status: "done"
title: "Bump @tanstack/react-start past the blocked 1.163.2 (CVE-2026-102989)"
updated_at: "2026-10-31T08:01:03.414664089+00:00"
---

## Goal

Vercel refuses production deploys while @tanstack/react-start 1.163.2 is installed. Get deploys working again on a fixed version.

## Done when

- react-start is 1.168.60 or later, with its companion packages compatible.
- A production deploy on Vercel succeeds.
- Independently reviewed.

## Close Reason

Fixed versions shipped; a Vercel production deploy succeeded
