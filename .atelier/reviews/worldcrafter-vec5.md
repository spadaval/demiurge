---
schema: atelier.review
schema_version: 1
id: worldcrafter-vec5
title: approval on worldcrafter-hqgq @0df51cbf
target: worldcrafter-hqgq
identity: code-reviewer
commit: 0df51cbf15fcdc910b82305333c2eff9948808a0
created_at: 2026-11-05T02:14:47.867909281Z
event:
  event: approval
---

Review of 2fb7ea42..0df51cbf (worldcrafter-fax9). bun run check: 958 pass, 0 fail (my run, load ~20). craft.md sha256 ba76d8d1... equals FROZEN.json. Every SKILL.md claim checked against the CLI in a scratch story: set-open-question-working and --stop, answering clears it, answered refused; re-answer and unanswer keep superseded history in show, render prints only the answer; add-cause wreck letter order, render 'Because of', touches follows causes, moving cause after effect reported by contradictions; edit prompt heading text after set-position/update-actor; mentions <ref>; gaps [gap ref] pasted into mark-gap-deliberate works and gaps stops listing it. No premise echo (grep Thukker/EVE/magical/therapist: none); examples are the CLI help's lighthouse ones; skill is tool mechanics, craft.md untouched. Harness: diff reading shows buildTool is freeze's old body verbatim except the --help smoke runs with cwd tool/ instead of the frozen dir (absolute script path, no effect); stepPrompt's Pick<Premise,'text'> is a type widening (prompts.ts uses only premise.text, tsc passes); run and phase-b unchanged. CLI test covers causes, mentions, deliberate gaps, unanswer, working mark. Smoke dir structure: check.json all checks true, 9 causes, one real mentions call, model-gaps.md, nothing outside, only claude-opus-5-5, tool/SKILL.md identical to head. Mutant: mentionsCalls regex -> /mentions/ fails the mentions-calls test; restored, tree clean. One low no_action finding on mentionsCalls false positives.
