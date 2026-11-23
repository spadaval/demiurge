---
schema: atelier.review
schema_version: 3
round: 1
commit: 7330e278ce8d94abf9ad89fe4c9f7350187a21e6
reviewers:
- thread:delegated-task:command%3Amcp%3A0679d4d4-73e3-470e-8e25-febde47173e9%3Adelegate-task%3A7721a694-e5bb-4df0-be75-0c37e3646c43
model: gpt-6.1-sol
verdict: changes
created_at: 2026-11-23T07:19:19.862155769Z
---

## Summary

Complexity: high. The change adds a bible service, route and tab state, five views, record details for twelve reference kinds, and their navigation and responsive styles across roughly 3,200 application and test lines.

Value: high. Browsing the unified bible and following its connections is the item's required outcome, and the shared ledger and reference components make the views consistent.

Risk of merging: high. The current time formatter silently changes the meaning of supported non-year clocks, and failed refreshes can leave stale bible contents looking current.

I reviewed `git diff master...7330e278ce8d94abf9ad89fe4c9f7350187a21e6`, the new service and model, all five views and reference-kind details, the route/tab/rail integration, the component tests and CSS against DESIGN.md. I checked the story schema, touches, ordering and existing time renderers to verify the field and formatting contracts. `cd app && bun run check` passes: TypeScript and Biome are clean, and all 1,614 tests pass.

I also reused the component test harness in `/tmp/wqh0-review/review.test.tsx`, outside the repository. Four additional assertions reproduce the findings below. Run them with `cd /tmp/wqh0-review && bun test --preload /home/supadava/.t3/worktrees/demiurge/t3-ce6ba262-172b1b6c43d99f39/app/src/test/happy-dom.ts ./review.test.tsx`. Each fails at the expected behavior assertion. I inspected responsive CSS and exercised drawer state in the DOM; I did not independently render the app in a real browser or verify the report's screenshots. The reported lack of explicit reader-question progress and resolved-contradiction state is borne out by the schema. The scene prose/detail navigation has both destinations available as reported.

The overall scope is worth building. These are contained correctness and integration fixes; a smaller replacement would not provide the required views.

## Finding 1: Respect the story clock's unit when displaying event times
Recommendation: fix now

`app/src/app/inspector.tsx:274-279` calls `describeWhen` for every position, although that formatter interprets its arguments as fractional Gregorian years. `Timeline.worldUnit` supports other units. The committed lighthouse fixture has `worldUnit: "day"` and places the storm at 3 to 6; opening `/world?at=event:storm` displays **"year 3 to 5, day"**. Timeline and scene detail values use this same component. This both changes days into years and changes the upper bound according to year-span rules. The existing `story/render.ts` position formatter explicitly branches on `worldUnit` and prints this fixture as `day 3 to 6, noted "day"`. Make the inspector's formatter unit-aware, keeping calendar formatting for year clocks and preserving numeric positions and units for other clocks. Cover both cases with a component assertion on the complete displayed time, rather than only the margin number.

## Finding 2: Preserve membership start and end events in actor details
Recommendation: fix now

`app/src/app/inspector.tsx:1222-1234` reduces each membership to the other actor's reference. Neither `since` nor `until` is rendered. The fixture's Ivo belongs to the guild from the storm until the wreck, but his detail only says **"Belongs to Kestrel Guild"**; the guild's detail also loses the interval. There is no membership reference kind or detail page to recover these fields, and the actor's touches do not expose the membership boundary events either. Leaving and rejoining the same group would become repeated indistinguishable names. The goal explicitly includes inspecting memberships. Render each membership with its group/member and linked boundary events, including the unbounded cases, so a writer can distinguish past and ongoing memberships and navigate to the events that change them. Verify this from both actor and group details on the committed fixture.

## Finding 3: Close the rail drawer after selecting an inspector view
Recommendation: fix now

The new inspector links in `app/src/app/rail.tsx:432-444` change only `/world`'s search. The shell still closes the drawer only when the active document ID changes (`app/src/app/shell.tsx:49-51`). From `/world?at=cast`, open the drawer and select Open Questions: the sheet changes, but `data-rail-open` remains set because the active document is null both before and after. At 1180px and below the fixed rail therefore stays over the newly selected sheet. This was reproduced through the real rail link in the component harness. Include inspector navigation in the drawer-close behavior and cover a World-to-World view change; retain the existing document-navigation behavior.

## Finding 4: Show a notice when a bible refresh fails after a successful read
Recommendation: fix now

`app/src/app/bible.ts:40-42` deliberately keeps the previous ready state on failure and stores the error separately, but no UI subscribes to `bible.error`. `WorldPage` (`app/src/app/inspector.tsx:64-85`) only reads `bible.state`, so its error branch is unreachable in this case and the old records and counts continue to look current. I reproduced this by loading Cast successfully, corrupting the stored story's premise to a number, and refreshing: `bible.error.get()` reports the failed read, the old Cast sheet remains, and there is no alert or Notice. This also affects parse errors from subsequent imports or sync, which do not produce a storage-connection warning. Keep the useful last-good data, but subscribe to the error and show the failed-read Notice under the masthead as DESIGN.md specifies; clear it on successful refresh. Add a regression covering success, failure and recovery.
