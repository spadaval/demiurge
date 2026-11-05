---
schema: atelier.review
schema_version: 1
id: worldcrafter-h6sd
title: finding on worldcrafter-hdly @070f68ec
target: worldcrafter-hdly
identity: round1-fix-reviewer
commit: 070f68ec952ed78ac1c5266349183c3b1fd310aa
created_at: 2026-11-05T17:50:40.106738351Z
event:
  event: finding
  recommendation: fix_now
---

medium: app/scripts/comparison/transcript.ts quoteContext/bareSlashIsProse (070f68e). A bare '/' now passes as prose in places where it is run as code, so whole-filesystem reads go unrecorded. checkTranscript on single Bash calls (allowed /story), outside[] at 070f68e^ vs 070f68e: 'cat <<EOF | sh\nfind / -name '*.json' -exec cat {} +\nEOF' flagged -> clean (the body is marked text because the heredoc feeds cat, though cat's output is piped to sh); 'cat <<EOF | xargs ls\n/\nEOF' flagged -> clean; 'echo "find / -name x -exec cat {} +" | sh' flagged -> clean (a quoted word with more than slashes, and the word before it is echo); 'bash -c -- "ls /"' flagged -> clean (the word before is '--', not -c). find / with -exec cat names no other path, so nothing else in the check catches these. Still flagged: 'ls /', 'sh -c "ls /"', 'find "/" ...', ls $'/', bash <<< "ls /". Since the check exists to record any attempt to read outside the run and only bare slashes are affected, the fix can stay narrow: (1) mark a cat heredoc's body as text only when cat's stdout goes to a file or the terminal, not when anything after the <<WORD on that line pipes it on (a '|' before the line ends); (2) apply the quoted-word rule only when the command line has no pipe or here-string into a shell, interpreter, xargs, eval or source, and treat a word after '-c --' or '-c' with options between as code. Both Round 5 flags still clear under that (a model-gaps heredoc written to a file, and "bound to / owned by" quoted to the story CLI). Add the four cases above as tests that expect the flag. The three flipped tests are fine as they stand (each keeps a real-path case beside it), but they only cover prose that isn't run. bun run check at 070f68e: 1154 pass, 0 fail, exit 0.
