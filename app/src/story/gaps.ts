/**
 * What isn't woven into a story yet. Blank squares are normal in a crossword,
 * so a gap is an optional prompt, not an error (docs/rebuild/story-model.md,
 * Fluidity), and the wording says what isn't connected yet. A gap is never a
 * reason to delete: each one asks for something to be added or linked, and a
 * kind whose only honest fix is cutting true story doesn't belong here. A
 * person with no drive was one (sessions deleted minor characters to clear
 * it), so it is gone, and so is a fact linked to nothing (a world fact
 * standing alone is normal, and listing each one pushed a writer to link
 * every fact to clear the list); see `RETIRED_GAP_KINDS` in `./story.ts`.
 *
 * The list is a first guess (docs/strategies/structure-first.md, Risks): each
 * kind of gap is one entry in `GAP_RULES`, so adding, dropping or rewording
 * one touches only that entry (and its name in `GAP_KINDS`). A gap the team
 * has judged fine can be marked deliberate in the story, and isn't listed.
 */

import {
  GAP_MARK_KEY,
  type GapKind,
  questionState,
  type Ref,
  type Story,
} from "./story";
import { refLabel } from "./touches";

export type { GapKind };

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
          message: `The event "${refLabel(story, { kind: "event", id })}" isn't linked to anything yet: no drive, scene, other event, fact or question refers to it. Link it to what it bears on, if anything; it can also stand on its own.`,
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

/**
 * The questions that are still an author task. One left open for the reader
 * isn't, and a decided question nobody has revealed rests where it is:
 * unclosed threads are normal.
 */
const unanswered = (story: Story) =>
  story.openQuestions.filter(
    (q) => questionState(story, q).state === "undecided",
  );

/** Every gap found, marked deliberate or not, in `GAP_RULES` order. */
function foundGaps(story: Story): Gap[] {
  return GAP_RULES.flatMap(({ kind, find }) =>
    find(story).map(({ ref, message }) => ({ kind, ref, message })),
  );
}

const markKey = (gap: Gap) =>
  JSON.stringify(GAP_MARK_KEY({ gap: gap.kind, ref: gap.ref }));

/**
 * What isn't woven in yet, in `GAP_RULES` order, leaving out the gaps the
 * story marks as deliberate.
 */
export function storyGaps(story: Story): Gap[] {
  const marked = new Set(
    story.deliberateGaps.map((mark) => JSON.stringify(GAP_MARK_KEY(mark))),
  );
  return foundGaps(story).filter((gap) => !marked.has(markKey(gap)));
}

/** The gaps `storyGaps` leaves out because they're marked deliberate. */
export function deliberateGaps(story: Story): { gap: Gap; reason: string }[] {
  const reasons = new Map(
    story.deliberateGaps.map((mark) => [
      JSON.stringify(GAP_MARK_KEY(mark)),
      mark.reason,
    ]),
  );
  return foundGaps(story).flatMap((gap) => {
    const reason = reasons.get(markKey(gap));
    return reason === undefined ? [] : [{ gap, reason }];
  });
}
