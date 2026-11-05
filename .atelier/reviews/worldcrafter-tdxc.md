---
schema: atelier.review
schema_version: 1
id: worldcrafter-tdxc
title: finding on worldcrafter-iu6l @db7ef9a0
target: worldcrafter-iu6l
identity: code-reviewer
commit: db7ef9a07d087fad948d5a6bc0c7cbe125933009
created_at: 2026-11-05T05:14:10.056353679Z
event:
  event: finding
  recommendation: fix_now
---

medium: app/scripts/comparison/transcript.ts:363 withoutInlineScripts blanks the whole inline sed or perl script before shellPaths, but those scripts can themselves read, write or run things by path. On master each of these is flagged; at db7ef9a, through judgeTranscript, none is: sed '1r /etc/shadow' part1.md, sed 1r/etc/shadow part1.md, sed -e '1r /etc/shadow', sed --expression='1r /etc/shadow', sed 's/a/b/w /etc/x' part1.md, sed -n 'w /tmp/out', sed '1e cat /etc/shadow' part1.md, perl -e 'open F, "/etc/shadow"; print <F>', perl -e 'system("cat /etc/shadow")'. Perl one-liners opening a file by path are ordinary, so this hides real reads, not just contrived ones, and the check gates the remaining Part 2 runs and any recheck. Suggested: don't blank perl scripts at all; for sed, blank only the regex and replacement text of s and y commands and of /re/ addresses (or blank the whole script only when it has no r, R, w, W or e command and no w or e flag on s), leaving every other word of the script scanned. Add the probes above as tests. Sonnet's command ('s/ ... absent,//') would still pass under that rule.
