---
created_at: "2026-11-05T01:41:23.331750449+00:00"
id: "worldcrafter-ucvt"
evidence_type: "test"
commit: "f699d1214c1c0f69be54da73c02f5578f2309387"
result: "pass"
captured_at: "2026-11-05T01:40:48.808214409+00:00"
command: "bash -c 'cd app && bun run check'"
exit_status: "0"
target:
  kind: "issue"
  id: "worldcrafter-qgom"
  role: "validates"
relationships:
  blocks: []
  children: []
  attachments:
  - kind: "issue"
    id: "worldcrafter-qgom"
    role: "validates"
  relates: []
schema: "atelier.evidence"
schema_version: 2
status: "recorded"
title: "After fix x7z7 (daf88b9): bun run check passes. CLI test 'an edit prompts only when it changes what text can state, and at most five lines': no-op rename, kind-only, notes, stakes, same want, summary-only and same position print only Saved; a rename prints 5 mentions then '...and 2 more (7 in all): run mentions actor:mara for all.'; a holder change prompts for the old holder. Mutations (always prompt; no truncation) caught."
updated_at: "2026-11-05T01:41:23.333126307+00:00"
---

## Summary

After fix x7z7 (daf88b9): bun run check passes. CLI test 'an edit prompts only when it changes what text can state, and at most five lines': no-op rename, kind-only, notes, stakes, same want, summary-only and same position print only Saved; a rename prints 5 mentions then '...and 2 more (7 in all): run mentions actor:mara for all.'; a holder change prompts for the old holder. Mutations (always prompt; no truncation) caught.

## Command

```console
bash -c 'cd app && bun run check'
```

Exit status: 0

## Stdout

Bytes: 177
SHA-256: 90c52478eea015a5d3242fbebc8dddf44c0095e508e91d1146e0b39cfa4c3b04

## Stderr

Bytes: 156
SHA-256: 0e7eb96a2713a6dcab211b646d4fb25be65747b02a564fd35ea657214362eef6
