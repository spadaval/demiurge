---
schema: atelier.review
schema_version: 1
id: worldcrafter-qwxa
title: finding on worldcrafter-gwx3 @c9b93a51
target: worldcrafter-gwx3
identity: planning-reviewer-gwx3
commit: c9b93a51657508a7eef8f1f5d3013fd68697c036
created_at: 2026-11-05T06:30:50.918515407Z
event:
  event: finding
  recommendation: fix_now
---

low: worldcrafter-x2ij Done when 4 checks only the story-so-far for tool vocabulary (record kinds, refs, command names); nothing checks the scene prose, though a writer working from the model can leak refs or record-kind words into scenes, and judges reading tool output as story is exactly the failure the direction names ('judge only the final prose'). Fix: run the same vocabulary check on scene files before they go to judges (x2ij or w716), and record any hits in the round log.
