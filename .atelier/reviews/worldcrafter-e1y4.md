---
schema: atelier.review
schema_version: 1
id: worldcrafter-e1y4
title: approval on worldcrafter-ulpg @65119a7c
target: worldcrafter-ulpg
identity: round1-fix-reviewer
commit: 65119a7c054784c7c11af9e6a87249460670ff85
created_at: 2026-11-05T12:26:10.314302385Z
event:
  event: approval
---

Covers uf0f, vg6e, zevg and ktfa (zevg approved earlier as worldcrafter-64sy). bun run check in a detached checkout at 65119a7c: 1130 pass, 0 fail, exit 0. Fixes in 667ff88, re-run in a writer-like bwrap (own /proc, tmpfs /tmp): gu8c, the batch exclusion is now only the scene-being-written seed; the repro (update-fact f1 then describe-event wreck in one bash -c) now lists f1. a6my, rounding starts at 100; the 12->14 case no longer flags 'Ten men'. d5wq, set-count without --note keeps the note and --note "" clears it. ktfa against its Done when and decision dgkx with its note: set-scene-viewpoint (none clears), shown in show scene and render; reader-order --before names the viewpoint and marks told records as doesn't know / doesn't know yet / no longer knows plus 'believes <version>' (demo: wreck 'Mara doesn't know yet, believes version:fog', fact:lamp 'Mara doesn't know', untracked fact:sea unmarked). Marking only records whose knowledge is tracked is the right minimal rule and the skill says to record who knows a secret. Timing at the scene's latest placed event matches the anchor --before already uses. add/update/remove-membership with since/until; show actor: lists both sides; removing an actor takes its memberships (Also removed); a membership ending before it starts is a contradiction. Not making memberships a ref kind, with no trace, keeps it small, as dgkx's note asks. Printing knowledge and membership contradictions on edits matches what the skill already claimed. SKILL.md drops the old participant-for-joins/leaves advice and replaces it with the membership bullet; nothing else refers to it. --help matches. Writer-facing examples are premise-neutral (mara, ivo, crew, wreck). No gold-plating beyond the Done when. One defer finding (kept note can state the old value); no fix_now remains.
