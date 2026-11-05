---
schema: atelier.review
schema_version: 1
id: worldcrafter-49qz
title: finding on worldcrafter-i2uz @0ab62e80
target: worldcrafter-i2uz
identity: procedure-reviewer
commit: 0ab62e802d68ff301ed02a2eab90465791483487
created_at: 2026-11-05T00:40:29.126646219Z
event:
  event: finding
  recommendation: fix_now
---

high: Sonnet's Part 2 replacement (judging/sonnet/part2-failed-1 -> part2) applied the replace/recheck choice inconsistently, and the choice decided the verdict. part2-failed-1's only transcript flag is a bare '/' in the quoted report heredoc ('this happened because of / right after that', part2.md:45), flagged only because 'cd /tmp/judge.6ub61Q;' preceded 'cat > part2.md <<'EOF'' on the same line; every command stayed in its own run dir, inputs and my-part1.md unchanged. That is the same class as fable's Part 1 flag, which decision note 2026-11-04 kept after a reviewed recheck because it 'didn't reach beyond its material'. The replacement wrote its report with the identical 'cd <rundir>; cat > part2.md <<'EOF'' form and passed only because its prose had no bare '/'. The failed run's last line is 'VERDICT: change'; kept, the panel would be opus change, sonnet change, fable drop = change, not drop. No decision to replace was recorded or reviewed before the replacement started (no commit between fd293a4 19:29:20 and e928fd7 19:37:05; replacement startedAt 00:35:57Z), and the diagnosis quoted in evidence worldcrafter-t2uj needed the flagged heredoc, which ends with the failed run's call, so the choice may have been made with the outcome known. The literal Done when ('a judge that failed ... is replaced') permits the replacement, so this is not a plain breach, but it is a discretionary choice made by the panel's operator after the fact that flips the result. Fix before the next increment: an agent independent of the panel's operator decides, with a rule that applies equally to all four flagged runs (opus p1, fable p1, sonnet p2-failed-1), which sonnet Part 2 counts, and the verdict note is updated to match; Sumeet should be told either way since he reviews afterwards.
