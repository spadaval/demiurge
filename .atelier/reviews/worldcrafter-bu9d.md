---
schema: atelier.review
schema_version: 1
id: worldcrafter-bu9d
title: finding on worldcrafter-i2uz @0ab62e80
target: worldcrafter-i2uz
identity: procedure-reviewer
commit: 0ab62e802d68ff301ed02a2eab90465791483487
created_at: 2026-11-05T00:40:37.203546522Z
event:
  event: finding
  recommendation: defer
---

low: app/scripts/comparison/transcript.ts withoutFileHeredocs checks a quoted 'cat > f <<'EOF'' body whenever another command precedes cat on its line, so 'cd <own run dir>; cat > part2.md <<'EOF'' with a bare '/' in prose is flagged as outside the run dir. This false positive caused the sonnet Part 2 failure in worldcrafter-49qz, and a judge's prose decides whether it trips (the replacement used the same form and passed). Suggested: allow a leading 'cd <run dir>;' or '&&' before a top-level cat heredoc, with a test built from sonnet/part2-failed-1's command. Defer to the runner follow-up worldcrafter-1wrn; it matters only for future panels.
