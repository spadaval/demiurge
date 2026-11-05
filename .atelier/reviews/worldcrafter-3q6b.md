---
schema: atelier.review
schema_version: 1
id: worldcrafter-3q6b
title: finding on worldcrafter-6m2v @14fac640
target: worldcrafter-6m2v
identity: round0-reviewer
commit: 14fac640fdd412ead073af5d1ba064dc40dada65
created_at: 2026-11-05T07:37:47.138419974Z
event:
  event: finding
  recommendation: defer
---

low: app/src/story/commands.ts:186 add-knowledge and update-knowledge accept an --until event that comes before --since in story order (add-knowledge inv mara knows fact:lamp --since trial --until wreck, with trial at year 20 and wreck at year 10). contradictions says 'No contradictions', and render prints 'from The trial until The wreck'. Suggest reporting it in contradictions alongside the other timeline problems, for example with j6z1's finer time.
