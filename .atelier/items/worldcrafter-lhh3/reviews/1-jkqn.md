---
schema: atelier.review
schema_version: 3
round: 1
commit: d4fe5283a7fc4ee45d949dd2f4141ba501b3d243
reviewers:
- thread:delegated-task:command%3Amcp%3Aca35fb7c-3881-48d4-8598-71f95eebeedf%3Adelegate-task%3A9e14cc49-064a-48b3-9c42-2f021e8cdb02
model: gpt-6.1-sol
verdict: changes
created_at: 2026-11-23T07:24:48.431187737Z
---

## Summary

Complexity: high. This adds a persisted talk subsystem, agent-session coordination, a storage migration, and sheet tabs across the workspace.

Value: high. Scoped conversations and the World inbox need this persistence and runner integration.

Risk of merging it: high. The current code can discard unsent writing and saved title edits, and let the visible conversation diverge from the model's stored conversation.

The implementation is worth building; a substantially smaller change would not meet the persistence, attribution, and multi-turn requirements. The four problems below need fixing before merge.

I reviewed the diff from master through d4fe5283a7fc4ee45d949dd2f4141ba501b3d243, the Done when lines, DESIGN.md's Topics section, the talk-page design, and the runner contract. I checked the collection wiring through memory, IndexedDB, connected storage, world files, and sync, and the topic commands, app service, routes, and sheets. `cd app && bun run check` passed: 1648 tests, no failures, and no type or lint errors. The existing component and stub-server scenarios exercise the reported happy paths and model-call retry.

I also ran two inline stub-server reproductions against the real talk commands, a fault-injected adapter reproduction, and a temporary happy-dom component test derived from the existing app-test harness. These confirmed the four failures below. The component test fails when it expects unsent writing to survive navigation. I did not run a browser, a production model, or a deployed sync Worker. Agent-slip controls, anchored launch triggers, and inspector detail navigation remain the explicitly tracked exclusions; this review does not require those other items to ship here.

## Finding 1: Include a model-raised topic's opening message in its conversation
Recommendation: fix now

`app/src/talk/talk.ts:352-366` creates a fresh agent session when a topic has no session, but supplies only its title and scope. It never adds the topic's existing messages. `raise` stores the model's opening message with `session: null`, so replying to any raised topic sends only the new writer message and the story context. The model cannot see the concern it raised, even though the sheet shows it as part of the conversation. Demo topics with existing turns and no session have the same problem.

I raised a topic with body `The UNIQUE-CLAIM is wrong. Can you explain it?`, then sent `What exactly is wrong?`. The stub received exactly two messages (system and the latest user/context message), and its request contained no `UNIQUE-CLAIM`.

Initialize a new topic session with the already stored conversation, preserving the author roles, before sending the next message. Add a scenario that replies to a model-raised topic and asserts that its opening body reaches the model.

## Finding 2: Do not overwrite a title edit when a running turn finishes
Recommendation: fix now

`app/src/talk/talk.ts:321-322` saves the entire topic object captured before the model call. Meanwhile `rename` independently reads and writes that topic. The topic sheet leaves its title editable during a run (`app/src/app/topics.tsx:620-626`), so this race is reachable through the UI. A completed model response overwrites a successful rename with the old title. The inverse ordering can also let a stale metadata write overwrite newer topic bookkeeping.

I held the second stub response pending, renamed the topic from `Lamp` to `New title`, verified that `rename` returned `New title`, then released the response. Loading the topic after completion returned `Lamp` again.

Coordinate the read-modify-write operations on a topic so a turn's message bookkeeping and metadata edits cannot overwrite one another. Add a regression test for renaming while a model turn is pending.

## Finding 3: Recover a completed answer when saving its talk message fails
Recommendation: fix now

`app/src/talk/talk.ts:322-323` returns a storage error if the final talk-record batch fails, after the runner has already persisted the completed answer and moved its session to `next: user`. There is no durable link saying that this completed run still needs its talk message. `load` then reports `stop: null`, so the UI offers no Try again, and `resume` refuses because the runner is waiting for the writer. Subsequent sends succeed while permanently leaving that answer out of the topic's visible history.

I injected one failure only in the final batch containing a model-authored talk message. `start` returned the save error. After storage recovered, `load` returned only the human message with `stop: null`; `resume` returned `not_ready` / `The session is waiting for the writer: send a message`. A further successful send left the original answer absent from the topic, while the stub's next request still contained it from the agent session.

Make recording a completed run recoverable and idempotent, using the stored run/step rather than calling the model again. Cover a final-message save failure and recovery, including reopening the topic, and verify that the answer and its attribution appear exactly once.

## Finding 4: Preserve unsent title and composer text across tab switches
Recommendation: fix now

`app/src/app/topics.tsx:566` keeps a new topic's title only in `DraftSheet` component state, and `app/src/app/topics.tsx:877` does the same for composer text. Changing routes unmounts those components. The draft store retains only the scope, so returning to a still-open topic tab recreates both fields as empty. This silently discards writing during ordinary navigation, even though DESIGN.md says closing an unsent topic's tab discards it. The composer of an already stored topic has the same lifecycle problem.

A temporary component test using the existing app-test setup opened New topic, typed `My unsent title` and `My unsent message`, navigated to `/inbox`, and returned to the original topic URL without closing its tab. Both field values became empty, and the assertion that the title survived failed.

Keep unsent fields in memory keyed by topic ID for the lifetime of the open tab. Clear them on the appropriate successful send or explicit close, preserving the requirement that a new topic writes nothing to storage before its first Send. Test switching away and back for both a new topic and a stored topic's composer.
