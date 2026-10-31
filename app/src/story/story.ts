/**
 * A story sketch held in one file a person can read and git can diff
 * (docs/rebuild/story-model.md, decision worldcrafter-2y4g), and the parser
 * and writer for it.
 *
 * Anything here may be unconnected, unanswered or contradictory: blank squares
 * are normal. The parser checks only that a file has the right shape and that
 * IDs are unique. Whether references resolve is a question for the commands
 * and queries, so a story with a dangling reference still loads.
 *
 * Actors and scenes are plain records here, not documents, and a scene has no
 * place in story time: `depicts` is its only link to events.
 */

import { err, ok, Result } from "neverthrow";
import type { JsonValue } from "../storage/types";
import {
  type EventId,
  emptyTimeline,
  parseTimeline,
  type Timeline,
} from "../time/timeline";

export const STORY_VERSION = 1;

export type ActorKind = "person" | "organization";

export type Actor = {
  id: string;
  name: string;
  kind: ActorKind;
  notes: string;
};

export type DriveRelationType = "opposes" | "allies" | "competes";

/** Stored on one drive of the pair only. */
export type DriveRelation = { to: string; type: DriveRelationType };

/** An actor's want. A motive can come before its owner, so `actorId` may be null. */
export type Drive = {
  id: string;
  actorId: string | null;
  want: string;
  stakes: string;
  method: string;
  /** The events that created this drive. */
  origins: EventId[];
  relations: DriveRelation[];
};

/** A plain statement about the world. Unlike the app's facts, it doesn't change at events. */
export type Fact = { id: string; text: string; about: Ref[] };

/** What the reader is waiting for. */
export type ReaderQuestion = {
  id: string;
  question: string;
  opensAt?: string;
  answeredAt?: string;
};

export type Scene = {
  id: string;
  title: string;
  summary: string;
  actors: string[];
  depicts: EventId[];
  pressures: string[];
};

export type Candidate = { id: string; answer: string; touches: Ref[] };

/**
 * What the story's makers haven't decided, unlike a reader question. With
 * `conflict`, it records a contradiction someone noticed.
 */
export type OpenQuestion = {
  id: string;
  question: string;
  about: Ref[];
  /** IDs are unique within this question. */
  candidates: Candidate[];
  /** The chosen candidate's ID. */
  answer?: string;
  conflict: boolean;
};

export type RefKind =
  | "actor"
  | "drive"
  | "fact"
  | "readerQuestion"
  | "event"
  | "scene"
  | "openQuestion";

const REF_KINDS: readonly RefKind[] = [
  "actor",
  "drive",
  "fact",
  "readerQuestion",
  "event",
  "scene",
  "openQuestion",
];

export type Ref =
  | { kind: RefKind; id: string }
  | { kind: "candidate"; questionId: string; id: string };

export type Story = {
  version: typeof STORY_VERSION;
  premise: string;
  actors: Actor[];
  drives: Drive[];
  facts: Fact[];
  readerQuestions: ReaderQuestion[];
  /** In telling order. */
  scenes: Scene[];
  openQuestions: OpenQuestion[];
  timeline: Timeline;
};

export function newStory(premise: string): Story {
  return {
    version: STORY_VERSION,
    premise,
    actors: [],
    drives: [],
    facts: [],
    readerQuestions: [],
    scenes: [],
    openQuestions: [],
    timeline: emptyTimeline,
  };
}

export type StoryError =
  | { kind: "not_json"; message: string }
  | { kind: "invalid_story"; message: string };

type Check<T> = Result<T, string>;
type JsonRecord = { [key: string]: JsonValue };

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function checkString(value: unknown, at: string): Check<string> {
  return typeof value === "string" ? ok(value) : err(`${at} must be a string`);
}

function checkOptionalString(
  value: unknown,
  at: string,
): Check<string | undefined> {
  return value === undefined ? ok(undefined) : checkString(value, at);
}

function checkStrings(value: unknown, at: string): Check<string[]> {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? ok(value)
    : err(`${at} must be a list of strings`);
}

function checkOneOf<T extends string>(
  value: unknown,
  options: readonly T[],
  at: string,
): Check<T> {
  const found = options.find((option) => option === value);
  return found === undefined
    ? err(`${at} must be one of ${options.join(", ")}`)
    : ok(found);
}

function checkRecords<T>(
  value: unknown,
  at: string,
  item: (v: JsonRecord, at: string) => Check<T>,
): Check<T[]> {
  if (!Array.isArray(value)) return err(`${at} must be a list`);
  const items: T[] = [];
  for (const [i, v] of value.entries()) {
    const itemAt = `${at}[${i}]`;
    if (!isRecord(v)) return err(`${itemAt} must be an object`);
    const checked = item(v, itemAt);
    if (checked.isErr()) return err(checked.error);
    items.push(checked.value);
  }
  return ok(items);
}

/** Like `checkRecords`, for records with IDs, which must be unique in the list. */
function checkIdentified<T extends { id: string }>(
  value: unknown,
  at: string,
  item: (v: JsonRecord, at: string) => Check<T>,
): Check<T[]> {
  return checkRecords(value, at, item).andThen((items) => {
    const seen = new Set<string>();
    for (const { id } of items) {
      if (seen.has(id)) return err(`${at} has duplicate id ${id}`);
      seen.add(id);
    }
    return ok(items);
  });
}

function checkRef(v: JsonRecord, at: string): Check<Ref> {
  return checkString(v.id, `${at}.id`).andThen((id): Check<Ref> => {
    if (v.kind === "candidate") {
      return checkString(v.questionId, `${at}.questionId`).map(
        (questionId) => ({ kind: "candidate", questionId, id }),
      );
    }
    return checkOneOf(v.kind, REF_KINDS, `${at}.kind`).map((kind) => ({
      kind,
      id,
    }));
  });
}

function checkActor(v: JsonRecord, at: string): Check<Actor> {
  return Result.combine([
    checkString(v.id, `${at}.id`),
    checkString(v.name, `${at}.name`),
    checkOneOf(v.kind, ["person", "organization"] as const, `${at}.kind`),
    checkString(v.notes, `${at}.notes`),
  ]).map(([id, name, kind, notes]) => ({ id, name, kind, notes }));
}

function checkDriveRelation(v: JsonRecord, at: string): Check<DriveRelation> {
  return Result.combine([
    checkString(v.to, `${at}.to`),
    checkOneOf(
      v.type,
      ["opposes", "allies", "competes"] as const,
      `${at}.type`,
    ),
  ]).map(([to, type]) => ({ to, type }));
}

function checkDrive(v: JsonRecord, at: string): Check<Drive> {
  const actorId: Check<string | null> =
    v.actorId === null ? ok(null) : checkString(v.actorId, `${at}.actorId`);
  return Result.combine([
    checkString(v.id, `${at}.id`),
    actorId,
    checkString(v.want, `${at}.want`),
    checkString(v.stakes, `${at}.stakes`),
    checkString(v.method, `${at}.method`),
    checkStrings(v.origins, `${at}.origins`),
    checkRecords(v.relations, `${at}.relations`, checkDriveRelation),
  ]).map(([id, actorId, want, stakes, method, origins, relations]) => ({
    id,
    actorId,
    want,
    stakes,
    method,
    origins,
    relations,
  }));
}

function checkFact(v: JsonRecord, at: string): Check<Fact> {
  return Result.combine([
    checkString(v.id, `${at}.id`),
    checkString(v.text, `${at}.text`),
    checkRecords(v.about, `${at}.about`, checkRef),
  ]).map(([id, text, about]) => ({ id, text, about }));
}

function checkReaderQuestion(v: JsonRecord, at: string): Check<ReaderQuestion> {
  return Result.combine([
    checkString(v.id, `${at}.id`),
    checkString(v.question, `${at}.question`),
    checkOptionalString(v.opensAt, `${at}.opensAt`),
    checkOptionalString(v.answeredAt, `${at}.answeredAt`),
  ]).map(([id, question, opensAt, answeredAt]) => ({
    id,
    question,
    ...(opensAt === undefined ? {} : { opensAt }),
    ...(answeredAt === undefined ? {} : { answeredAt }),
  }));
}

function checkScene(v: JsonRecord, at: string): Check<Scene> {
  return Result.combine([
    checkString(v.id, `${at}.id`),
    checkString(v.title, `${at}.title`),
    checkString(v.summary, `${at}.summary`),
    checkStrings(v.actors, `${at}.actors`),
    checkStrings(v.depicts, `${at}.depicts`),
    checkStrings(v.pressures, `${at}.pressures`),
  ]).map(([id, title, summary, actors, depicts, pressures]) => ({
    id,
    title,
    summary,
    actors,
    depicts,
    pressures,
  }));
}

function checkCandidate(v: JsonRecord, at: string): Check<Candidate> {
  return Result.combine([
    checkString(v.id, `${at}.id`),
    checkString(v.answer, `${at}.answer`),
    checkRecords(v.touches, `${at}.touches`, checkRef),
  ]).map(([id, answer, touches]) => ({ id, answer, touches }));
}

function checkOpenQuestion(v: JsonRecord, at: string): Check<OpenQuestion> {
  const conflict: Check<boolean> =
    typeof v.conflict === "boolean"
      ? ok(v.conflict)
      : err(`${at}.conflict must be true or false`);
  return Result.combine([
    checkString(v.id, `${at}.id`),
    checkString(v.question, `${at}.question`),
    checkRecords(v.about, `${at}.about`, checkRef),
    checkIdentified(v.candidates, `${at}.candidates`, checkCandidate),
    checkOptionalString(v.answer, `${at}.answer`),
    conflict,
  ]).map(([id, question, about, candidates, answer, conflict]) => ({
    id,
    question,
    about,
    candidates,
    ...(answer === undefined ? {} : { answer }),
    conflict,
  }));
}

/** Checks a story file's text. The error names the part that is wrong. */
export function parseStory(text: string): Result<Story, StoryError> {
  let value: JsonValue;
  try {
    value = JSON.parse(text);
  } catch (cause) {
    return err({ kind: "not_json", message: String(cause) });
  }
  return checkStory(value).mapErr((message) => ({
    kind: "invalid_story",
    message,
  }));
}

function checkStory(value: JsonValue): Check<Story> {
  if (!isRecord(value)) return err("story must be an object");
  if (value.version !== STORY_VERSION) {
    return err(`unsupported story version ${JSON.stringify(value.version)}`);
  }
  return Result.combine([
    checkString(value.premise, "premise"),
    checkIdentified(value.actors, "actors", checkActor),
    checkIdentified(value.drives, "drives", checkDrive),
    checkIdentified(value.facts, "facts", checkFact),
    checkIdentified(
      value.readerQuestions,
      "readerQuestions",
      checkReaderQuestion,
    ),
    checkIdentified(value.scenes, "scenes", checkScene),
    checkIdentified(value.openQuestions, "openQuestions", checkOpenQuestion),
    parseTimeline(value.timeline ?? null).mapErr(
      (message) => `timeline: ${message}`,
    ),
  ]).map(
    ([
      premise,
      actors,
      drives,
      facts,
      readerQuestions,
      scenes,
      openQuestions,
      timeline,
    ]): Story => ({
      version: STORY_VERSION,
      premise,
      actors,
      drives,
      facts,
      readerQuestions,
      scenes,
      openQuestions,
      timeline,
    }),
  );
}

const compareStrings = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function sortedBy<T>(items: readonly T[], key: (item: T) => string): T[] {
  return [...items].sort((a, b) => compareStrings(key(a), key(b)));
}

const byId = <T extends { id: string }>(items: readonly T[]) =>
  sortedBy(items, ({ id }) => id);
const sortedStrings = (items: readonly string[]) =>
  sortedBy(items, (item) => item);
const sortedRefs = (refs: readonly Ref[]) =>
  sortedBy(refs, (ref) =>
    [ref.kind, ref.kind === "candidate" ? ref.questionId : "", ref.id].join(
      "\0",
    ),
  );

/**
 * Sorts every list whose order means nothing, because edits reorder them.
 * Scenes keep their order, which is the telling order, as do a placement's
 * constraints, which aren't records of their own.
 */
function normalized(story: Story): Story {
  const { timeline } = story;
  return {
    ...story,
    actors: byId(story.actors),
    drives: byId(
      story.drives.map((drive) => ({
        ...drive,
        origins: sortedStrings(drive.origins),
        relations: sortedBy(drive.relations, ({ to, type }) =>
          [to, type].join("\0"),
        ),
      })),
    ),
    facts: byId(
      story.facts.map((fact) => ({ ...fact, about: sortedRefs(fact.about) })),
    ),
    readerQuestions: byId(story.readerQuestions),
    scenes: story.scenes.map((scene) => ({
      ...scene,
      actors: sortedStrings(scene.actors),
      depicts: sortedStrings(scene.depicts),
      pressures: sortedStrings(scene.pressures),
    })),
    openQuestions: byId(
      story.openQuestions.map((question) => ({
        ...question,
        about: sortedRefs(question.about),
        candidates: byId(
          question.candidates.map((candidate) => ({
            ...candidate,
            touches: sortedRefs(candidate.touches),
          })),
        ),
      })),
    ),
    timeline: {
      ...timeline,
      events: byId(timeline.events),
      positions: sortedBy(timeline.positions, ({ event, frame }) =>
        [event, frame].join("\0"),
      ),
      constraints: byId(timeline.constraints),
      placements: sortedBy(timeline.placements, ({ scene }) => scene),
      frames: byId(timeline.frames),
      correspondences: byId(timeline.correspondences),
      follows: sortedBy(timeline.follows, ({ entity }) => entity),
      reveals: byId(timeline.reveals),
    },
  };
}

/** Keys are written in this order, and any others alphabetically after them. */
const KEY_ORDER = [
  "version",
  "premise",
  "actors",
  "drives",
  "facts",
  "readerQuestions",
  "scenes",
  "openQuestions",
  "timeline",
  "id",
  "kind",
  "questionId",
  "name",
  "actorId",
  "want",
  "stakes",
  "method",
  "origins",
  "relations",
  "title",
  "text",
  "question",
  "label",
  "summary",
  "notes",
  "opensAt",
  "answeredAt",
  "about",
  "candidates",
  "answer",
  "touches",
  "conflict",
];

const keyRank = (key: string) => {
  const rank = KEY_ORDER.indexOf(key);
  return rank === -1 ? KEY_ORDER.length : rank;
};

function withOrderedKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withOrderedKeys);
  if (!isRecord(value)) return value;
  const keys = Object.keys(value).sort(
    (a, b) => keyRank(a) - keyRank(b) || compareStrings(a, b),
  );
  return Object.fromEntries(
    keys.map((key) => [key, withOrderedKeys(value[key])]),
  );
}

/** The file's text. Equal stories give equal text, however they were edited. */
export function serializeStory(story: Story): string {
  return `${JSON.stringify(withOrderedKeys(normalized(story)), null, 2)}\n`;
}
