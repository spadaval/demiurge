---
created_at: "2026-11-05T00:27:04.787579934+00:00"
id: "worldcrafter-68h3"
evidence_type: "validation"
commit: "26fa50162b978671f8ae0f140a894b6ea4c7cfbc"
result: "pass"
captured_at: "2026-11-05T00:27:04.787503071+00:00"
path: "/home/supadava/projects/demiurge-comparison/judging"
agent_identity: "implementer (judging panel runner, ci4u/na9v fixes)"
target:
  kind: "issue"
  id: "worldcrafter-i2uz"
  role: "validates"
relationships:
  blocks: []
  children: []
  attachments:
  - kind: "issue"
    id: "worldcrafter-i2uz"
    role: "validates"
  relates: []
schema: "atelier.evidence"
schema_version: 2
status: "recorded"
title: "Fixes for review findings worldcrafter-ci4u and worldcrafter-na9v (d735041, 051851c; README 26fa501). ci4u: withoutFileHeredocs now skips a heredoc body only when cat writes it to a file under a quoted delimiter ('EOF', \"EOF\" or \\EOF); unquoted bodies, which bash expands, are checked whole. New tests, failing before the fix: cat > f.md <<EOF with $(cat /etc/shadow), with backticks, and cat <<-EOF >> f.md with $(ls /) are all flagged; an unquoted body with prose slashes is flagged too; quoted bodies with prose slashes ('EOF', \"END\", <<-'EOF', \\EOF) are not. na9v: a test where the judge's own assistant text names a spill path in the persisted-output form; persistedOutputs ignores it and the Read of it is flagged (passes as written: coverage only). bun run check: 861 pass, 0 fail. Recheck at 26fa501 on the real root, Part 1: opus ok (claude-opus-5-5, 14 tool uses, 0 outside, 0 unparsed), fable ok (claude-fable-5-1, 34 Bash, 0 outside, 0 unparsed; its report heredoc is <<'EOF', quoted), sonnet ok (claude-sonnet-5-5, 10 tool uses, 0 outside). Each STATUS names commit 26fa50162b978671f8ae0f140a894b6ea4c7cfbc; STATUS.original is byte-identical before and after for all three (opus and fable 'failed', sonnet 'ok'). Judging content not read; nothing judged."
updated_at: "2026-11-05T00:27:04.788784110+00:00"
---

Fixes for review findings worldcrafter-ci4u and worldcrafter-na9v (d735041, 051851c; README 26fa501). ci4u: withoutFileHeredocs now skips a heredoc body only when cat writes it to a file under a quoted delimiter ('EOF', "EOF" or \EOF); unquoted bodies, which bash expands, are checked whole. New tests, failing before the fix: cat > f.md <<EOF with $(cat /etc/shadow), with backticks, and cat <<-EOF >> f.md with $(ls /) are all flagged; an unquoted body with prose slashes is flagged too; quoted bodies with prose slashes ('EOF', "END", <<-'EOF', \EOF) are not. na9v: a test where the judge's own assistant text names a spill path in the persisted-output form; persistedOutputs ignores it and the Read of it is flagged (passes as written: coverage only). bun run check: 861 pass, 0 fail. Recheck at 26fa501 on the real root, Part 1: opus ok (claude-opus-5-5, 14 tool uses, 0 outside, 0 unparsed), fable ok (claude-fable-5-1, 34 Bash, 0 outside, 0 unparsed; its report heredoc is <<'EOF', quoted), sonnet ok (claude-sonnet-5-5, 10 tool uses, 0 outside). Each STATUS names commit 26fa50162b978671f8ae0f140a894b6ea4c7cfbc; STATUS.original is byte-identical before and after for all three (opus and fable 'failed', sonnet 'ok'). Judging content not read; nothing judged.
