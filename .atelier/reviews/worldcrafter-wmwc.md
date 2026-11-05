---
schema: atelier.review
schema_version: 1
id: worldcrafter-wmwc
title: approval on worldcrafter-ql1d @3597c62e
target: worldcrafter-ql1d
identity: rubric-reviewer
commit: 3597c62e68ccfc4e2a67159e3cb7d8a173e97256
created_at: 2026-11-05T08:28:43.688945139Z
event:
  event: approval
---

Approves blvm's rubric, w716's scene panel and x2ij's round runner at 3597c62 (approvals arpa and uhw4 cover the first two; nothing in 108f50b..3597c62 changes their behaviour beyond the symlink checks below). f9l3 fixed in cf0a6ea: snapshot's git log now runs in bwrap (--unshare-all with no network, repo read-only at its real path, /usr and /etc read-only, empty tmpfs /tmp and /home, cleared env, GIT_CONFIG_GLOBAL=/dev/null, 120 s timeout), and the bwrap arguments are fixed, not built from repo content. Probed adversarially with sandboxedGitLog on crafted repos: gpg.program + log.showSignature + a gpgsig commit, core.fsmonitor, a diff.x textconv via .gitattributes, core.pager, diff.external and include.path to ~/.gitconfig all either didn't run or ran only inside the sandbox. There it couldn't see ~/.claude/.credentials.json, had no network routes, and couldn't write a marker to a host path. A .git file with gitdir pointing at a host repo, a .git symlink to one, and a symlinked repo path all fail or resolve harmlessly. Audit fixes checked: readRepoFile reads story.json and scene prose only as plain files at their real path; snapshots copy symlinks verbatim; panel.ts and scenes.ts count an input replaced by a symlink as changed, and panel refuses a symlinked report. ts64 fixed: VOCAB_KINDS comes from KIND_NAMES and LIST_KINDS (actor candidate constraint drive event fact knowledge open-question reader-question scene version), with a test over REF_KINDS. zm9p no_action accepted. bun run check: 1072/1072 pass. Remaining: rkqy (defer, low; its record cites line 103, but the code is in sandboxedGitLog at line 818), an uncapped output buffer, which is resource exhaustion only.
