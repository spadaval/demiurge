---
schema: atelier.review
schema_version: 1
id: worldcrafter-kzi3
title: finding on worldcrafter-o8b7 @33cea9b2
target: worldcrafter-o8b7
identity: code-reviewer
commit: 33cea9b283a42c6f2a2936e52a59fa60d341a5d1
created_at: 2026-11-04T22:20:16.269895292Z
event:
  event: finding
  recommendation: fix_now
---

medium: app/scripts/comparison/transcript.ts:136-150 (with sandbox.ts:63 --share-net) the web tools are gone, but the network is still open to Bash, and the check doesn't report it. Under the harness's own sandboxArgs, 'getent hosts github.com' resolves. Through checkTranscript, 'curl -s https://raw.githubusercontent.com/spadaval/demiurge/master/app/scripts/comparison/prompts.ts', 'git clone https://github.com/spadaval/demiurge x' and 'wget -qO- github.com/spadaval/demiurge' are all unreported: '//raw.githubusercontent.com/...' is taken as a path whose first segment doesn't exist at /. So the exposure that worldcrafter-4zks removed (the public repo, with the comparison and the held-back premise) is reachable and invisible, while README.md says the check reports any web access. Fix: report any Bash command that contains a URL (a scheme followed by ://) or runs a network client (curl, wget, git clone/fetch/pull/ls-remote, ssh, scp, nc, pip/npm/bun install or add); add these cases to comparison.test.ts. The network has to stay open for the API, so say in README.md that this is detection only.
