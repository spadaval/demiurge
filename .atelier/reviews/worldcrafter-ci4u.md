---
schema: atelier.review
schema_version: 1
id: worldcrafter-ci4u
title: finding on worldcrafter-i2uz @c5fea91e
target: worldcrafter-i2uz
identity: code-reviewer
commit: c5fea91ec84335b6db2b6460d10b2c154c24abd3
created_at: 2026-11-05T00:25:02.500624617Z
event:
  event: finding
  recommendation: fix_now
---

medium: app/scripts/comparison/transcript.ts:211-222 withoutFileHeredocs drops the body of unquoted heredocs too (cat > f <<EOF), but bash expands an unquoted body, so $(...) and backticks in it run. Probe through judgeTranscript: 'cat > part1.md <<EOF\n$(cat /etc/shadow)\nEOF' and the same with `cat /home/writer/.claude/.credentials.json` now give no finding, where before c8c9d35 they were flagged. This opens a hole in the transcript check that the remaining Part 2 runs (and any replacement) rely on. Fix: strip the body only when the delimiter is quoted (<<'EOF' or <<"EOF"), or keep any body holding $( , a backtick or $; add tests for both. It doesn't affect the Part 1 runs already done: fable's only heredoc is quoted ('EOF'), its body has no $( and its only slash-led token is a bare '/'. After the fix, rerun recheck so the STATUS files name the fixed commit.
