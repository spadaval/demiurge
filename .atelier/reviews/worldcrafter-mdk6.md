---
schema: atelier.review
schema_version: 1
id: worldcrafter-mdk6
title: finding on worldcrafter-j6z1 @02f77cc9
target: worldcrafter-j6z1
identity: round0-reviewer
commit: 02f77cc99abe7442485ae811328083e34ffb6805
created_at: 2026-11-05T07:58:18.607305367Z
event:
  event: finding
  recommendation: defer
---

low: app/src/time (timeline gap problem messages, as printed by the edit and by contradictions) when dates and unit gaps are in use, the CLI still states spans as raw fractional years. After set-position wreck 1954-10-12, set-position letter '1954-10-12 21:00', constrain c3 wreck before letter --gap 2w, both the edit and contradictions print 'constraint c3 puts 0.03833069809783911 give or take 0.009582674524459777 year between wreck and letter, but their positions put -0.000342465753419674 to 0.0023991628613657667 year between them'. render says it in words. show event prints '1954.5 to 1954.9150684931508 (year)' for set-position 1954.5 --end 1954-11. This is noisy output a writer has to decode. Suggest saying these with describeYears and describeSpan, as render does, when convenient (for example after Round 1 shows whether writers use dates).
