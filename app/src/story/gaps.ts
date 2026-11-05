/**
 * What isn't woven into a story yet. Blank squares are normal in a crossword,
 * so a gap is a prompt, not an error (docs/rebuild/story-model.md,
 * Fluidity), and the wording says what isn't connected yet.
 *
 * The list is a first guess (docs/strategies/structure-first.md, Risks): each
 * kind of gap is one entry in `GAP_RULES`, so adding, dropping or rewording
 * one touches only that entry.
 */

import { isAnswered, type Ref, refExists, type Story } from "./story";
import { refLabel } from "./touches";

export type GapKind =
  | "person_without_drive"
  | "drive_without_actor"
  | "drive_without_origin"
  | "drive_unopposed"
  | "scene_without_pressure"
  | "drive_without_scene"
  | "event_unreferenced"
  | "fact_unconnected"
  | "no_reader_question"
  | "reader_question_never_opens"
  | "reader_question_never_answered"
  | "open_question_without_candidates"
  | "open_question_one_candidate";

/** `ref` is the record the gap is about, or null for the story as a whole. */
export type Gap = { kind: GapKind; ref: Ref | null; message: string };

type Found = { ref: Ref | null; message: string };
type GapRule = { kind: GapKind; find: (story: Story) => Found[] };

const has = (items: readonly { id: string }[], id: string) =>
  items.some((item) => item.id === id);

/** Every Ref held by a fact, open question or candidate. */
function heldRefs(story: Story): Ref[] {
  return [
    ...story.facts.flatMap((fact) => fact.about),
    ...story.openQuestions.flatMap((q) => [
      ...q.about,
      ...q.candidates.flatMap((candidate) => candidate.touches),
    ]),
  ];
}

const refersToEvent = (refs: readonly Ref[], id: string) =>
  refs.some((ref) => ref.kind === "event" && ref.id === id);

const GAP_RULES: readonly GapRule[] = [
  {
    kind: "person_without_drive",
    find: (story) =>
      story.actors
        .filter(
          (actor) =>
            actor.kind === "person" &&
            !story.drives.some((drive) => drive.actorId === actor.id),
        )
        .map((actor) => ({
          ref: { kind: "actor", id: actor.id },
          message: `${refLabel(story, { kind: "actor", id: actor.id })} has no drive yet: what do they want?`,
        })),
  },
  {
    kind: "drive_without_actor",
    find: (story) =>
      story.drives
        .filter(
          (drive) =>
            drive.actorId === null || !has(story.actors, drive.actorId),
        )
        .map((drive) => ({
          ref: { kind: "drive", id: drive.id },
          message: `Nobody holds the drive "${refLabel(story, { kind: "drive", id: drive.id })}" yet.`,
        })),
  },
  {
    kind: "drive_without_origin",
    find: (story) =>
      story.drives
        .filter(
          (drive) =>
            !drive.origins.some((event) => has(story.timeline.events, event)),
        )
        .map((drive) => ({
          ref: { kind: "drive", id: drive.id },
          message: `The drive "${refLabel(story, { kind: "drive", id: drive.id })}" doesn't come from any event yet.`,
        })),
  },
  {
    kind: "drive_unopposed",
    find: (story) => {
      const opposed = new Set(
        story.drives.flatMap((drive) =>
          drive.relations
            .filter(
              (relation) =>
                relation.type === "opposes" && has(story.drives, relation.to),
            )
            .flatMap((relation) => [drive.id, relation.to]),
        ),
      );
      return story.drives
        .filter((drive) => !opposed.has(drive.id))
        .map((drive) => ({
          ref: { kind: "drive", id: drive.id },
          message: `Nothing opposes the drive "${refLabel(story, { kind: "drive", id: drive.id })}" yet.`,
        }));
    },
  },
  {
    kind: "scene_without_pressure",
    find: (story) =>
      story.scenes
        .filter((scene) => !scene.pressures.some((d) => has(story.drives, d)))
        .map((scene) => ({
          ref: { kind: "scene", id: scene.id },
          message: `The scene "${refLabel(story, { kind: "scene", id: scene.id })}" doesn't put any drive under pressure yet.`,
        })),
  },
  {
    kind: "drive_without_scene",
    find: (story) =>
      story.drives
        .filter(
          (drive) =>
            !story.scenes.some((scene) => scene.pressures.includes(drive.id)),
        )
        .map((drive) => ({
          ref: { kind: "drive", id: drive.id },
          message: `No scene puts the drive "${refLabel(story, { kind: "drive", id: drive.id })}" under pressure yet.`,
        })),
  },
  {
    kind: "event_unreferenced",
    find: (story) => {
      const held = heldRefs(story);
      return story.timeline.events
        .filter(
          ({ id }) =>
            !story.drives.some((drive) => drive.origins.includes(id)) &&
            !story.scenes.some((scene) => scene.depicts.includes(id)) &&
            !story.timeline.constraints.some(
              (c) => (c.a === id || c.b === id) && c.a !== c.b,
            ) &&
            !story.causes.some(
              (c) =>
                (c.cause === id || c.effect === id) && c.cause !== c.effect,
            ) &&
            !refersToEvent(held, id),
        )
        .map(({ id }) => ({
          ref: { kind: "event", id },
          message: `The event "${refLabel(story, { kind: "event", id })}" isn't woven in yet: no drive, scene, other event, fact or question refers to it.`,
        }));
    },
  },
  {
    kind: "fact_unconnected",
    find: (story) => {
      const held = heldRefs(story);
      return story.facts
        .filter(
          (fact) =>
            !fact.about.some(
              (ref) =>
                !(ref.kind === "fact" && ref.id === fact.id) &&
                refExists(story, ref),
            ) &&
            // A fact about itself doesn't count as referred to.
            !held.some(
              (ref) =>
                ref.kind === "fact" &&
                ref.id === fact.id &&
                !fact.about.includes(ref),
            ),
        )
        .map((fact) => ({
          ref: { kind: "fact", id: fact.id },
          message: `The fact "${refLabel(story, { kind: "fact", id: fact.id })}" isn't woven in yet: it's about nothing and nothing refers to it.`,
        }));
    },
  },
  {
    kind: "no_reader_question",
    find: (story) =>
      story.scenes.length > 0 && story.readerQuestions.length === 0
        ? [
            {
              ref: null,
              message:
                "There are scenes but no reader question yet: what is the reader waiting to find out?",
            },
          ]
        : [],
  },
  {
    kind: "reader_question_never_opens",
    find: (story) =>
      story.readerQuestions
        .filter((q) => q.opensAt === undefined || !has(story.scenes, q.opensAt))
        .map((q) => ({
          ref: { kind: "readerQuestion", id: q.id },
          message: `No scene opens the reader question "${refLabel(story, { kind: "readerQuestion", id: q.id })}" yet.`,
        })),
  },
  {
    kind: "reader_question_never_answered",
    find: (story) =>
      story.readerQuestions
        .filter(
          (q) => q.answeredAt === undefined || !has(story.scenes, q.answeredAt),
        )
        .map((q) => ({
          ref: { kind: "readerQuestion", id: q.id },
          message: `No scene answers the reader question "${refLabel(story, { kind: "readerQuestion", id: q.id })}" yet.`,
        })),
  },
  {
    kind: "open_question_without_candidates",
    find: (story) =>
      unanswered(story)
        .filter((q) => q.candidates.length === 0)
        .map((q) => ({
          ref: { kind: "openQuestion", id: q.id },
          message: `The open question "${refLabel(story, { kind: "openQuestion", id: q.id })}" has no candidate answers yet.`,
        })),
  },
  {
    kind: "open_question_one_candidate",
    find: (story) =>
      unanswered(story)
        .filter((q) => q.candidates.length === 1)
        .map((q) => ({
          ref: { kind: "openQuestion", id: q.id },
          message: `The open question "${refLabel(story, { kind: "openQuestion", id: q.id })}" has one candidate answer so far: is there another worth weighing?`,
        })),
  },
];

const unanswered = (story: Story) =>
  story.openQuestions.filter((q) => !isAnswered(q));

/** What isn't woven in yet, in `GAP_RULES` order. */
export function storyGaps(story: Story): Gap[] {
  return GAP_RULES.flatMap(({ kind, find }) =>
    find(story).map(({ ref, message }) => ({ kind, ref, message })),
  );
}
