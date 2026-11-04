---
schema: atelier.review
schema_version: 1
id: worldcrafter-carf
title: finding on worldcrafter-z9qs @be337afb
target: worldcrafter-z9qs
identity: planning-reviewer
commit: be337afb60a800c74a5b665a5a5bb32a1332a7f5
created_at: 2026-11-04T23:10:26.189498753Z
event:
  event: finding
  recommendation: fix_now
---

R2 medium: blindness and independence are stated as outcomes with no enforcement. worldcrafter-i2uz:36 says each judge reads only the packets and rubric for Part 1 and files before getting the key, but i2uz:42 puts the key path next to the packets path, the key dir is a sibling on the same filesystem, and the repo's .atelier records (04z5 handoff and decision notes, o8b7:75, git log) carry the authors' reasoning and arm details. A judge agent with file tools could read any of them. 04z5 found prompt-only isolation insufficient for the arms and used bwrap (04z5 decision note on isolation); the judges need the same. Fix in i2uz Done when: judges get the packets (copied to an isolated dir or inline) and the rubric pinned at a named commit, with no access to the repo, Atelier or the key dir; Part 2 material is handed over only after that judge's Part 1 is recorded as evidence; judge transcripts are checked for reads outside what they were given, and a judge that saw the key or the records early is replaced (see R1).
