---
schema: atelier.review
schema_version: 1
id: worldcrafter-qr19
title: finding on worldcrafter-r26d @3fd9f95e
target: worldcrafter-r26d
identity: round0-reviewer
commit: 3fd9f95eb994896342131860f80ec11f8027bf56
created_at: 2026-11-05T07:00:16.806390748Z
event:
  event: finding
  recommendation: defer
---

low: app/src/story/story.ts:188 removing the reader_question_never_answered gap kind makes any story file with a deliberate-gap mark of that kind refuse to load (verified: /home/supadava/projects/demiurge-comparison-2/key/raw/d8577118/step-4/files/story.json now fails with 'deliberateGaps[3].gap must be one of ...'), unlike the retired 'working' field, which is dropped on load. Only archived comparison files are affected today, but wefn will retire more gap kinds (actor-without-drive). Suggested fix, in wefn: drop deliberate-gap marks of retired kinds on load instead of refusing the file.
