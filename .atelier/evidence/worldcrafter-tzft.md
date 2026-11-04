---
created_at: "2026-11-04T23:57:01.233693258+00:00"
id: "worldcrafter-tzft"
evidence_type: "validation"
commit: "26f33df4b0a0d2e060016e262be0132f6d86b25b"
result: "pass"
captured_at: "2026-11-04T23:57:01.233658724+00:00"
path: "/home/supadava/projects/demiurge-comparison/smoke/judging-panel"
agent_identity: "implementer (judging panel runner)"
target:
  kind: "issue"
  id: "worldcrafter-i2uz"
  role: "validates"
relationships:
  blocks: []
  children: []
  attachments:
  - kind: "issue"
    id: "worldcrafter-i2uz"
    role: "validates"
  relates: []
schema: "atelier.evidence"
schema_version: 2
status: "recorded"
title: "Smoke test of the judging panel runner (app/scripts/judging/panel.ts, e327191; README 26f33df), on smoke material only, not the real packets. Model probes ('panel.ts probe', the judges' own sandboxed session with Bash/Read/Write): claude-opus-5-5, claude-sonnet-5-5 and claude-fable-5-1 each accepted, init and every assistant message on the requested model, twice. Finding: with --tools \"\" Fable 5.1's safeguards refused 5 of 6 trivial sandboxed probes (category cyber) and Claude Code silently fell back to claude-opus-4-8 for the session; with the judges' tool set 0 of 12 refused. The runner now flags any model_refusal_fallback event and any model other than the judge's in STATUS. Smoke root: the two old smoke packets (thukker-pair-1-A/B) plus a dummy key.md, failures.md, model-gaps/dummy.md and a key/raw/ decoy. Sandbox view (sandbox-view.ts, the judges' exact bwrap options running a shell): /tmp holds only the run dir with exactly failures.md, key.md, model-gaps/dummy.md, my-part1.md, packets/*.md, rubric.md (no raw/, no key.json); /home holds only writer/.claude/.credentials.json, read-only; /home/supadava, the repo, demiurge-comparison, /opt/story-tool and the smoke root don't exist; /proc/self/mountinfo names host paths only for the credentials, claude and bun binds (as in the comparison). part1 sonnet --rubric-commit 314b20a: exit 0 in 45s (wall), STATUS ok, rubric recorded as 314b20ad0247f84560e14032aac89693b6ba075c, init tools Bash/Read/Write, no skills or MCP, models [claude-sonnet-5-5], 6 tool uses all inside the run dir, transcript check outside [] , inputs unchanged. part2 before mark-recorded refused; mark-recorded sonnet smoke-0001 wrote RECORDED. part2 sonnet: exit 0 in 18s, STATUS ok, models [claude-sonnet-5-5], 3 tool uses, outside [], my-part1.md sha256 9757dd03... identical to part1/part1.md before and after, last line 'VERDICT: change' parsed as change. Rerun refused without --replacement, --replacement refused on an ok run, part2 for a judge with no Part 1 refused. verdict on fake part2s: keep/change/drop gives change (three-way split rule), drop/keep/drop gives drop, a trailing line after VERDICT refused; verdict.md matches stdout. Content not judged. bun run check: 840 pass. Not exercised live: part1/part2 all (concurrency), a real failure and --replacement (unit-tested only), ensureToken's refresh wait."
updated_at: "2026-11-04T23:57:01.234108583+00:00"
---

Smoke test of the judging panel runner (app/scripts/judging/panel.ts, e327191; README 26f33df), on smoke material only, not the real packets. Model probes ('panel.ts probe', the judges' own sandboxed session with Bash/Read/Write): claude-opus-5-5, claude-sonnet-5-5 and claude-fable-5-1 each accepted, init and every assistant message on the requested model, twice. Finding: with --tools "" Fable 5.1's safeguards refused 5 of 6 trivial sandboxed probes (category cyber) and Claude Code silently fell back to claude-opus-4-8 for the session; with the judges' tool set 0 of 12 refused. The runner now flags any model_refusal_fallback event and any model other than the judge's in STATUS. Smoke root: the two old smoke packets (thukker-pair-1-A/B) plus a dummy key.md, failures.md, model-gaps/dummy.md and a key/raw/ decoy. Sandbox view (sandbox-view.ts, the judges' exact bwrap options running a shell): /tmp holds only the run dir with exactly failures.md, key.md, model-gaps/dummy.md, my-part1.md, packets/*.md, rubric.md (no raw/, no key.json); /home holds only writer/.claude/.credentials.json, read-only; /home/supadava, the repo, demiurge-comparison, /opt/story-tool and the smoke root don't exist; /proc/self/mountinfo names host paths only for the credentials, claude and bun binds (as in the comparison). part1 sonnet --rubric-commit 314b20a: exit 0 in 45s (wall), STATUS ok, rubric recorded as 314b20ad0247f84560e14032aac89693b6ba075c, init tools Bash/Read/Write, no skills or MCP, models [claude-sonnet-5-5], 6 tool uses all inside the run dir, transcript check outside [] , inputs unchanged. part2 before mark-recorded refused; mark-recorded sonnet smoke-0001 wrote RECORDED. part2 sonnet: exit 0 in 18s, STATUS ok, models [claude-sonnet-5-5], 3 tool uses, outside [], my-part1.md sha256 9757dd03... identical to part1/part1.md before and after, last line 'VERDICT: change' parsed as change. Rerun refused without --replacement, --replacement refused on an ok run, part2 for a judge with no Part 1 refused. verdict on fake part2s: keep/change/drop gives change (three-way split rule), drop/keep/drop gives drop, a trailing line after VERDICT refused; verdict.md matches stdout. Content not judged. bun run check: 840 pass. Not exercised live: part1/part2 all (concurrency), a real failure and --replacement (unit-tested only), ensureToken's refresh wait.
