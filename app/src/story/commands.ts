/**
 * Typed edits to a story file (`./story.ts`). An agent, the CLI, tests and any
 * later UI change a story only through these, so they all share one path.
 *
 * A command holds what it's told. It is refused only when it is malformed: a
 * blank or duplicate ID, an ID that doesn't exist in its target or in a link
 * it sets, a drive related to itself or an event that causes itself, or a
 * relation or cause already recorded. Anything else is kept, contradictions
 * included: a timeline edit that contradicts the rest of story time is
 * applied, and the problems it added come back with the story; a cycle of
 * causes is kept too (docs/rebuild/story-model.md, Fluidity).
 *
 * A link can only point at something that exists, so add a record first,
 * unconnected if need be. Removing a record removes every reference to it.
 */

import { err, ok, type Result } from "neverthrow";
import type { TimelineProblem } from "../time/chronology";
import {
  applyTimelineCommandKeepingProblems,
  type TimelineCommand,
} from "../time/commands";
import type { EventId } from "../time/timeline";
import {
  type ActorKind,
  type DriveRelationType,
  describeRef,
  GAP_MARK_KEY,
  GAP_SUBJECTS,
  type GapKind,
  isAnswered,
  type OpenQuestion,
  type Ref,
  refExists,
  type SceneLinkKind,
  type Story,
  type StoryError,
} from "./story";

export type StoryCommand =
  | { type: "setPremise"; premise: string }
  | {
      type: "addActor";
      id: string;
      name: string;
      kind: ActorKind;
      notes: string;
    }
  | {
      type: "updateActor";
      id: string;
      name?: string;
      kind?: ActorKind;
      notes?: string;
    }
  /** The actor's drives are kept, with `actorId` set to null. */
  | { type: "removeActor"; id: string }
  | {
      type: "addDrive";
      id: string;
      actorId: string | null;
      want: string;
      stakes: string;
      method: string;
    }
  | {
      type: "updateDrive";
      id: string;
      actorId?: string | null;
      want?: string;
      stakes?: string;
      method?: string;
    }
  | { type: "removeDrive"; id: string }
  /** The events that created the drive. */
  | { type: "setDriveOrigins"; id: string; origins: EventId[] }
  /** Stored on `from`. Two drives have at most one relation, either way round. */
  | {
      type: "relateDrives";
      from: string;
      to: string;
      relation: DriveRelationType;
    }
  /** Removes the relation between `a` and `b`, whichever drive holds it. */
  | { type: "unrelateDrives"; a: string; b: string }
  | { type: "addFact"; id: string; text: string; about: Ref[] }
  | { type: "updateFact"; id: string; text?: string; about?: Ref[] }
  | { type: "removeFact"; id: string }
  | { type: "addReaderQuestion"; id: string; question: string }
  | { type: "updateReaderQuestion"; id: string; question: string }
  | { type: "removeReaderQuestion"; id: string }
  /** Scene IDs; `null` clears. */
  | {
      type: "setReaderQuestionScenes";
      id: string;
      opensAt: string | null;
      answeredAt: string | null;
    }
  /** Added at the end of the telling order. */
  | { type: "addScene"; id: string; title: string; summary: string }
  | { type: "updateScene"; id: string; title?: string; summary?: string }
  | { type: "removeScene"; id: string }
  /** Moves the scene to `index` in the telling order. */
  | { type: "moveScene"; id: string; index: number }
  | { type: "setSceneActors"; id: string; actors: string[] }
  | { type: "setSceneEvents"; id: string; depicts: EventId[] }
  /** The drives the scene puts under pressure. */
  | { type: "setScenePressures"; id: string; pressures: string[] }
  /** The records the scene reveals, implies or withholds (`SceneLinkKind`). */
  | { type: "setSceneLinks"; id: string; how: SceneLinkKind; refs: Ref[] }
  | {
      type: "addOpenQuestion";
      id: string;
      question: string;
      about: Ref[];
      conflict: boolean;
    }
  | {
      type: "updateOpenQuestion";
      id: string;
      question?: string;
      about?: Ref[];
      conflict?: boolean;
    }
  | { type: "removeOpenQuestion"; id: string }
  | {
      type: "addCandidate";
      questionId: string;
      id: string;
      answer: string;
      touches: Ref[];
    }
  | {
      type: "updateCandidate";
      questionId: string;
      id: string;
      answer?: string;
      touches?: Ref[];
    }
  /**
   * Clears the question's answer if this was the chosen candidate, keeping it
   * as superseded.
   */
  | { type: "removeCandidate"; questionId: string; id: string }
  /**
   * Records the chosen candidate, and clears the question's working mark, and
   * changes nothing else: whoever answers makes what the answer implies as
   * commands of their own. A different answer already chosen is kept as
   * superseded, with what replaced it.
   */
  | { type: "answerOpenQuestion"; id: string; candidateId: string }
  /** The answer is kept as superseded, with nothing in its place. */
  | { type: "unanswerOpenQuestion"; id: string }
  /**
   * Whether the question's candidates are being weighed. The readable form
   * then shows the question in one line, without them. Refused for an
   * answered question.
   */
  | { type: "setOpenQuestionWorking"; id: string; working: boolean }
  | { type: "addEvent"; id: EventId; label: string; summary: string }
  | { type: "describeEvent"; id: EventId; label?: string; summary?: string }
  /**
   * `effect` happened because of `cause`. A cycle of causes, or an effect
   * placed before its cause, is kept and listed by `storyContradictions`.
   */
  | { type: "addCause"; cause: EventId; effect: EventId }
  | { type: "removeCause"; cause: EventId; effect: EventId }
  /**
   * Also removes the event's positions, constraints, correspondences and
   * causes.
   */
  | { type: "removeEvent"; id: EventId }
  /**
   * Marks one gap on one record (or, with `ref` null, on the whole story) as
   * judged fine, so `storyGaps` stops listing it. Marking it again replaces
   * the reason.
   */
  | { type: "markGapDeliberate"; gap: GapKind; ref: Ref | null; reason: string }
  | { type: "unmarkGapDeliberate"; gap: GapKind; ref: Ref | null }
  | Extract<
      TimelineCommand,
      { type: "setPosition" | "constrain" | "removeConstraint" }
    >;

export type StoryCommandType = StoryCommand["type"];

/** The story after the command, and the timeline problems the command added. */
export type StoryChange = { story: Story; problems: TimelineProblem[] };

type Refusal = Extract<StoryError, { command: string }>["kind"];
type Checked<T> = Result<T, StoryError>;

/** Applies one command. It never changes `story`. */
export function applyStoryCommand(
  story: Story,
  command: StoryCommand,
): Result<StoryChange, StoryError> {
  const refuse = (kind: Refusal, message: string) =>
    err<never, StoryError>({ kind, command: command.type, message });
  const kept = (next: Story): Checked<StoryChange> =>
    ok({ story: next, problems: [] });

  /** Refuses the first ID that doesn't exist. */
  const resolve = (
    what: string,
    ids: readonly string[],
    exists: (id: string) => boolean,
  ): Checked<null> => {
    const missing = ids.find((id) => !exists(id));
    return missing === undefined
      ? ok(null)
      : refuse("unknown_id", `${what} ${missing} does not exist`);
  };
  const resolveRefs = (refs: readonly Ref[]): Checked<null> => {
    const missing = refs.find((ref) => !refExists(story, ref));
    return missing === undefined
      ? ok(null)
      : refuse("unknown_id", `${describeRef(missing)} does not exist`);
  };
  /** Refuses a record that doesn't exist or isn't the kind the gap is about. */
  const gapTarget = (gap: GapKind, ref: Ref | null): Checked<null> => {
    const subject = GAP_SUBJECTS[gap];
    if (ref === null || subject === null) {
      return ref === subject
        ? ok(null)
        : refuse(
            "invalid_command",
            subject === null
              ? `${gap} is about the whole story, not a record`
              : `${gap} is about a ${subject}`,
          );
    }
    return ref.kind !== subject
      ? refuse("invalid_command", `${gap} is about a ${subject}`)
      : resolveRefs([ref]);
  };
  const isActor = (id: string) => has(story.actors, id);
  const isDrive = (id: string) => has(story.drives, id);
  const isScene = (id: string) => has(story.scenes, id);
  const isEvent = (id: string) => has(story.timeline.events, id);
  /** Refuses a blank ID or one already in `items`. */
  const fresh = (
    what: string,
    items: readonly { id: string }[],
    id: string,
  ): Checked<null> =>
    id.trim() === ""
      ? refuse("invalid_command", `${what} ID is empty`)
      : has(items, id)
        ? refuse("duplicate_id", `${what} ${id} already exists`)
        : ok(null);
  const existing = <T extends { id: string }>(
    what: string,
    items: readonly T[],
    id: string,
  ): Checked<T> => {
    const found = items.find((item) => item.id === id);
    return found === undefined
      ? refuse("unknown_id", `${what} ${id} does not exist`)
      : ok(found);
  };
  const question = (id: string) =>
    existing("open question", story.openQuestions, id);
  const withQuestion = (
    id: string,
    change: (q: OpenQuestion) => OpenQuestion,
  ) =>
    kept({
      ...story,
      openQuestions: replace(story.openQuestions, id, change),
    });
  /** Applies a timeline command, keeping the problems it adds. */
  const onTimeline = (timelineCommand: TimelineCommand): Checked<StoryChange> =>
    applyTimelineCommandKeepingProblems(story.timeline, timelineCommand, [])
      .mapErr(
        ({ message }): StoryError => ({
          kind: "invalid_command",
          command: command.type,
          message,
        }),
      )
      .map(
        ({ timeline, problems }): StoryChange => ({
          story: { ...story, timeline },
          problems,
        }),
      );

  switch (command.type) {
    case "setPremise":
      return kept({ ...story, premise: command.premise });

    case "addActor": {
      const { id, name, kind, notes } = command;
      return fresh("actor", story.actors, id).andThen(() =>
        kept({
          ...story,
          actors: [...story.actors, { id, name, kind, notes }],
        }),
      );
    }

    case "updateActor":
      return existing("actor", story.actors, command.id).andThen((actor) =>
        kept({
          ...story,
          actors: replace(story.actors, actor.id, () => ({
            ...actor,
            name: command.name ?? actor.name,
            kind: command.kind ?? actor.kind,
            notes: command.notes ?? actor.notes,
          })),
        }),
      );

    case "removeActor": {
      const { id } = command;
      return existing("actor", story.actors, id).andThen(() =>
        kept(
          withoutRefs(
            {
              ...story,
              actors: story.actors.filter((actor) => actor.id !== id),
              drives: story.drives.map((drive) =>
                drive.actorId === id ? { ...drive, actorId: null } : drive,
              ),
              scenes: story.scenes.map((scene) => ({
                ...scene,
                actors: without(scene.actors, id),
              })),
            },
            (ref) => ref.kind === "actor" && ref.id === id,
          ),
        ),
      );
    }

    case "addDrive": {
      const { id, actorId, want, stakes, method } = command;
      return fresh("drive", story.drives, id)
        .andThen(() =>
          resolve("actor", actorId === null ? [] : [actorId], isActor),
        )
        .andThen(() =>
          kept({
            ...story,
            drives: [
              ...story.drives,
              { id, actorId, want, stakes, method, origins: [], relations: [] },
            ],
          }),
        );
    }

    case "updateDrive": {
      const { actorId } = command;
      return existing("drive", story.drives, command.id)
        .andThen((drive) =>
          resolve(
            "actor",
            actorId === undefined || actorId === null ? [] : [actorId],
            isActor,
          ).map(() => drive),
        )
        .andThen((drive) =>
          kept({
            ...story,
            drives: replace(story.drives, drive.id, () => ({
              ...drive,
              actorId: actorId === undefined ? drive.actorId : actorId,
              want: command.want ?? drive.want,
              stakes: command.stakes ?? drive.stakes,
              method: command.method ?? drive.method,
            })),
          }),
        );
    }

    case "removeDrive": {
      const { id } = command;
      return existing("drive", story.drives, id).andThen(() =>
        kept(
          withoutRefs(
            {
              ...story,
              drives: story.drives
                .filter((drive) => drive.id !== id)
                .map((drive) => ({
                  ...drive,
                  relations: drive.relations.filter(({ to }) => to !== id),
                })),
              scenes: story.scenes.map((scene) => ({
                ...scene,
                pressures: without(scene.pressures, id),
              })),
            },
            (ref) => ref.kind === "drive" && ref.id === id,
          ),
        ),
      );
    }

    case "setDriveOrigins":
      return existing("drive", story.drives, command.id)
        .andThen(() => resolve("event", command.origins, isEvent))
        .andThen(() =>
          kept({
            ...story,
            drives: replace(story.drives, command.id, (drive) => ({
              ...drive,
              origins: command.origins,
            })),
          }),
        );

    case "relateDrives": {
      const { from, to, relation } = command;
      return resolve("drive", [from, to], isDrive)
        .andThen(() =>
          from === to
            ? refuse("self_relation", `drive ${from} cannot relate to itself`)
            : relationBetween(story, from, to)
              ? refuse(
                  "relation_exists",
                  `drives ${from} and ${to} are already related`,
                )
              : ok(null),
        )
        .andThen(() =>
          kept({
            ...story,
            drives: replace(story.drives, from, (drive) => ({
              ...drive,
              relations: [...drive.relations, { to, type: relation }],
            })),
          }),
        );
    }

    case "unrelateDrives": {
      const { a, b } = command;
      return resolve("drive", [a, b], isDrive)
        .andThen(() =>
          relationBetween(story, a, b)
            ? ok(null)
            : refuse("invalid_command", `drives ${a} and ${b} are not related`),
        )
        .andThen(() =>
          kept({
            ...story,
            drives: story.drives.map((drive) =>
              drive.id === a || drive.id === b
                ? {
                    ...drive,
                    relations: drive.relations.filter(
                      ({ to }) => to !== (drive.id === a ? b : a),
                    ),
                  }
                : drive,
            ),
          }),
        );
    }

    case "addFact": {
      const { id, text, about } = command;
      return fresh("fact", story.facts, id)
        .andThen(() => resolveRefs(about))
        .andThen(() =>
          kept({ ...story, facts: [...story.facts, { id, text, about }] }),
        );
    }

    case "updateFact":
      return existing("fact", story.facts, command.id)
        .andThen((fact) => resolveRefs(command.about ?? []).map(() => fact))
        .andThen((fact) =>
          kept({
            ...story,
            facts: replace(story.facts, fact.id, () => ({
              ...fact,
              text: command.text ?? fact.text,
              about: command.about ?? fact.about,
            })),
          }),
        );

    case "removeFact": {
      const { id } = command;
      return existing("fact", story.facts, id).andThen(() =>
        kept(
          withoutRefs(
            { ...story, facts: story.facts.filter((fact) => fact.id !== id) },
            (ref) => ref.kind === "fact" && ref.id === id,
          ),
        ),
      );
    }

    case "addReaderQuestion": {
      const { id, question } = command;
      return fresh("reader question", story.readerQuestions, id).andThen(() =>
        kept({
          ...story,
          readerQuestions: [...story.readerQuestions, { id, question }],
        }),
      );
    }

    case "updateReaderQuestion":
      return existing(
        "reader question",
        story.readerQuestions,
        command.id,
      ).andThen(() =>
        kept({
          ...story,
          readerQuestions: replace(story.readerQuestions, command.id, (q) => ({
            ...q,
            question: command.question,
          })),
        }),
      );

    case "removeReaderQuestion": {
      const { id } = command;
      return existing("reader question", story.readerQuestions, id).andThen(
        () =>
          kept(
            withoutRefs(
              {
                ...story,
                readerQuestions: story.readerQuestions.filter(
                  (q) => q.id !== id,
                ),
              },
              (ref) => ref.kind === "readerQuestion" && ref.id === id,
            ),
          ),
      );
    }

    case "setReaderQuestionScenes": {
      const { id, opensAt, answeredAt } = command;
      return existing("reader question", story.readerQuestions, id)
        .andThen(() =>
          resolve(
            "scene",
            [opensAt, answeredAt].filter((scene) => scene !== null),
            isScene,
          ),
        )
        .andThen(() =>
          kept({
            ...story,
            readerQuestions: replace(story.readerQuestions, id, (q) => ({
              id: q.id,
              question: q.question,
              ...(opensAt === null ? {} : { opensAt }),
              ...(answeredAt === null ? {} : { answeredAt }),
            })),
          }),
        );
    }

    case "addScene": {
      const { id, title, summary } = command;
      return fresh("scene", story.scenes, id)
        .andThen(() =>
          // The ID names the scene's prose file.
          /^\.*$|[/\\]/.test(id)
            ? refuse(
                "invalid_command",
                `scene ID ${id} can't name a file: use letters, digits and dashes`,
              )
            : ok(null),
        )
        .andThen(() =>
          kept({
            ...story,
            scenes: [
              ...story.scenes,
              {
                id,
                title,
                summary,
                actors: [],
                depicts: [],
                pressures: [],
                reveals: [],
                implies: [],
                withholds: [],
              },
            ],
          }),
        );
    }

    case "updateScene":
      return existing("scene", story.scenes, command.id).andThen((scene) =>
        kept({
          ...story,
          scenes: replace(story.scenes, scene.id, () => ({
            ...scene,
            title: command.title ?? scene.title,
            summary: command.summary ?? scene.summary,
          })),
        }),
      );

    case "removeScene": {
      const { id } = command;
      return existing("scene", story.scenes, id).andThen(() =>
        kept(
          withoutRefs(
            {
              ...story,
              scenes: story.scenes.filter((scene) => scene.id !== id),
              readerQuestions: story.readerQuestions.map(
                ({ opensAt, answeredAt, ...q }) => ({
                  ...q,
                  ...(opensAt === undefined || opensAt === id
                    ? {}
                    : { opensAt }),
                  ...(answeredAt === undefined || answeredAt === id
                    ? {}
                    : { answeredAt }),
                }),
              ),
            },
            (ref) => ref.kind === "scene" && ref.id === id,
          ),
        ),
      );
    }

    case "moveScene": {
      const { id, index } = command;
      return existing("scene", story.scenes, id).andThen((scene) => {
        if (
          !Number.isInteger(index) ||
          index < 0 ||
          index >= story.scenes.length
        ) {
          return refuse(
            "invalid_command",
            `index must be a whole number from 0 to ${story.scenes.length - 1}`,
          );
        }
        const others = story.scenes.filter((s) => s.id !== id);
        return kept({
          ...story,
          scenes: [...others.slice(0, index), scene, ...others.slice(index)],
        });
      });
    }

    case "setSceneActors":
      return existing("scene", story.scenes, command.id)
        .andThen(() => resolve("actor", command.actors, isActor))
        .andThen(() =>
          kept({
            ...story,
            scenes: replace(story.scenes, command.id, (scene) => ({
              ...scene,
              actors: command.actors,
            })),
          }),
        );

    case "setSceneEvents":
      return existing("scene", story.scenes, command.id)
        .andThen(() => resolve("event", command.depicts, isEvent))
        .andThen(() =>
          kept({
            ...story,
            scenes: replace(story.scenes, command.id, (scene) => ({
              ...scene,
              depicts: command.depicts,
            })),
          }),
        );

    case "setScenePressures":
      return existing("scene", story.scenes, command.id)
        .andThen(() => resolve("drive", command.pressures, isDrive))
        .andThen(() =>
          kept({
            ...story,
            scenes: replace(story.scenes, command.id, (scene) => ({
              ...scene,
              pressures: command.pressures,
            })),
          }),
        );

    case "setSceneLinks":
      return existing("scene", story.scenes, command.id)
        .andThen(() => resolveRefs(command.refs))
        .andThen(() =>
          kept({
            ...story,
            scenes: replace(story.scenes, command.id, (scene) => ({
              ...scene,
              [command.how]: command.refs,
            })),
          }),
        );

    case "addOpenQuestion": {
      const { id, question, about, conflict } = command;
      return fresh("open question", story.openQuestions, id)
        .andThen(() => resolveRefs(about))
        .andThen(() =>
          kept({
            ...story,
            openQuestions: [
              ...story.openQuestions,
              { id, question, about, candidates: [], conflict },
            ],
          }),
        );
    }

    case "updateOpenQuestion":
      return question(command.id)
        .andThen((q) => resolveRefs(command.about ?? []).map(() => q))
        .andThen((q) =>
          withQuestion(q.id, () => ({
            ...q,
            question: command.question ?? q.question,
            about: command.about ?? q.about,
            conflict: command.conflict ?? q.conflict,
          })),
        );

    case "removeOpenQuestion": {
      const { id } = command;
      return question(id).andThen(() =>
        kept(
          withoutRefs(
            {
              ...story,
              openQuestions: story.openQuestions.filter((q) => q.id !== id),
            },
            (ref) =>
              ref.kind === "candidate"
                ? ref.questionId === id
                : ref.kind === "openQuestion" && ref.id === id,
          ),
        ),
      );
    }

    case "addCandidate": {
      const { questionId, id, answer, touches } = command;
      return question(questionId)
        .andThen((q) => fresh("candidate", q.candidates, id).map(() => q))
        .andThen((q) => resolveRefs(touches).map(() => q))
        .andThen((q) =>
          withQuestion(q.id, () => ({
            ...q,
            candidates: [...q.candidates, { id, answer, touches }],
          })),
        );
    }

    case "updateCandidate": {
      const { questionId, id } = command;
      return question(questionId)
        .andThen((q) => existing("candidate", q.candidates, id))
        .andThen((candidate) =>
          resolveRefs(command.touches ?? []).map(() => candidate),
        )
        .andThen((candidate) =>
          withQuestion(questionId, (q) => ({
            ...q,
            candidates: replace(q.candidates, id, () => ({
              ...candidate,
              answer: command.answer ?? candidate.answer,
              touches: command.touches ?? candidate.touches,
            })),
          })),
        );
    }

    case "removeCandidate": {
      const { questionId, id } = command;
      return question(questionId)
        .andThen((q) => existing("candidate", q.candidates, id))
        .andThen(() => {
          const removed = withQuestion(questionId, (q) => {
            const { answer, ...rest } = q.answer === id ? superseding(q) : q;
            return {
              ...rest,
              candidates: q.candidates.filter((c) => c.id !== id),
              ...(answer === undefined || answer === id ? {} : { answer }),
            };
          });
          return removed.map(({ story: next }) => ({
            story: withoutRefs(
              next,
              (ref) =>
                ref.kind === "candidate" &&
                ref.questionId === questionId &&
                ref.id === id,
            ),
            problems: [],
          }));
        });
    }

    case "answerOpenQuestion":
      return question(command.id)
        .andThen((q) =>
          existing("candidate", q.candidates, command.candidateId),
        )
        .andThen(() =>
          withQuestion(command.id, (q) => {
            const { working: _, ...rest } =
              q.answer === command.candidateId
                ? q
                : superseding(q, command.candidateId);
            return { ...rest, answer: command.candidateId };
          }),
        );

    case "unanswerOpenQuestion":
      return question(command.id).andThen(() =>
        withQuestion(command.id, (q) => {
          const { answer: _, ...rest } = superseding(q);
          return rest;
        }),
      );

    case "setOpenQuestionWorking":
      return question(command.id).andThen((q) =>
        isAnswered(q)
          ? refuse(
              "invalid_command",
              `open question ${q.id} is answered: unanswer it to weigh its candidates again`,
            )
          : withQuestion(command.id, ({ working: _, ...q }) =>
              command.working ? { ...q, working: true } : q,
            ),
      );

    case "addEvent": {
      const { id, label, summary } = command;
      return fresh("event", story.timeline.events, id)
        .andThen(() => onTimeline({ type: "addEvent", id, label }))
        .map(({ story: next, problems }) => ({
          story: {
            ...next,
            timeline: {
              ...next.timeline,
              events: replace(next.timeline.events, id, (event) => ({
                ...event,
                summary,
              })),
            },
          },
          problems,
        }));
    }

    case "describeEvent":
      return existing("event", story.timeline.events, command.id).andThen(
        (event) =>
          kept({
            ...story,
            timeline: {
              ...story.timeline,
              events: replace(story.timeline.events, event.id, () => ({
                ...event,
                label: command.label ?? event.label,
                summary: command.summary ?? event.summary,
              })),
            },
          }),
      );

    case "removeEvent": {
      const { id } = command;
      const { timeline } = story;
      return existing("event", timeline.events, id).andThen(() =>
        kept(
          withoutRefs(
            {
              ...story,
              drives: story.drives.map((drive) => ({
                ...drive,
                origins: without(drive.origins, id),
              })),
              scenes: story.scenes.map((scene) => ({
                ...scene,
                depicts: without(scene.depicts, id),
              })),
              causes: story.causes.filter(
                ({ cause, effect }) => cause !== id && effect !== id,
              ),
              timeline: {
                ...timeline,
                events: timeline.events.filter((event) => event.id !== id),
                positions: timeline.positions.filter((p) => p.event !== id),
                constraints: timeline.constraints.filter(
                  ({ a, b }) => a !== id && b !== id,
                ),
                correspondences: timeline.correspondences.filter(
                  ({ from, to }) => from !== id && to !== id,
                ),
              },
            },
            (ref) => ref.kind === "event" && ref.id === id,
          ),
        ),
      );
    }

    case "addCause": {
      const { cause, effect } = command;
      return resolve("event", [cause, effect], isEvent)
        .andThen(() =>
          cause === effect
            ? refuse("self_relation", `event ${cause} cannot cause itself`)
            : hasCause(story, cause, effect)
              ? refuse(
                  "relation_exists",
                  `event ${cause} already causes ${effect}`,
                )
              : ok(null),
        )
        .andThen(() =>
          kept({ ...story, causes: [...story.causes, { cause, effect }] }),
        );
    }

    case "removeCause": {
      const { cause, effect } = command;
      return resolve("event", [cause, effect], isEvent)
        .andThen(() =>
          hasCause(story, cause, effect)
            ? ok(null)
            : refuse(
                "invalid_command",
                `event ${cause} is not recorded as causing ${effect}`,
              ),
        )
        .andThen(() =>
          kept({
            ...story,
            causes: story.causes.filter(
              (c) => c.cause !== cause || c.effect !== effect,
            ),
          }),
        );
    }

    case "markGapDeliberate": {
      const { gap, ref, reason } = command;
      const mark = { gap, ref, reason };
      return gapTarget(gap, ref)
        .andThen(() =>
          reason.trim() === ""
            ? refuse("invalid_command", "a deliberate gap needs a reason")
            : ok(null),
        )
        .andThen(() =>
          kept({
            ...story,
            deliberateGaps: [
              ...story.deliberateGaps.filter((m) => !sameMark(m, mark)),
              mark,
            ],
          }),
        );
    }

    case "unmarkGapDeliberate": {
      const { gap, ref } = command;
      return gapTarget(gap, ref)
        .andThen(() =>
          story.deliberateGaps.some((m) => sameMark(m, command))
            ? ok(null)
            : refuse(
                "invalid_command",
                `${gap} on ${ref === null ? "the story" : describeRef(ref)} is not marked deliberate`,
              ),
        )
        .andThen(() =>
          kept({
            ...story,
            deliberateGaps: story.deliberateGaps.filter(
              (m) => !sameMark(m, command),
            ),
          }),
        );
    }

    case "setPosition":
      return resolve("event", [command.event], isEvent).andThen(() =>
        onTimeline(command),
      );

    case "constrain":
      return fresh("constraint", story.timeline.constraints, command.id)
        .andThen(() => resolve("event", [command.a, command.b], isEvent))
        .andThen(() => onTimeline(command));

    case "removeConstraint":
      return existing(
        "constraint",
        story.timeline.constraints,
        command.id,
      ).andThen(() => onTimeline(command));
  }
}

const has = (items: readonly { id: string }[], id: string) =>
  items.some((item) => item.id === id);

const without = (items: readonly string[], id: string) =>
  items.filter((item) => item !== id);

function replace<T extends { id: string }>(
  items: readonly T[],
  id: string,
  change: (item: T) => T,
): T[] {
  return items.map((item) => (item.id === id ? change(item) : item));
}

const sameMark = (
  a: { gap: GapKind; ref: Ref | null },
  b: { gap: GapKind; ref: Ref | null },
) => JSON.stringify(GAP_MARK_KEY(a)) === JSON.stringify(GAP_MARK_KEY(b));

/**
 * The question with its chosen answer, if it has one, added to what it
 * superseded, replaced by `by` if given. The answer itself is left for the
 * caller to change.
 */
function superseding(q: OpenQuestion, by?: string): OpenQuestion {
  const chosen = q.candidates.find((c) => c.id === q.answer);
  if (chosen === undefined) return q;
  return {
    ...q,
    superseded: [
      ...(q.superseded ?? []),
      {
        candidate: chosen.id,
        answer: chosen.answer,
        ...(by === undefined ? {} : { by }),
      },
    ],
  };
}

const hasCause = (story: Story, cause: string, effect: string) =>
  story.causes.some((c) => c.cause === cause && c.effect === effect);

/** Whether either drive holds a relation to the other. */
function relationBetween(story: Story, a: string, b: string): boolean {
  return story.drives.some(
    (drive) =>
      (drive.id === a && drive.relations.some(({ to }) => to === b)) ||
      (drive.id === b && drive.relations.some(({ to }) => to === a)),
  );
}

/**
 * Drops the refs `gone` matches from every fact, scene link, open question and
 * candidate, and the deliberate gaps on them.
 */
function withoutRefs(story: Story, gone: (ref: Ref) => boolean): Story {
  const kept = (refs: readonly Ref[]) => refs.filter((ref) => !gone(ref));
  return {
    ...story,
    deliberateGaps: story.deliberateGaps.filter(
      ({ ref }) => ref === null || !gone(ref),
    ),
    facts: story.facts.map((fact) => ({ ...fact, about: kept(fact.about) })),
    scenes: story.scenes.map((scene) => ({
      ...scene,
      reveals: kept(scene.reveals),
      implies: kept(scene.implies),
      withholds: kept(scene.withholds),
    })),
    openQuestions: story.openQuestions.map((q) => ({
      ...q,
      about: kept(q.about),
      candidates: q.candidates.map((candidate) => ({
        ...candidate,
        touches: kept(candidate.touches),
      })),
    })),
  };
}
