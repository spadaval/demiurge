# Notes

## 2026-11-23: worldcrafter-w4mr, ruling after round 3

Round 3 asked for changes, so the item reached the review cap and came to the lead.
The open finding is `3-aflb.2`: the round 3 reference extractor in
`app/src/agent/inspect.ts` accepts only strings shaped like a spaceless `kind:id`,
so a reference whose ID has a space (`actor:old man`) lost its link, and a scene ID
with a colon (`act:one`) is dropped or opens the wrong kind of record.

Ruling: fix it. The finding holds, it is a regression the round 3 fix introduced,
and the fix stays inside `inspect.ts`: check each whole `ref`/`on` value with
`parseRef`, always prefix a `scene` value with `scene:`, keep the `{kind, id}` and
reference-list support, and add tests for both cases. The implementer then submits
round 4.

## 2026-11-23: worldcrafter-lhh3, ruling after round 3

Round 3 asked for changes, so the item reached the review cap and came to the lead.
The open finding is `3-yey3.3`: rebuilding `app/src/app/styles.css` while merging
master cut the Topics rail rules (`.topic-row[aria-current="page"]::before`,
`.rail-count`, `.rail-more`, `.rail-foot-link`, the plain `.topic-title` rule) and
the `.turns` list reset. The open topic loses its active bar and turn lists show
browser numbering. No test loads the stylesheet, so the tests still pass.

Ruling: fix it. Restore the rail rules from `2d2cb74`, add the `.turns` reset, and
add a test that loads `styles.css` and checks those rules survive. The implementer
then submits round 4.

## 2026-11-23: the agent slip has no host

`worldcrafter-w4mr` built the agent slip and leaves hosting to its caller;
`worldcrafter-lhh3` left prompt and trace UI out of scope. So no agent session in
the app shows the slip, and the mission's criterion on inspecting every agent
session does not hold yet. Filed `worldcrafter-ywt3` in this mission to host it on
topic sheets, after `lhh3`.

Two more gaps from the `lhh3` Report are filed outside the mission, since the plan
does not ask for them: `worldcrafter-8jrq` (an agent tool to raise a topic; today
only code raises one) and `worldcrafter-gobh` (proposals with "Record as fact").

## 2026-11-23: worldcrafter-rxvy, ruling on finding 3-unai.1

Round 3 approved the item; the implementer answered `3-unai.1` (no topic can be
opened from a contradiction) as not built. Ruling: merge without it. The mission's
criteria and `DESIGN.md` scope topics to the world, a scene, a passage or a bible
record. A contradiction is computed on each read and has no stable ID, so anchoring
a topic to one needs a new scope, an identity rule and a `DESIGN.md` amendment,
which is larger than this item. Filed as `worldcrafter-n0kb`, outside the mission.

## 2026-11-23: worldcrafter-ywt3, ruling after round 3

Round 3 asked for changes, so the item reached the review cap and came to the lead.
The open finding is `3-cnvn.2`, a regression from the round 2 fix: `findTopicPrompt`
(`app/src/talk/scope.ts`) recognises the topic's own part of the prompt only when a
blank line or the end follows it. If the writer adds an instruction on the very next
line, the first "Profile default" save works and every later one on that topic is
refused with "Keep that part as it is".

Ruling: fix it. Accept the part at any line boundary in `findTopicPrompt`, remove it
in `profilePrompt` (`app/src/talk/talk.ts`) with the newlines that separate it,
keeping the writer's text on both sides, and add the app and unit tests for a single
newline on each side. The implementer then submits round 4.
