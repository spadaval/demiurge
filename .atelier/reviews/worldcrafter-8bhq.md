---
schema: atelier.review
schema_version: 1
id: worldcrafter-8bhq
title: approval on worldcrafter-s2mz @913fd80f
target: worldcrafter-s2mz
identity: round0-reviewer
commit: 913fd80f1af16ddc1fbeb5ee1e3b9ee7a8af23c3
created_at: 2026-11-05T08:23:05.535750714Z
event:
  event: approval
---

Re-reviewed 87093f72..913fd80f. cb3800d resolves 3tvf: a whole scene file is no longer evidence in its text, so it stays out of the edit prompt (on-demand trace still lists it). A matched paragraph in a touching scene gains weight, and after an edit, text evidence ranks first. It also resolves 417n: a longer stopword list, plus stems in more than 15% of texts are ignored. Reran the large-story noise test (comparison-2 ac0caf8b story.json, 8 scene files, about 14k words including decoy prose from other stories). update-actor --notes and update-drive --stakes now prompt nothing, where before they listed 8 and 4 evidence-free files. A rename puts the prose paragraphs naming Kesh right after the one record. Moving hesse-killed still puts the 'four years ago' paragraph first. Re-answering still flags the old answer's prose. Unrelated decoy prose no longer appears in trace event:hesse-killed (one stray '14' in a quoted letter remains, trace-only). Dispositions 9hqz and q26l are accurate. Re-ran bun run check in app/: 1033 pass, 0 fail. No fix_now remains.
