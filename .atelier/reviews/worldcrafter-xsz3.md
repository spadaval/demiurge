---
schema: atelier.review
schema_version: 1
id: worldcrafter-xsz3
title: approval on worldcrafter-7coc @ed6456ac
target: worldcrafter-7coc
identity: round0-reviewer
commit: ed6456ac6fb683a9f4cc1780e25b8f9ff304b6ba
created_at: 2026-11-05T06:47:11.267100877Z
event:
  event: approval
---

Reviewed b37f and wtiz (47c59c0f..ed6456ac) against jeue, world-demo.md and both Done whens. b37f: AGENTS.md names World first/gwx3/world-demo.md and says jeue superseded notes-first; SKILL.md frozen banner and description replaced. wtiz: render prints no word count and is called the author's bible in render.ts, --help and the skill; skill drops cut-for-length and 'how the story will be read'; prose lives in scenes/<id>.md (show scene prints path and word count); set-scene-links reveals/implies/withholds with ref validation and none-clear; scenes <ref> lists per-record scene touches in telling order, incl. candidates via their question; removals drop links; old files load and serialize unchanged. Re-ran bun run check in app/: 990 pass, 0 fail. Exercised the CLI on a scratch story (add, links, bad how, unknown ref, traversal IDs refused, show before/after prose file, scenes, touches, render, remove-fact). Findings 0m5a, 8och (defer) and one no_action; none fix_now.
