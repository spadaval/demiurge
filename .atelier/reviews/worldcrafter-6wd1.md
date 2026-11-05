---
schema: atelier.review
schema_version: 1
id: worldcrafter-6wd1
title: finding on worldcrafter-hdly @fa0537a4
target: worldcrafter-hdly
identity: round-log-reviewer
commit: fa0537a4b35749535be1c801d32bf3d40ec7ccb4
created_at: 2026-11-05T19:06:53.078337628Z
event:
  event: finding
  recommendation: fix_now
---

medium: docs/rounds/README.md (Each class of continuity error went away ... arithmetic) and the gwx3 Close Reason ('each targeted class of continuity error gone after its fix') The claim that arithmetic errors went away and never came back rests on span checks done with describeBetween, which Round 5's reading finds off by one in 17 of 144 (Round 2), 47 of 186 (Round 3) and 39 of 119 (Round 5) pre-scene day counts, and says earlier prose was never re-checked against it (round-5/reading.md:195, :451). Rounds 2-5's 'day counts all right' verdicts are therefore unverified, and the mission's headline result overstates what was shown. Also, yxfp's Done when only re-runs the counts, not the earlier prose. Fix: qualify the README and gwx3 close (day counts unverified until yxfp, which may reopen past verdicts), and add to yxfp re-checking the day counts stated in Rounds 2-5's judged prose.
