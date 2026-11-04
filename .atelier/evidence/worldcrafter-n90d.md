---
created_at: "2026-11-04T22:03:52.160429165+00:00"
id: "worldcrafter-n90d"
evidence_type: "validation"
commit: "eb21b3943728a242e80eeb2370a96b7ee4265226"
result: "pass"
captured_at: "2026-11-04T22:03:52.160380804+00:00"
path: "/home/supadava/projects/demiurge-comparison/smoke"
agent_identity: "implementer (phase A, review fixes)"
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
title: "Review fixes for the comparison harness (1971090, eb21b39). Sandbox (worldcrafter-ghcr, pe4t): two non-story claude -p probe sessions under the harness's own session()/sessionArgv(), against a probe freeze in the session scratchpad (not the real frozen/). Both: init tools Bash/Edit/Read/Write, no skills, no MCP, claude-opus-5-5; ls /home/supadava/projects and cat /home/supadava/.claude/CLAUDE.md both 'No such file or directory'; /home holds only writer, whose ~/.claude holds only .credentials.json plus claude's own fresh files; /tmp holds only the run dir and claude's own sockets; demiurge-comparison not visible; commits are made as 'Writer <writer@example.invalid>'. Notes probe: /opt holds only bin, /opt/story-tool doesn't exist, STORY_CLI empty. Tool probe: /opt/story-tool holds story.js and story-sketch only, FROZEN.json not reachable via .., bun $STORY_CLI --help prints the story CLI usage, touch /opt/story-tool/x fails with Read-only file system. OAuth through the bound credentials file worked in both. The transcript check reported every outside attempt in the probes. Freeze writes tool/ read-only plus sha256s in FROZEN.json beside it. Web tools dropped (4zks). New tests (cf5i, ievd, vurd): 781 pass in bun run check. Smoke packets regenerated from the saved smoke output with one-sentence-per-line diffs: 8,294 and 6,732 words (were 8,881 and 7,518); the rework diffs still reproduce the after-text for both arms; failures.md reports nothing outside for all 8 steps. Not exercised live: a full story run under bwrap, and the token-refresh wait in ensureToken."
updated_at: "2026-11-04T22:03:52.160816198+00:00"
---

Review fixes for the comparison harness (1971090, eb21b39). Sandbox (worldcrafter-ghcr, pe4t): two non-story claude -p probe sessions under the harness's own session()/sessionArgv(), against a probe freeze in the session scratchpad (not the real frozen/). Both: init tools Bash/Edit/Read/Write, no skills, no MCP, claude-opus-5-5; ls /home/supadava/projects and cat /home/supadava/.claude/CLAUDE.md both 'No such file or directory'; /home holds only writer, whose ~/.claude holds only .credentials.json plus claude's own fresh files; /tmp holds only the run dir and claude's own sockets; demiurge-comparison not visible; commits are made as 'Writer <writer@example.invalid>'. Notes probe: /opt holds only bin, /opt/story-tool doesn't exist, STORY_CLI empty. Tool probe: /opt/story-tool holds story.js and story-sketch only, FROZEN.json not reachable via .., bun $STORY_CLI --help prints the story CLI usage, touch /opt/story-tool/x fails with Read-only file system. OAuth through the bound credentials file worked in both. The transcript check reported every outside attempt in the probes. Freeze writes tool/ read-only plus sha256s in FROZEN.json beside it. Web tools dropped (4zks). New tests (cf5i, ievd, vurd): 781 pass in bun run check. Smoke packets regenerated from the saved smoke output with one-sentence-per-line diffs: 8,294 and 6,732 words (were 8,881 and 7,518); the rework diffs still reproduce the after-text for both arms; failures.md reports nothing outside for all 8 steps. Not exercised live: a full story run under bwrap, and the token-refresh wait in ensureToken.
