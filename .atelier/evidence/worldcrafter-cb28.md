---
created_at: "2026-11-05T02:12:16.866873224+00:00"
id: "worldcrafter-cb28"
evidence_type: "validation"
commit: "bdcf05bf5b23bd206e85dca73fa092b13059cae1"
result: "pass"
captured_at: "2026-11-05T02:12:16.779233228+00:00"
command: "bash -c 'a=$(sha256sum .agents/skills/story-sketch/craft.md | cut -d\" \" -f1); b=$(jq -r \".sha256[\\\"story-sketch/craft.md\\\"]\" /home/supadava/projects/demiurge-comparison/frozen/FROZEN.json); echo \"working tree: $a\"; echo \"FROZEN.json:  $b\"; git diff --quiet 0f4d991~20 -- .agents/skills/story-sketch/craft.md 2>/dev/null; test \"$a\" = \"$b\"'"
exit_status: "0"
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
title: "bash -c 'a=$(sha256sum .agents/skills/story-sketch/craft.md | cut -d\" \" -f1); b=$(jq -r \".sha256[\\\"story-sketch/craft.md\\\"]\" /home/supadava/projects/demiurge-comparison/frozen/FROZEN.json); echo \"working tree: $a\"; echo \"FROZEN.json:  $b\"; git diff --quiet 0f4d991~20 -- .agents/skills/story-sketch/craft.md 2>/dev/null; test \"$a\" = \"$b\"'"
updated_at: "2026-11-05T02:12:16.867440680+00:00"
---

## Summary

bash -c 'a=$(sha256sum .agents/skills/story-sketch/craft.md | cut -d" " -f1); b=$(jq -r ".sha256[\"story-sketch/craft.md\"]" /home/supadava/projects/demiurge-comparison/frozen/FROZEN.json); echo "working tree: $a"; echo "FROZEN.json:  $b"; git diff --quiet 0f4d991~20 -- .agents/skills/story-sketch/craft.md 2>/dev/null; test "$a" = "$b"'

## Command

```console
bash -c 'a=$(sha256sum .agents/skills/story-sketch/craft.md | cut -d" " -f1); b=$(jq -r ".sha256[\"story-sketch/craft.md\"]" /home/supadava/projects/demiurge-comparison/frozen/FROZEN.json); echo "working tree: $a"; echo "FROZEN.json:  $b"; git diff --quiet 0f4d991~20 -- .agents/skills/story-sketch/craft.md 2>/dev/null; test "$a" = "$b"'
```

Exit status: 0

## Stdout

Bytes: 158
SHA-256: 7707f66351699c92ea6aa43c248c626fdb4ab31966c93555578bb2fdc2b7c34b

## Stderr

Bytes: 0
SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
