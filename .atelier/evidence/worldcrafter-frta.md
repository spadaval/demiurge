---
created_at: "2026-11-04T22:25:30.421143560+00:00"
id: "worldcrafter-frta"
evidence_type: "validation"
commit: "44b9b886e9b13a3094efa164c9b1332f02a51abf"
result: "pass"
captured_at: "2026-11-04T22:25:30.421021973+00:00"
agent_identity: "implementer (phase A, re-review fixes)"
target:
  kind: "issue"
  id: "worldcrafter-04z5"
  role: "validates"
relationships:
  blocks: []
  children: []
  attachments:
  - kind: "issue"
    id: "worldcrafter-04z5"
    role: "validates"
  relates: []
schema: "atelier.evidence"
schema_version: 2
status: "recorded"
title: "Re-review fixes (7956809, 44b9b88). kzi3: transcript check reports URLs, network clients in command position (curl, wget, ssh, nc, npx...), git clone/fetch/pull/push/ls-remote/remote, package installs, /dev/tcp and urllib; tests include the three reviewer cases and prose that must not match ('dig into', 'at the top'). README says the network stays open for the API, so this is detection only; bwrap can't allow just the API without a proxy or separate-netns firewall, not built. y8q4: credentials mounted --ro-bind; ensureToken moved to sandbox.ts with tests (fresh: no-op; near expiry: waits for lapse then refreshes on the host; refresh fails: throws); anything naming .credentials.json is reported. Probe (scratch freeze at 44b9b88, removed after, no premise): a tool-arm claude -p session started through spawnSession authenticated with the read-only mount (result success, ran the story CLI's --help, wrote a.txt); host credentials sha256 unchanged before/after; inside the same sandbox, touch on the credentials fails 'Read-only file system'. goor: ps/pgrep/top and /proc/ are reported; bwrap takes its options via --args 3 from a file deleted once open, so inside the sandbox ps and /proc/1/cmdline show only 'bwrap --args 3 <command>', fd 3 is closed, and with session output now piped no fd under /proc/*/fd names a host path (count 0). An earlier probe asking claude itself to run ps and touch the credentials was declined by the model as reconnaissance; the direct bash probe in the session's sandbox replaced it. bun run check 805 pass."
updated_at: "2026-11-04T22:25:30.421762966+00:00"
---

Re-review fixes (7956809, 44b9b88). kzi3: transcript check reports URLs, network clients in command position (curl, wget, ssh, nc, npx...), git clone/fetch/pull/push/ls-remote/remote, package installs, /dev/tcp and urllib; tests include the three reviewer cases and prose that must not match ('dig into', 'at the top'). README says the network stays open for the API, so this is detection only; bwrap can't allow just the API without a proxy or separate-netns firewall, not built. y8q4: credentials mounted --ro-bind; ensureToken moved to sandbox.ts with tests (fresh: no-op; near expiry: waits for lapse then refreshes on the host; refresh fails: throws); anything naming .credentials.json is reported. Probe (scratch freeze at 44b9b88, removed after, no premise): a tool-arm claude -p session started through spawnSession authenticated with the read-only mount (result success, ran the story CLI's --help, wrote a.txt); host credentials sha256 unchanged before/after; inside the same sandbox, touch on the credentials fails 'Read-only file system'. goor: ps/pgrep/top and /proc/ are reported; bwrap takes its options via --args 3 from a file deleted once open, so inside the sandbox ps and /proc/1/cmdline show only 'bwrap --args 3 <command>', fd 3 is closed, and with session output now piped no fd under /proc/*/fd names a host path (count 0). An earlier probe asking claude itself to run ps and touch the credentials was declined by the model as reconnaissance; the direct bash probe in the session's sandbox replaced it. bun run check 805 pass.
