---
schema: atelier.item
schema_version: 3
id: worldcrafter-my9t
title: Snapshot retention policy
status: building
mission: worldcrafter-3z9j
labels: []
priority: medium
blocked_by: []
implementers:
- thread:delegated-task:command%3Amcp%3A6d73f777-f6d1-4f6c-b6f0-9f634b2c4463%3Adelegate-task%3A8cbaf9e1-b5f0-41ca-a880-ad8e43deaf11
ready: null
trivial: null
caused_by: null
created_at: 2026-10-18T00:55:31.784180220Z
---

## Goal

Revision snapshots are append-only by decision (kept even after a document is deleted). The save loop adds about one full copy per editing session of a changed document plus at most one per five minutes of saving: roughly 20 copies a day for a writer opening 20 documents, a few hundred MB a year for a heavy writer, never shrinking. A full disk then blocks opening documents, because a failed open-time snapshot blocks the open. Decide a retention policy (e.g. thin old periodic snapshots, keep AI-accept and repair snapshots) and how the writer can see and reclaim space, without making recovery worse.

## Done when

- [ ] A recorded decision on retention, and if it changes behaviour, tests that thinning never removes the newest snapshot, an AI-accept snapshot or a repair snapshot, and that a failed open-time snapshot on a full disk still lets the document open read-only.

## Context

Review of worldcrafter-2hcn (2026-10-17); decision worldcrafter-js76; app/src/workspace/document-session.ts.
