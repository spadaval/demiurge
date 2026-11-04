---
schema: atelier.review
schema_version: 1
id: worldcrafter-6vfp
title: approval on worldcrafter-o8b7 @cb64318d
target: worldcrafter-o8b7
identity: code-reviewer
commit: cb64318dda1b770d354d2b4929d5eac1a18160f4
created_at: 2026-11-04T20:59:42.264975324Z
event:
  event: approval
---

Re-review of 3cf4e84e..cb64318d (fixes 4e02693 for worldcrafter-yydf, eb67c54 for worldcrafter-1uph). Ran cd app && bun run check: tsc + biome + 760 pass, 0 fail. Probe confirms a candidate touching only drive shut now reaches scene 2.1 and one touching only event seal reaches 4.2; the touched-candidate exclusion prevents recursion. Mutations caught: dropping carriedLinks for touched records (3 fail), ignoring held refs to events (1 fail), ignoring held refs to facts (1 fail), dropping candidate touches from held refs (2 fail). No new findings; 33qr meets its Done when.
