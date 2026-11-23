---
schema: atelier.item
schema_version: 3
id: worldcrafter-rxvy
title: 'Anchored conversation: open a scoped talk topic from any scene, passage, or bible record'
status: in_review
mission: worldcrafter-mtkn
labels:
- ui
- talk
priority: medium
blocked_by:
- worldcrafter-lhh3
- worldcrafter-wqh0
implementers:
- thread:delegated-task:command%3Amcp%3A3f69cce6-a3b3-462c-8abc-fa3ad7d4dffd%3Adelegate-task%3A2fc5e96a-c15f-4ecf-83ab-186fd8493995
ready: null
trivial: null
caused_by: null
created_at: 2026-11-22T22:39:02.266393429Z
---

## Goal

Let the writer launch or jump into a scoped talk-page conversation anchored to any scene, selected prose passage, or bible record (actor, drive, event, open question, count, contradiction) so the agent automatically receives that target's deterministic context packet.

## Done when

- [x] From any scene, selected passage, or bible inspector record, one action opens (or focuses) a talk topic anchored to that target.
- [x] The anchored topic preloads the target record/passage plus its `touches` neighborhood (and `reader-order --before` for scenes) into the Story Agent Runner's context packet.
- [x] Open topics are surfaced unobtrusively on the record/scene and aggregated in the world inbox (`worldcrafter-lhh3`).
- [x] Component tests cover opening an anchored topic from both a scene and a bible record; `bun run check` passes.

## Scope

In: Anchored topic triggers, context preloading, and cross-links between inspector views, scene view, and talk pages (`worldcrafter-lhh3`).
Out: Global unanchored chat (explicitly out of scope per `docs/rebuild/talk-pages.md`).

## Report

The writer can now start a talk topic from the thing it is about, and the model gets that thing's context packet. Commit `adf5b8c`.

- **Scene and passage.** A scene sheet has "Talk about this scene" under its title (`app/src/app/anchored-talk.tsx`, `SceneTalkAction`, placed in `pages.tsx`). While words are selected it reads "Talk about this passage", and the topic's scope is a passage quoting them. Since round 1 (`0f14534`), the passage keeps which occurrence of its words was selected (`occurrence`) and the block it ends in when it runs over paragraphs (`through`). Both fields are optional, so stored topics read as before, and `talk/passage.ts` finds the words again for the gloss marks and for staleness.
- **Record.** A record's detail in the World inspector ends with a "Talk" field (`RecordTalk`): its open topics as references, then "Talk about this record". A scene's record opens a scene-scoped topic, the same scope as one started from its prose (`recordTopicScope`).
- **Opens or focuses.** Each action calls `AppTalk.anchor(scope)`: it brings forward the unsent draft about the same thing if there is one, else drafts a new topic and opens its sheet. It does not reuse a stored topic, because a scene or record can have several; its open ones are listed beside the action instead.
- **Context.** Record packets already had the record, `touches` and `scenes`. Scene packets (used by scene and passage topics) gained a "What it touches" section after "People in it", alongside the existing `reader-order --before`. Prose generation's bible context leaves that section out (`gatherBibleContext` passes `touches: false`), so prose requests are unchanged. A passage's quote was already in the topic's prompt. The composer's "The model sees…" line now says so.
- **Surfaced on the target.** On a scene sheet, open scene and passage topics are Talk gloss notes on the Notes layer (`app/src/layers/talk.ts`), as DESIGN.md asks: keyed to the passage's words with an `ink-3` hairline, or after the scene's last line for a scene topic or a passage whose words are gone. "Open" opens the topic. On a record they are the Talk field's list.
- **Inbox.** I kept the World inbox as DESIGN.md and `talk-pages.md` define it: open topics the model raised, plus kept contradictions. Anchored topics the model raises land there with their scope line (tested). The writer's own anchored topics are listed in the rail's Topics view by scope and on their target. Adding them to the inbox would contradict both design docs, so I didn't.
- **Not built.** The Goal lists "contradiction" among bible records. Contradictions are computed, have no ref and no record sheet, and `TopicScope` can't name one, so there is no "Talk about this contradiction". Ledger rows in the inspector views have no talk action; it lives on each record's detail sheet, one click away.
- **Tests.** `app/src/app/anchored-talk.app.test.tsx` covers six cases. Two are scene and passage launches, checking the request's system prompt and packet (`reader-order`, "What it touches") and the Talk note with its Open action. Two are record launches: a drive's packet and topic list, and a scene's record. One checks a model-raised record topic in the inbox and on the record, and one checks read-only. Unit tests cover note placement (`layers/talk.test.ts`), the scope helpers (`talk/talk.test.ts`) and the packet (`agent/context.test.ts`).
- **Check.** `bun run check` passes, with 1762 tests. It prints seven React act warnings from `generate.app.test.tsx`; master prints the same ones, and they are `worldcrafter-d93c`.
- **Docs.** I updated `docs/rebuild/talk-pages.md` (new section on starting a topic where you are), `docs/rebuild/story-agent.md` (scene packet), and DESIGN.md (where the actions sit, plus the Talk note's hairline, authority and scene placement).
- **Overlap.** `worldcrafter-ywt3` is building the composer's Context action in `topics.tsx`. My changes there are small: `useNewTopic` now uses the shared `useShowTopic`, and `seesLine` has new wording.

### Responses

1-9b2c.1: fixed in 0f14534
1-9b2c.2: fixed in 0f14534
1-9b2c.3: not built: a contradiction has no ref or stable identity (it is computed, and its message changes with the bible), and DESIGN.md and the mission's success criteria define a topic's scope as the world, a scene, a passage or a bible record. A contradiction topic needs a new scope kind, an agent scope and packet, an identity that survives bible edits, and a DESIGN amendment, which should be its own item rather than part of this one.

