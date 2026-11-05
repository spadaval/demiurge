---
schema: atelier.review
schema_version: 1
id: worldcrafter-g0qy
title: finding on worldcrafter-79m3 @613c9e89
target: worldcrafter-79m3
identity: round1-fix-reviewer
commit: 613c9e8974d964a4cb69245fc892f29160d8337e
created_at: 2026-11-05T14:27:38.949537911Z
event:
  event: finding
  recommendation: fix_now
---

medium: app/src/story/learning.ts viewpointGap (o0s0, 613c9e8). Covers o0s0 only. A viewpoint character's own recorded belief in a version of an event is overridden by inference, so true dramatic irony disappears. 'Own records win' looks only at knowledge whose what is the event itself; a belief in one of its versions is not counted as an own record, so taking part in the event (or a scene through their eyes depicting it) marks them as knowing it. Repro on a scratch story: wreck with version fog --by ivo; add-knowledge mara-fog mara believes version:fog --since wreck; ivo knows event:wreck; scene night depicts wreck; scene post (later, viewpoint mara). reader-order --before post prints 'event:wreck ...: shown in 1; Mara doesn't know, believes version:fog'. After set-participant wreck actor:mara --role "in the boat, unconscious" (or set-scene-viewpoint night mara) the wreck line has no mark at all, though the writer has recorded that Mara believes the cover story. This is exactly the case the feature exists for (a character present at, or shown, an event who holds a false account of it), and it goes silent with nothing to tell the writer why. Fix: treat the actor's knowledge of a version of the event as their own record about the event: if they hold a version at the scene's time and no knowledge of the event itself, mark 'doesn't know, believes <version>' regardless of participation or viewpoint scenes (a writer who wants the belief to end sets --until on it, as the explicit-records rule already expects). Add this case to viewpoint.test.ts. Otherwise checked and fine: bun run check at 613c9e8, 1134 pass, 0 fail, exit 0. The re-run outputs match the reading's judgements: before nobody-unmasked the 7 dropped marks are its listed false ones (staged-danger, ring-job, v-staged, seat-ledger, benefice-cold, v-undertow-bargain, plus v-gnash-suspect revealed in a Merrit-viewpoint scene), and the 4 left (v-agathe-bargain 'no longer believes', who-nobody/agathe, fever, fever-cause/undertow-sent 'doesn't know yet') are true. Before last-evening only v-agathe-bargain remains. Held back no longer lists revealed answers, and each telling shows. Counting 'shows' in a viewpoint scene is right: a scene through her eyes that depicts an event has her there. Own knowledge records winning over inference is right, and is also what the fix above extends. Help and skill text are premise-neutral.
