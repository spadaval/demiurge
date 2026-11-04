---
schema: atelier.review
schema_version: 1
id: worldcrafter-ghcr
title: finding on worldcrafter-o8b7 @8ee08cdd
target: worldcrafter-o8b7
identity: code-reviewer
commit: 8ee08cddeab6d68787594388e15093aa0054ce81
created_at: 2026-11-04T21:54:15.971945732Z
event:
  event: finding
  recommendation: fix_now
---

medium: app/scripts/comparison/comparison.ts:251-268 isolation is by instruction only: with --permission-mode bypassPermissions any session's Read or Bash can open any path, so the notes arm does have access to the frozen directory (04z5 Done when: 'notes runs have no access to the frozen directory'), and both arms can read this repo, ~/.claude and key/raw of earlier runs. Detection (finding above) only reports after the fact, and a contaminated run can't be rerun. Fix: enforce it, e.g. run each step under bwrap (installed at /usr/bin/bwrap) with a tmpfs over /home/supadava/projects and /tmp, binding the run dir rw, the frozen dir ro for tool runs only, and what claude needs for OAuth; or at least permissions.deny rules via --settings for the file tools (verify they hold under bypassPermissions). If the human accepts detection only, reword the Done when instead.
