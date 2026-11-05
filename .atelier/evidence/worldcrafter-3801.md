---
created_at: "2026-11-05T05:12:35.315427507+00:00"
id: "worldcrafter-3801"
evidence_type: "test"
commit: "e244cd8e1edc13076e3e78b77ed3224465b0b213"
result: "pass"
captured_at: "2026-11-05T05:11:35.356487243+00:00"
command: "bun run check"
exit_status: "0"
agent_identity: "implementer (transcript check, sed false positive)"
target:
  kind: "issue"
  id: "worldcrafter-iu6l"
  role: "validates"
relationships:
  blocks: []
  children: []
  attachments:
  - kind: "issue"
    id: "worldcrafter-iu6l"
    role: "validates"
  relates: []
schema: "atelier.evidence"
schema_version: 2
status: "recorded"
title: "Rerun of bun run check at 8df6828 after worldcrafter-cakq failed only on the generate timing test (worldcrafter-08kf: 'streaming 50 KB ... stays fast' took 21s at load average 17; 977 of 978 passed). Covers 8df6828: shellPaths blanks inline sed/perl scripts, so sonnet's flagged command sed -i 's/ the Jovian-like mechanism is absent,//' part1.md gives no finding, while path arguments after the script (sed -i 's/a/b/' /etc/passwd, sed -n '/x/p' ../other, sed -f /etc/script.sed, perl -pe ... /etc/passwd) and a bare // elsewhere are still flagged. Read-only regression over the 13 saved judge transcripts of the first panel and smoke roots: 0 findings."
updated_at: "2026-11-05T05:12:35.315944339+00:00"
---

## Summary

Rerun of bun run check at 8df6828 after worldcrafter-cakq failed only on the generate timing test (worldcrafter-08kf: 'streaming 50 KB ... stays fast' took 21s at load average 17; 977 of 978 passed). Covers 8df6828: shellPaths blanks inline sed/perl scripts, so sonnet's flagged command sed -i 's/ the Jovian-like mechanism is absent,//' part1.md gives no finding, while path arguments after the script (sed -i 's/a/b/' /etc/passwd, sed -n '/x/p' ../other, sed -f /etc/script.sed, perl -pe ... /etc/passwd) and a bare // elsewhere are still flagged. Read-only regression over the 13 saved judge transcripts of the first panel and smoke roots: 0 findings.

## Command

```console
bun run check
```

Exit status: 0

## Stdout

Bytes: 177
SHA-256: 519b83d955ec0cb7464a91ca03ab108b92dd4c8f0e6b499d250125fed71c7608

## Stderr

Bytes: 156
SHA-256: d430442b1239c8f0475bc272785becdbd5404b11dc34598d144a31df28ff50a3
