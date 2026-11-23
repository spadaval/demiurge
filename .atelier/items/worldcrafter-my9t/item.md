---
schema: atelier.item
schema_version: 3
id: worldcrafter-my9t
title: Snapshot retention policy
status: approved
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

- [x] A recorded decision on retention, and if it changes behaviour, tests that thinning never removes the newest snapshot, an AI-accept snapshot or a repair snapshot, and that a failed open-time snapshot on a full disk still lets the document open read-only.

## Context

Review of worldcrafter-2hcn (2026-10-17); decision worldcrafter-js76; app/src/workspace/document-session.ts.

## Report

**The recommended policy deletes snapshots, so it is a proposal waiting for Sumeet, not a decision, and nothing deletes anything.** The rule is written and tested but not wired up; enabling it is worldcrafter-ey04, labelled `needs-human`, which lists the three questions for him (the 14-day and 90-day windows, automatic or button-only, and whether deleted documents' histories are thinned).

What changed for the writer: a full disk no longer locks them out of a document. If the snapshot on open can't be written, or the snapshots can't be listed to decide, the document opens read-only (`ReadOnlyReason` `no_snapshot`) instead of failing. The page shows an alert under the title ("This document is read-only: Demiurge couldn't save a copy of it before editing. <storage error> Free up disk space, then close and reopen it."), the margin says "Read-only", and generation and rename refuse with that reason rather than "open in another tab". Nothing saves, repairs or renames it; reopening retries. A failure loading the document itself still fails the open.

- Decision record: "Snapshot retention" in `docs/rebuild/data-model-boundaries.md`: the read-only fallback (built) and the thinning proposal (always keep every non-`periodic` snapshot, so AI-accept, repair and any later reason such as sync's pre-overwrite snapshots; the newest of each document; everything under 14 days; then the newest periodic per day to 90 days and per week after). It says sync's pre-overwrite snapshots (worldcrafter-ji5d) need a reason of their own to stay protected.
- Code: `SaveStatus` `read_only` carries a `reason`; `DocumentSession.readOnlyReason`; `CommandError` `document_read_only`; generate's `read_only` error carries the reason (`app/src/workspace/document-session.ts`, `workspace.ts`, `app/src/generate/generator.ts`, `describe.ts`, `app/src/app/environment.ts`, `pages.tsx`, `shell.tsx`). `planSnapshotThinning` in `app/src/storage/retention.ts` only returns keep/remove IDs.
- Tests: `document-session.test.ts` (full disk opens read-only with its reason and writes nothing; content needing repair stays as stored, and is snapshotted and repaired once there is room; unlistable snapshots also open read-only; a missing document still fails), `workspace.test.ts` (rename refused with `document_read_only`), `environment.test.ts` (messages), `retention.test.ts` (never removes the newest, AI-accept or repair snapshots; keeps the last 14 days; daily then weekly thinning of a year; idempotent; future-dated kept).
- Checks: `tsc --noEmit` and `biome check` pass (its 3 warnings are in `scripts/story.ts`, untouched). `bun test`: 1159 pass, 1 fail: the story CLI `--help` test times out at 5 s. It fails the same way on master at load average 26-30 and touches nothing here; filed as worldcrafter-q6z5.
- Not built: the storage panel showing space used. It needs snapshot sizes in metadata and its main action is the destructive button, so it went into worldcrafter-ey04 rather than half of it here.
