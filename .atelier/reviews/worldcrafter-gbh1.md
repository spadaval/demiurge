---
schema: atelier.review
schema_version: 1
id: worldcrafter-gbh1
title: finding on worldcrafter-lsu3 @02633754
target: worldcrafter-lsu3
identity: round-log-reviewer
commit: 026337549474674e38de0fe75662168b99e2ab18
created_at: 2026-11-05T17:01:48.338867188Z
event:
  event: finding
  recommendation: defer
---

low: app/scripts/round/round.ts (failed attempt note on .atelier/issues/worldcrafter-lsu3.md) The rerun was handled honestly: the killed attempt's work/ holds only init (story.json 556 bytes, one commit), no outline existed to select from, nothing carried over (reading confirms), and it is disclosed in the log and the close. But one cause is visible and not recorded: round.ts installs no SIGTERM/SIGINT handler, so when the runner is killed its bwrap child (whose --die-with-parent ties the sandboxed process to bwrap, not to the runner) keeps a credentialed writer running unsupervised, which is how the orphan arose. Under 'one writer subagent at a time' a second rerun could overlap it. Fix later: have the runner forward termination to its sandbox (or run bwrap under the same process group and kill it), and before Round 5 confirm no writer process is left from an earlier attempt; record this as a follow-up item, e.g. under qmq0 or hdly.
