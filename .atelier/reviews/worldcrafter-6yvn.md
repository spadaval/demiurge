---
schema: atelier.review
schema_version: 1
id: worldcrafter-6yvn
title: finding on worldcrafter-79m3 @1febafd7
target: worldcrafter-79m3
identity: round1-fix-reviewer
commit: 1febafd73feba22e753cfea4b6f98774c1ab6949
created_at: 2026-11-05T15:21:08.077952586Z
event:
  event: finding
  recommendation: fix_now
---

medium: app/src/story/trace.ts MIN_SHARED_IN_TEXT / MIN_SHARED_PART (vw1u, b0e6d5f). Covers o0s0, 0u90 and vw1u. After a substantial rewrite of an event's summary, the new bar (four shared words, and a quarter of those the change removed) hides real paraphrase dependents, and the writer gets no signal at all: no line and no '...run trace for all N', and trace <ref> run afterwards has no 'was' to compare and says 'Nothing seems to depend on it'. Repro (each edit its own top-level shell; 12 filler facts so no word is common): wreck 'Ivo cut the tow rope in the gale off Skerry Point, left the brother at the helm, and rowed the dinghy home to the lighthouse'; fact f-row 'Ivo rowed home alone in the dinghy that night'; actor ivo --notes 'Came home in the dinghy and never spoke of Skerry'. describe-event wreck --summary 'A freak wave rolled the Ondine while Ivo slept ashore': at 837a737 the edit lists f-row (dinghy, home, rowed) and actor:ivo (dinghy, home, skerry), both stale (he slept ashore); at 1febafd it prints nothing. A light rewrite still works (two removed words: the inquest and the 'tow rope parted in the gale' fact are still listed), so the loss is exactly on heavy reworks, where trace matters most. Fix, cheaply: let three shared words count when they are rare in the story (each in at most two or three other texts, which the rarity score already measures), keeping four for ordinary words; re-run the Round 3 replay to confirm its noise (common-ish stems such as 'chat, fight, wrong') stays out, and add this case to trace.test.ts. Checked and fine: qqke and y9rq fixes (f22e1b7): 1950 --end 1960 now runs through 1960, battle 1960 during the war has no contradiction, show says 'year 1950 to 1960', an old whole-year moment reads 'the start of 1954', an old [1301, 1309] reads 'year 1301 to 1308' (same interval). bun run check at 1febafd: 1142 pass, 0 fail, exit 0.
