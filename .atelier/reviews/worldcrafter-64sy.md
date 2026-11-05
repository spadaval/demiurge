---
schema: atelier.review
schema_version: 1
id: worldcrafter-64sy
title: approval on worldcrafter-ulpg @90e9c668
target: worldcrafter-ulpg
identity: round1-fix-reviewer
commit: 90e9c66878157435bdfcab110ca9f762c8e12ad5
created_at: 2026-11-05T11:45:00.054345568Z
event:
  event: approval
---

Covers worldcrafter-zevg only (c1231db, 90e9c66). bun run check in a detached checkout at 90e9c66: 1113 pass, 0 fail, exit 0. Done when: the first reply's words are checked; under 250 or over 550 resumes the same session once (--session-id then --resume, same Read-only tools) with its count and direction; both replies kept as phases/<phase>/reply.md, so-far/<n>.md holds the revision; still outside 300-500 is a note. Judge prompt and rubric untouched; prompts keep jeue's plain prose, outline-only, no tool vocabulary, and the vocabulary check still runs. Temporary home: mkdtemp under the host tmpdir (0700), one per point, holding only .claude/ (claude's own session files and the empty mount point bwrap makes); bound rw at /home/writer inside --tmpfs /home, with the real credentials --ro-bind over .claude/.credentials.json after it (order tested), so the sandbox can't write or rename them; the only other writable mount is the per-point run dir, /tmp is tmpfs, /usr and /etc read-only; ensureToken still runs before each session and the credentials hash is checked before and after. Removed in finally (rmSync on the host dir, which doesn't follow symlinks, so it can't reach the real file). One small leak: home, like runDir already, is made just before the try, so a throw from which('claude') would leave an empty dir; harmless. Isolation: a new runDir and home per point, so the resumed session holds only that point's outline; the transcript check flags reads outside the run dir and a session id other than the one assigned. Smoke /home/supadava/projects/demiurge-world/smoke-sofar: 671 then 511 words, same session 3075a5a6 both times, one Read of outline.md only, outside [], credentials hash unchanged, no so-far-home dir left in /tmp. 511 being just over 500 is recorded as a note, as the Done when allows. No findings.
