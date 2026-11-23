---
schema: atelier.review
schema_version: 3
round: 2
commit: 72974457f0781e6625990b4ecca4a8e2f603991b
reviewers:
- thread:delegated-task:command%3Amcp%3A0679d4d4-73e3-470e-8e25-febde47173e9%3Adelegate-task%3Abba62b06-004c-4275-884f-8d61f9f6bf82
model: gpt-6.1-sol
verdict: approve
created_at: 2026-11-23T07:26:42.971098787Z
---

## Summary

Complexity: high. The whole change introduces a bible service, route and tab state, five inspector views, twelve record detail kinds, and shared navigation and responsive styles across roughly 3,200 application and test lines.

Value: high. Browsing the unified bible and following its connections is the required outcome, and the shared ledger, reference and time components support it directly.

Risk of merging: medium. These are read-only user-facing views with new navigation and loading state; the four identified correctness problems are now fixed and the change is reversible.

I reviewed every application and test change from `7330e278ce8d94abf9ad89fe4c9f7350187a21e6` to `72974457f0781e6625990b4ecca4a8e2f603991b`, checked the carried findings against the current service, shell, rail and inspector, and checked the affected schema, ordering and story-rendering contracts. I compared the changes with DESIGN.md's Notices, Ledger, References and World Inspector requirements and the item's Done when lines. The original fixture-based rendering and cross-navigation coverage remains, and four added component regressions exercise the earlier failures. `cd app && bun run check` passes: TypeScript and Biome are clean, and all 1,618 tests pass across 75 files.

I inspected the responsive CSS and the DOM drawer-state regression. I did not independently render the app in a real browser or verify the report's screenshots. No new issue was found in this revision. The scope is worth building; no smaller replacement supplies the required views.

## Finding 1: Respect the story clock's unit when displaying event times
Recommendation: fix now
Was: 1-0xsb.1
Response: fixed in ff5ab78
Now: fixed
`TimeValue` now uses the shared `describePosition(story, position)`. Its non-year branch preserves both numeric bounds and the world unit, while year clocks keep calendar formatting. The added component assertions verify the complete day-clock and year-clock values. Extracting the formatter leaves `renderStory`'s existing output unchanged.

## Finding 2: Preserve membership start and end events in actor details
Recommendation: fix now
Was: 1-0xsb.2
Response: fixed in ff5ab78
Now: fixed
Actor and group detail fields now render one list item per membership, in story order, with linked start and end events. Missing bounds read "from the start" and "still", matching the schema. The component regression checks both sides on the lighthouse fixture, an unbounded membership and navigation to the start event.

## Finding 3: Close the rail drawer after selecting an inspector view
Recommendation: fix now
Was: 1-0xsb.3
Response: fixed in ff5ab78
Now: fixed
The drawer-close effect now follows the router's full location href, covering inspector search changes as well as document path changes. The regression opens the drawer on Cast, follows the real Open Questions rail link and verifies the drawer closes after the view changes.

## Finding 4: Show a notice when a bible refresh fails after a successful read
Recommendation: fix now
Was: 1-0xsb.4
Response: fixed in ff5ab78
Now: fixed
`BibleNotice` subscribes to both `bible.error` and `bible.state`, places the error under the masthead, and identifies last-good data when present. The World sheet and rail no longer duplicate the error. The regression corrupts storage after a successful read, verifies the notice alongside the retained Cast sheet, then restores storage and uses Try again to verify recovery clears it.
