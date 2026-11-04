---
schema: atelier.review
schema_version: 1
id: worldcrafter-e6k7
title: finding on worldcrafter-o8b7 @b64ff2b5
target: worldcrafter-o8b7
identity: code-reviewer
commit: b64ff2b55f88e3127ec35732f01c09f4444b4490
created_at: 2026-11-04T22:26:52.626125909Z
event:
  event: finding
  recommendation: no_action
---

low: app/scripts/comparison/transcript.ts:53-66 the network pattern looks for a client name only in command position, so a client behind a prefix word and without a URL scheme isn't reported. Probe through checkTranscript: 'timeout 5 curl github.com/spadaval/demiurge', 'if curl -s github.com/x; then :; fi', 'xargs -n1 curl < urls' and python3 -c 'import socket; socket.create_connection(("github.com",443))' all go unreported. Ordinary use with a URL, 'git clone', package installs, 'bun -e fetch(...)' and /dev/tcp are reported, and prose in commits and heredocs isn't. Evading the check takes deliberate odd usage, and the check is detection only. Optional: match unambiguous clients (curl, wget, ssh, scp, rsync, socat, netcat, nslookup, aria2c) as words anywhere, and add 'socket' alongside urllib; keep command position for ambiguous names (ps, top, dig, http, nc).
