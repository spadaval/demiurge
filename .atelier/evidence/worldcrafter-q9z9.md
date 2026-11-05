---
created_at: "2026-11-05T02:12:17.183902376+00:00"
id: "worldcrafter-q9z9"
evidence_type: "validation"
commit: "bdcf05bf5b23bd206e85dca73fa092b13059cae1"
result: "pass"
captured_at: "2026-11-05T02:12:17.113788243+00:00"
command: "bash -c 'cd /home/supadava/projects/demiurge-comparison/smoke/fax9-skill && jq \"{durationSeconds, exitCode, checks, causes, mentionsCalls, outside: .transcript.outside, models: .transcript.models}\" check.json && test -f files/model-gaps.md && jq -e \"[.checks[]] | all\" check.json'"
exit_status: "0"
path: "/home/supadava/projects/demiurge-comparison/smoke/fax9-skill/check.json"
target:
  kind: "issue"
  id: "worldcrafter-fax9"
  role: "validates"
relationships:
  blocks: []
  children: []
  attachments:
  - kind: "issue"
    id: "worldcrafter-fax9"
    role: "validates"
  relates: []
schema: "atelier.evidence"
schema_version: 2
status: "recorded"
title: "bash -c 'cd /home/supadava/projects/demiurge-comparison/smoke/fax9-skill && jq \"{durationSeconds, exitCode, checks, causes, mentionsCalls, outside: .transcript.outside, models: .transcript.models}\" check.json && test -f files/model-gaps.md && jq -e \"[.checks[]] | all\" check.json'"
updated_at: "2026-11-05T02:12:17.184464603+00:00"
---

## Summary

bash -c 'cd /home/supadava/projects/demiurge-comparison/smoke/fax9-skill && jq "{durationSeconds, exitCode, checks, causes, mentionsCalls, outside: .transcript.outside, models: .transcript.models}" check.json && test -f files/model-gaps.md && jq -e "[.checks[]] | all" check.json'

## Command

```console
bash -c 'cd /home/supadava/projects/demiurge-comparison/smoke/fax9-skill && jq "{durationSeconds, exitCode, checks, causes, mentionsCalls, outside: .transcript.outside, models: .transcript.models}" check.json && test -f files/model-gaps.md && jq -e "[.checks[]] | all" check.json'
```

Exit status: 0

## Stdout

Bytes: 450
SHA-256: 3e40c974355e464fc8c0e66e17abbc7fbdfca59630f5aac0585c8a2a31602e51

## Stderr

Bytes: 0
SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
