---
schema: atelier.review
schema_version: 1
id: worldcrafter-3tzv
title: approval on worldcrafter-hqgq @cd50a49d
target: worldcrafter-hqgq
identity: code-reviewer
commit: cd50a49d49107d779af40da97cfd903ff6598170
created_at: 2026-11-05T01:12:40.805749792Z
event:
  event: approval
---

Re-review of worldcrafter-xgxp fixes 152f480b..cd50a49d. x38u resolved (ef35197): CLI repro war 1200-1210, rebuilding 1220-1230 --gap 20 now prints '[20 years after The war]', --gap 10 also prints (engine range 10-30), wreck 1203/letter 1213 --gap 10 still hidden; start-difference rule now only for spans within a unit, which can't hide an engine-violated gap. gt92 fixed (fe864ff): answering clears the working mark, set-open-question-working on an answered question is refused (CLI rc=1). Mutations restored and each caught: equal-length rule back, unit widened to 10, strict <1, answer keeps mark, refusal removed. bun run check: 881 pass, 0 fail. f5m4 deferred to fax9, accepted.
