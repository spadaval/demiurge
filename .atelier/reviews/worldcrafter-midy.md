---
schema: atelier.review
schema_version: 1
id: worldcrafter-midy
title: approval on worldcrafter-ql1d @62250535
target: worldcrafter-ql1d
identity: rubric-reviewer
commit: 6225053562fa2772cfa0fb1d1b1e522c09123c91
created_at: 2026-11-05T08:32:16.950366738Z
event:
  event: approval
---

Approves blvm, w716 and x2ij at 6225053, adding to worldcrafter-wmwc; the only code change since is 1043187 (rkqy). Checked the rkqy fix: git log now runs as 'bash -c set -o pipefail; git log ... 2>/dev/null | head -c 4000000' inside the same bwrap, with stderr ignored on the host and a note when output is cut; the cut check runs before the exit-status check, so head's SIGPIPE exit is handled. Probed with a planted gpg.program behind log.showSignature and a gpgsig commit: its stderr reaches the log only through git's stdout, which head caps. Writing straight to the host's output was tried by opening /proc/<pid>/fd/1 of bwrap, bash and head; it fails with ENXIO because those fds are sockets, and only git's pipe into head was writable. The 9 MB test passes. bun run check: 1073/1073 pass. Residual, not blocking: bash (an ancestor of the planted program, and ptrace_scope is 1) still holds the host socket as fd 1, so a program that ptrace-injects a write could bypass the cap, bounded by the 120 s timeout; capping on the host side (stream stdout, stop at the cap, kill) would close it.
