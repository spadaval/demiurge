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
 * place in story time: `depicts` is its only link to events. The file is the
 * author's bible: a scene's prose is kept apart from it, in a file of its own
 * (`proseFile` in `scripts/story.ts`), and a scene record says only what the
 * scene does with the bible's records.
 */

import { err, ok, Result } from "neverthrow";
import type { JsonValue } from "../storage/types";
import {
  type EventId,
  emptyTimeline,
  type Following,
  type Position,
  parseTimeline,
  type ScenePlacement,
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

/**
 * How a want ends or changes: met, given up, replaced by another want, or
 * turned into its opposite (another want, often against what it was allied
 * with). A drive with no turns is still live.
 */
export const DRIVE_TURN_HOWS = [
  "satisfied",
  "renounced",
  "replaced",
  "flipped",
] as const;

export type DriveTurnHow = (typeof DRIVE_TURN_HOWS)[number];

/**
 * One turn in a drive's life, at an event if it has one. `into` is the drive
 * that replaces it or that it flips into.
 */
export type DriveTurn = {
  how: DriveTurnHow;
  at?: EventId;
  into?: string;
  note: string;
};

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
  /**
   * Its life after it starts, in the order the turns happen. Left out of the
   * file when empty, so older files read the same.
   */
  turns: DriveTurn[];
};

/**
 * A thing that matters to the story: a knife, a letter, a hook. Scenes plant
 * it and pay it off; events can have it as a participant.
 */
export type StoryObject = { id: string; name: string; notes: string };

/**
 * An actor or object taking part in an event, with its part in it in words:
 * "did it", "witness", "the weapon". One per event and participant.
 */
export type Participant = { event: EventId; who: Ref; role: string };

/** A plain statement about the world. Unlike the app's facts, it doesn't change at events. */
export type Fact = { id: string; text: string; about: Ref[] };

/** What the reader is waiting for. */
export type ReaderQuestion = {
  id: string;
  question: string;
  opensAt?: string;
  answeredAt?: string;
};

/**
 * What a scene does with a record: tells the reader outright, lets the reader
 * infer it, or keeps it from the reader where the reader would expect it;
 * plants it, setting it up to matter later, or pays off what an earlier scene
 * planted. Any record can be planted: an object, a fact, a drive.
 */
export const SCENE_LINK_KINDS = [
  "reveals",
  "implies",
  "withholds",
  "plants",
  "paysOff",
] as const;

export type SceneLinkKind = (typeof SCENE_LINK_KINDS)[number];

/** Each link kind as a verb: `pays off`. */
export const SCENE_LINK_WORDS: Record<SceneLinkKind, string> = {
  reveals: "reveals",
  implies: "implies",
  withholds: "withholds",
  plants: "plants",
  paysOff: "pays off",
};

export type Scene = {
  id: string;
  title: string;
  /** The author's note on the scene, not its prose. */
  summary: string;
  actors: string[];
  depicts: EventId[];
  pressures: string[];
} & Record<SceneLinkKind, Ref[]>;

export type Candidate = {
  id: string;
  answer: string;
  touches: Ref[];
  /**
   * Why the author ruled it out, kept so the reasoning isn't lost. Absent
   * while it is still in the running or once chosen.
   */
  rejected?: string;
};

/**
 * An answer that was chosen and then replaced or withdrawn, oldest first.
 * `answer` is its text when it stopped being chosen, so the history reads the
 * same if the candidate is later changed or removed.
 */
export type SupersededAnswer = {
  /** The candidate's ID. */
  candidate: string;
  answer: string;
  /** The candidate chosen in its place; absent if the question was unanswered. */
  by?: string;
};

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
  /**
   * Why the author leaves it open for the reader on purpose: the story never
   * answers it, whether or not the author has. Absent when not.
   */
  leftOpen?: string;
  /** Absent when empty, so files written before the field existed read the same. */
  superseded?: SupersededAnswer[];
};

/**
 * Where an open question stands. Undecided is an author task; the others are
 * normal places for a question to rest, and most of a story's questions may
 * never be revealed.
 *
 * - `undecided`: no candidate chosen.
 * - `decided`: answered, and no scene reveals the answer yet.
 * - `left_open`: marked to stay open for the reader, answered or not, and no
 *   scene reveals it.
 * - `revealed`: answered, and `scene` is the first scene in telling order
 *   that reveals the question or its chosen candidate.
 */
export type QuestionState =
  | { state: "undecided" }
  | { state: "decided" }
  | { state: "left_open"; reason: string }
  | { state: "revealed"; scene: string };

export function questionState(story: Story, q: OpenQuestion): QuestionState {
  if (isAnswered(q)) {
    const revealing = story.scenes.find((scene) =>
      scene.reveals.some(
        (ref) =>
          (ref.kind === "openQuestion" && ref.id === q.id) ||
          (ref.kind === "candidate" &&
            ref.questionId === q.id &&
            ref.id === q.answer),
      ),
    );
    if (revealing !== undefined) {
      return { state: "revealed", scene: revealing.id };
    }
  }
  if (q.leftOpen !== undefined) {
    return { state: "left_open", reason: q.leftOpen };
  }
  return isAnswered(q) ? { state: "decided" } : { state: "undecided" };
}

/**
 * One event happened because of another. Stored on the story, not the
 * timeline, since it says why and not when; whether the cause still comes
 * first is for `storyContradictions`.
 */
export type Cause = { cause: EventId; effect: EventId };

/**
 * One account of an event, as `by` tell it, held beside the others and the
 * event's own summary, which is what really happened. An account can be true,
 * partial or a lie; what someone believes is a `Knowledge` record.
 */
export type Version = {
  id: string;
  event: EventId;
  text: string;
  /** The actors who tell it. */
  by: string[];
};

export const KNOWLEDGE_HOWS = ["knows", "believes"] as const;

export type KnowledgeHow = (typeof KNOWLEDGE_HOWS)[number];

/**
 * What one actor knows or believes, in story time: `what` is any record (a
 * fact, a version of an event, an event, a candidate answer) and `since` and
 * `until` are the events it holds from and to, absent when it always has or
 * never stops. Time is told by events, so a finer timeline needs no change
 * here. A scene tells the reader this by revealing the record.
 */
export type Knowledge = {
  id: string;
  actor: string;
  how: KnowledgeHow;
  what: Ref;
  since?: EventId;
  until?: EventId;
};

/** The kinds of gap `storyGaps` reports (`./gaps.ts`). */
export const GAP_KINDS = [
  "drive_without_actor",
  "drive_without_origin",
  "drive_unopposed",
  "scene_without_pressure",
  "drive_without_scene",
  "event_unreferenced",
  "fact_unconnected",
  "no_reader_question",
  "reader_question_never_opens",
  "open_question_without_candidates",
  "open_question_one_candidate",
] as const;

export type GapKind = (typeof GAP_KINDS)[number];

/**
 * Gap kinds `storyGaps` no longer reports. A deliberate mark of one in an old
 * file has nothing left to silence, so it is dropped on load. A person with
 * no drive is no gap: reporting it pushed sessions to delete minor characters.
 */
const RETIRED_GAP_KINDS: readonly string[] = [
  "reader_question_never_answered",
  "person_without_drive",
];

/** The kind of record each gap is about, or null for the whole story. */
export const GAP_SUBJECTS: Record<GapKind, RefKind | null> = {
  drive_without_actor: "drive",
  drive_without_origin: "drive",
  drive_unopposed: "drive",
  scene_without_pressure: "scene",
  drive_without_scene: "drive",
  event_unreferenced: "event",
  fact_unconnected: "fact",
  no_reader_question: null,
  reader_question_never_opens: "readerQuestion",
  open_question_without_candidates: "openQuestion",
  open_question_one_candidate: "openQuestion",
};

/**
 * A gap the team has judged fine, such as a drive that comes from temperament
 * and no event, so `storyGaps` doesn't list it. `ref` is the record the gap is
 * about, or null for a gap about the whole story.
 */
export type DeliberateGap = { gap: GapKind; ref: Ref | null; reason: string };

export type RefKind =
  | "actor"
  | "drive"
  | "fact"
  | "readerQuestion"
  | "event"
  | "scene"
  | "openQuestion"
  | "version"
  | "knowledge"
  | "object";

const REF_KINDS: readonly RefKind[] = [
  "actor",
  "drive",
  "fact",
  "readerQuestion",
  "event",
  "scene",
  "openQuestion",
  "version",
  "knowledge",
  "object",
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
  /** Left out of the file when empty, so older files read the same. */
  causes: Cause[];
  /** Left out of the file when empty, as `causes` is. */
  deliberateGaps: DeliberateGap[];
  /** Left out of the file when empty, as `causes` is. */
  versions: Version[];
  /** Left out of the file when empty, as `causes` is. */
  knowledge: Knowledge[];
  /** Left out of the file when empty, as `causes` is. */
  objects: StoryObject[];
  /** Left out of the file when empty, as `causes` is. */
  participants: Participant[];
  timeline: Timeline;
};

const has = (items: readonly { id: string }[], id: string) =>
  items.some((item) => item.id === id);

/** Whether the record `ref` names is in the story. */
export function refExists(story: Story, ref: Ref): boolean {
  switch (ref.kind) {
    case "actor":
      return has(story.actors, ref.id);
    case "drive":
      return has(story.drives, ref.id);
    case "fact":
      return has(story.facts, ref.id);
    case "readerQuestion":
      return has(story.readerQuestions, ref.id);
    case "event":
      return has(story.timeline.events, ref.id);
    case "scene":
      return has(story.scenes, ref.id);
    case "openQuestion":
      return has(story.openQuestions, ref.id);
    case "version":
      return has(story.versions, ref.id);
    case "knowledge":
      return has(story.knowledge, ref.id);
    case "object":
      return has(story.objects, ref.id);
    case "candidate": {
      const { questionId, id } = ref;
      const question = story.openQuestions.find((q) => q.id === questionId);
      return question !== undefined && has(question.candidates, id);
    }
  }
}

/** Whether the question has a chosen candidate that still exists. */
export function isAnswered(question: OpenQuestion): boolean {
  return question.candidates.some(({ id }) => id === question.answer);
}

/** `drive shut`, or `candidate cargo of open question why`. */
export function describeRef(ref: Ref): string {
  return ref.kind === "candidate"
    ? `candidate ${ref.id} of open question ${ref.questionId}`
    : `${ref.kind} ${ref.id}`;
}

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
    causes: [],
    deliberateGaps: [],
    versions: [],
    knowledge: [],
    objects: [],
    participants: [],
    timeline: emptyTimeline,
  };
}

export type StoryError =
  | { kind: "not_json"; message: string }
  | { kind: "invalid_story"; message: string }
  /** A command refused (`./commands.ts`): `command` is its type. */
  | {
      kind:
        | "unknown_id"
        | "duplicate_id"
        | "self_relation"
        | "relation_exists"
        | "invalid_command";
      command: string;
      message: string;
    };

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

/**
 * Refuses a key this file format doesn't have. Writing a story back drops what
 * the parser doesn't keep, so a misspelled optional key would silently lose
 * data. Apart from event keys, the timeline's records are parsed as the app
 * parses them.
 */
function checkKeys(
  v: JsonRecord,
  at: string,
  keys: readonly string[],
): Check<JsonRecord> {
  const unknown = Object.keys(v).find((key) => !keys.includes(key));
  return unknown === undefined
    ? ok(v)
    : err(`${at}.${unknown} is not a known field`);
}

function checkRef(v: JsonRecord, at: string): Check<Ref> {
  const keys =
    v.kind === "candidate" ? ["kind", "questionId", "id"] : ["kind", "id"];
  return checkKeys(v, at, keys).andThen(() => checkRefFields(v, at));
}

function checkRefFields(v: JsonRecord, at: string): Check<Ref> {
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
  const known = checkKeys(v, at, ["id", "name", "kind", "notes"]);
  if (known.isErr()) return err(known.error);
  return Result.combine([
    checkString(v.id, `${at}.id`),
    checkString(v.name, `${at}.name`),
    checkOneOf(v.kind, ["person", "organization"] as const, `${at}.kind`),
    checkString(v.notes, `${at}.notes`),
  ]).map(([id, name, kind, notes]) => ({ id, name, kind, notes }));
}

function checkDriveRelation(v: JsonRecord, at: string): Check<DriveRelation> {
  const known = checkKeys(v, at, ["to", "type"]);
  if (known.isErr()) return err(known.error);
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
  const known = checkKeys(v, at, [
    "id",
    "actorId",
    "want",
    "stakes",
    "method",
    "origins",
    "relations",
    "turns",
  ]);
  if (known.isErr()) return err(known.error);
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
    v.turns === undefined
      ? ok([])
      : checkRecords(v.turns, `${at}.turns`, checkDriveTurn),
  ]).map(([id, actorId, want, stakes, method, origins, relations, turns]) => ({
    id,
    actorId,
    want,
    stakes,
    method,
    origins,
    relations,
    turns,
  }));
}

function checkDriveTurn(v: JsonRecord, at: string): Check<DriveTurn> {
  const known = checkKeys(v, at, ["how", "at", "into", "note"]);
  if (known.isErr()) return err(known.error);
  return Result.combine([
    checkOneOf(v.how, DRIVE_TURN_HOWS, `${at}.how`),
    checkOptionalString(v.at, `${at}.at`),
    checkOptionalString(v.into, `${at}.into`),
    checkString(v.note, `${at}.note`),
  ]).map(([how, when, into, note]) => ({
    how,
    ...(when === undefined ? {} : { at: when }),
    ...(into === undefined ? {} : { into }),
    note,
  }));
}

function checkObject(v: JsonRecord, at: string): Check<StoryObject> {
  const known = checkKeys(v, at, ["id", "name", "notes"]);
  if (known.isErr()) return err(known.error);
  return Result.combine([
    checkString(v.id, `${at}.id`),
    checkString(v.name, `${at}.name`),
    checkString(v.notes, `${at}.notes`),
  ]).map(([id, name, notes]) => ({ id, name, notes }));
}

function checkParticipant(v: JsonRecord, at: string): Check<Participant> {
  const known = checkKeys(v, at, ["event", "who", "role"]);
  if (known.isErr()) return err(known.error);
  const who: Check<Ref> = isRecord(v.who)
    ? checkRef(v.who, `${at}.who`)
    : err(`${at}.who must be a ref`);
  return Result.combine([
    checkString(v.event, `${at}.event`),
    who,
    checkString(v.role, `${at}.role`),
  ]).map(([event, who, role]) => ({ event, who, role }));
}

/** One participant per event and record, so the file's text doesn't depend on the edit. */
function checkParticipants(value: unknown): Check<Participant[]> {
  if (value === undefined) return ok([]);
  return checkRecords(value, "participants", checkParticipant).andThen(
    (participants) => {
      const seen = new Set<string>();
      for (const p of participants) {
        const key = JSON.stringify(PARTICIPANT_KEY(p));
        if (seen.has(key)) return err(`participants has duplicate ${key}`);
        seen.add(key);
      }
      return ok(participants);
    },
  );
}

function checkFact(v: JsonRecord, at: string): Check<Fact> {
  const known = checkKeys(v, at, ["id", "text", "about"]);
  if (known.isErr()) return err(known.error);
  return Result.combine([
    checkString(v.id, `${at}.id`),
    checkString(v.text, `${at}.text`),
    checkRecords(v.about, `${at}.about`, checkRef),
  ]).map(([id, text, about]) => ({ id, text, about }));
}

function checkReaderQuestion(v: JsonRecord, at: string): Check<ReaderQuestion> {
  const known = checkKeys(v, at, ["id", "question", "opensAt", "answeredAt"]);
  if (known.isErr()) return err(known.error);
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

/** Absent when empty, so files written before scene links read the same. */
const checkSceneLinks = (value: unknown, at: string): Check<Ref[]> =>
  value === undefined ? ok([]) : checkRecords(value, at, checkRef);

function checkScene(v: JsonRecord, at: string): Check<Scene> {
  const known = checkKeys(v, at, [
    "id",
    "title",
    "summary",
    "actors",
    "depicts",
    "pressures",
    ...SCENE_LINK_KINDS,
  ]);
  if (known.isErr()) return err(known.error);
  return Result.combine([
    checkString(v.id, `${at}.id`),
    checkString(v.title, `${at}.title`),
    checkString(v.summary, `${at}.summary`),
    checkStrings(v.actors, `${at}.actors`),
    checkStrings(v.depicts, `${at}.depicts`),
    checkStrings(v.pressures, `${at}.pressures`),
    checkSceneLinks(v.reveals, `${at}.reveals`),
    checkSceneLinks(v.implies, `${at}.implies`),
    checkSceneLinks(v.withholds, `${at}.withholds`),
    checkSceneLinks(v.plants, `${at}.plants`),
    checkSceneLinks(v.paysOff, `${at}.paysOff`),
  ]).map(
    ([
      id,
      title,
      summary,
      actors,
      depicts,
      pressures,
      reveals,
      implies,
      withholds,
      plants,
      paysOff,
    ]) => ({
      id,
      title,
      summary,
      actors,
      depicts,
      pressures,
      reveals,
      implies,
      withholds,
      plants,
      paysOff,
    }),
  );
}

function checkVersion(v: JsonRecord, at: string): Check<Version> {
  const known = checkKeys(v, at, ["id", "event", "text", "by"]);
  if (known.isErr()) return err(known.error);
  return Result.combine([
    checkString(v.id, `${at}.id`),
    checkString(v.event, `${at}.event`),
    checkString(v.text, `${at}.text`),
    checkStrings(v.by, `${at}.by`),
  ]).map(([id, event, text, by]) => ({ id, event, text, by }));
}

function checkKnowledge(v: JsonRecord, at: string): Check<Knowledge> {
  const known = checkKeys(v, at, [
    "id",
    "actor",
    "how",
    "what",
    "since",
    "until",
  ]);
  if (known.isErr()) return err(known.error);
  const what: Check<Ref> = isRecord(v.what)
    ? checkRef(v.what, `${at}.what`)
    : err(`${at}.what must be a ref`);
  return Result.combine([
    checkString(v.id, `${at}.id`),
    checkString(v.actor, `${at}.actor`),
    checkOneOf(v.how, KNOWLEDGE_HOWS, `${at}.how`),
    what,
    checkOptionalString(v.since, `${at}.since`),
    checkOptionalString(v.until, `${at}.until`),
  ]).map(([id, actor, how, what, since, until]) => ({
    id,
    actor,
    how,
    what,
    ...(since === undefined ? {} : { since }),
    ...(until === undefined ? {} : { until }),
  }));
}

function checkCandidate(v: JsonRecord, at: string): Check<Candidate> {
  const known = checkKeys(v, at, ["id", "answer", "touches", "rejected"]);
  if (known.isErr()) return err(known.error);
  return Result.combine([
    checkString(v.id, `${at}.id`),
    checkString(v.answer, `${at}.answer`),
    checkRecords(v.touches, `${at}.touches`, checkRef),
    checkOptionalString(v.rejected, `${at}.rejected`),
  ]).map(([id, answer, touches, rejected]) => ({
    id,
    answer,
    touches,
    ...(rejected === undefined ? {} : { rejected }),
  }));
}

function checkOpenQuestion(v: JsonRecord, at: string): Check<OpenQuestion> {
  const known = checkKeys(v, at, [
    "id",
    "question",
    "about",
    "candidates",
    "answer",
    "conflict",
    // Files from before question states may still mark a question as being
    // weighed; that is just undecided now, so the mark is dropped.
    "working",
    "leftOpen",
    "superseded",
  ]);
  if (known.isErr()) return err(known.error);
  const superseded: Check<SupersededAnswer[]> =
    v.superseded === undefined
      ? ok([])
      : checkRecords(v.superseded, `${at}.superseded`, checkSuperseded);
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
    checkOptionalString(v.leftOpen, `${at}.leftOpen`),
    superseded,
  ]).map(
    ([
      id,
      question,
      about,
      candidates,
      answer,
      conflict,
      leftOpen,
      superseded,
    ]) => ({
      id,
      question,
      about,
      candidates,
      ...(answer === undefined ? {} : { answer }),
      conflict,
      ...(leftOpen === undefined ? {} : { leftOpen }),
      ...(superseded.length === 0 ? {} : { superseded }),
    }),
  );
}

function checkSuperseded(v: JsonRecord, at: string): Check<SupersededAnswer> {
  const known = checkKeys(v, at, ["candidate", "answer", "by"]);
  if (known.isErr()) return err(known.error);
  return Result.combine([
    checkString(v.candidate, `${at}.candidate`),
    checkString(v.answer, `${at}.answer`),
    checkOptionalString(v.by, `${at}.by`),
  ]).map(([candidate, answer, by]) => ({
    candidate,
    answer,
    ...(by === undefined ? {} : { by }),
  }));
}

function checkDeliberateGap(v: JsonRecord, at: string): Check<DeliberateGap> {
  const known = checkKeys(v, at, ["gap", "ref", "reason"]);
  if (known.isErr()) return err(known.error);
  const ref: Check<Ref | null> =
    v.ref === null
      ? ok(null)
      : isRecord(v.ref)
        ? checkRef(v.ref, `${at}.ref`)
        : err(`${at}.ref must be a ref or null`);
  return Result.combine([
    checkOneOf(v.gap, GAP_KINDS, `${at}.gap`),
    ref,
    checkString(v.reason, `${at}.reason`),
  ]).map(([gap, ref, reason]) => ({ gap, ref, reason }));
}

/** A gap marked twice would make the file's text depend on the edit. */
function checkDeliberateGaps(value: unknown): Check<DeliberateGap[]> {
  if (value === undefined) return ok([]);
  const current = Array.isArray(value)
    ? value.filter(
        (mark) =>
          !(
            isRecord(mark) &&
            typeof mark.gap === "string" &&
            RETIRED_GAP_KINDS.includes(mark.gap)
          ),
      )
    : value;
  return checkRecords(current, "deliberateGaps", checkDeliberateGap).andThen(
    (marks) => {
      const seen = new Set<string>();
      for (const mark of marks) {
        const key = JSON.stringify(GAP_MARK_KEY(mark));
        if (seen.has(key)) return err(`deliberateGaps has duplicate ${key}`);
        seen.add(key);
      }
      return ok(marks);
    },
  );
}

const CAUSE_KEY = ({ cause, effect }: Cause) => [cause, effect];

/** Identifies a participant: one per event and record. */
export const PARTICIPANT_KEY = ({
  event,
  who,
}: {
  event: string;
  who: Ref;
}) => [event, ...refKey(who)];

const refKey = (ref: Ref | null): string[] =>
  ref === null
    ? []
    : [ref.kind, ref.kind === "candidate" ? ref.questionId : "", ref.id];

/** Identifies a deliberate gap: one mark per gap and record. */
export const GAP_MARK_KEY = ({
  gap,
  ref,
}: {
  gap: GapKind;
  ref: Ref | null;
}) => [gap, ...refKey(ref)];

function checkCause(v: JsonRecord, at: string): Check<Cause> {
  const known = checkKeys(v, at, ["cause", "effect"]);
  if (known.isErr()) return err(known.error);
  return Result.combine([
    checkString(v.cause, `${at}.cause`),
    checkString(v.effect, `${at}.effect`),
  ]).map(([cause, effect]) => ({ cause, effect }));
}

/** A repeated cause would make the file's text depend on the edit. */
function checkCauses(value: unknown): Check<Cause[]> {
  if (value === undefined) return ok([]);
  return checkRecords(value, "causes", checkCause).andThen((causes) => {
    const seen = new Set<string>();
    for (const cause of causes) {
      const key = JSON.stringify(CAUSE_KEY(cause));
      if (seen.has(key)) return err(`causes has duplicate ${key}`);
      seen.add(key);
    }
    return ok(causes);
  });
}

const POSITION_KEY = ({ event, frame }: Position) => [event, frame];
const PLACEMENT_KEY = ({ scene }: ScenePlacement) => [scene];
const FOLLOWING_KEY = ({ entity }: Following) => [entity];

/**
 * The app's parser allows repeats. A story file is edited by hand and merged,
 * and a repeat would make its order, and so its text, depend on the edit.
 */
/** An event's summary is written by hand, so a misspelled key would lose it. */
function checkEventKeys(timeline: JsonValue | undefined): Check<null> {
  if (!isRecord(timeline) || !Array.isArray(timeline.events)) return ok(null);
  for (const [i, event] of timeline.events.entries()) {
    if (!isRecord(event)) continue;
    const known = checkKeys(event, `timeline.events[${i}]`, [
      "id",
      "label",
      "summary",
    ]);
    if (known.isErr()) return err(known.error);
  }
  return ok(null);
}

function checkTimelineKeys(timeline: Timeline): Check<Timeline> {
  const id = ({ id }: { id: string }) => [id];
  const problem =
    repeatedKey("events", timeline.events, id) ??
    repeatedKey("positions", timeline.positions, POSITION_KEY) ??
    repeatedKey("constraints", timeline.constraints, id) ??
    repeatedKey("placements", timeline.placements, PLACEMENT_KEY) ??
    repeatedKey("frames", timeline.frames, id) ??
    repeatedKey("correspondences", timeline.correspondences, id) ??
    repeatedKey("follows", timeline.follows, FOLLOWING_KEY) ??
    repeatedKey("reveals", timeline.reveals, id);
  return problem === undefined ? ok(timeline) : err(problem);
}

function repeatedKey<T>(
  at: string,
  items: readonly T[],
  key: (item: T) => string[],
): string | undefined {
  const seen = new Set<string>();
  for (const item of items) {
    const value = JSON.stringify(key(item));
    if (seen.has(value)) return `timeline.${at} has duplicate ${value}`;
    seen.add(value);
  }
  return undefined;
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
  const known = checkKeys(value, "story", [
    "version",
    "premise",
    "actors",
    "drives",
    "facts",
    "readerQuestions",
    "scenes",
    "openQuestions",
    "causes",
    "deliberateGaps",
    "versions",
    "knowledge",
    "objects",
    "participants",
    "timeline",
  ]);
  if (known.isErr()) return err(known.error);
  const eventKeys = checkEventKeys(value.timeline);
  if (eventKeys.isErr()) return err(eventKeys.error);
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
    checkCauses(value.causes),
    checkDeliberateGaps(value.deliberateGaps),
    value.versions === undefined
      ? ok([])
      : checkIdentified(value.versions, "versions", checkVersion),
    value.knowledge === undefined
      ? ok([])
      : checkIdentified(value.knowledge, "knowledge", checkKnowledge),
    value.objects === undefined
      ? ok([])
      : checkIdentified(value.objects, "objects", checkObject),
    checkParticipants(value.participants),
    parseTimeline(value.timeline ?? null)
      .mapErr((message) => `timeline: ${message}`)
      .andThen(checkTimelineKeys),
  ]).map(
    ([
      premise,
      actors,
      drives,
      facts,
      readerQuestions,
      scenes,
      openQuestions,
      causes,
      deliberateGaps,
      versions,
      knowledge,
      objects,
      participants,
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
      causes,
      deliberateGaps,
      versions,
      knowledge,
      objects,
      participants,
      timeline,
    }),
  );
}

const compareStrings = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function compareKeys(a: readonly string[], b: readonly string[]): number {
  for (const [i, part] of a.entries()) {
    const order = compareStrings(part, b[i] ?? "");
    if (order !== 0) return order;
  }
  return 0;
}

function sortedBy<T>(items: readonly T[], key: (item: T) => string[]): T[] {
  return [...items].sort((a, b) => compareKeys(key(a), key(b)));
}

const byId = <T extends { id: string }>(items: readonly T[]) =>
  sortedBy(items, ({ id }) => [id]);
const sortedStrings = (items: readonly string[]) =>
  sortedBy(items, (item) => [item]);
const sortedRefs = (refs: readonly Ref[]) =>
  sortedBy(refs, (ref) => [
    ref.kind,
    ref.kind === "candidate" ? ref.questionId : "",
    ref.id,
  ]);

/**
 * Sorts every list whose order means nothing, because edits reorder them.
 * Scenes keep their order, which is the telling order.
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
        relations: sortedBy(drive.relations, ({ to, type }) => [to, type]),
        // In the order they happen.
        turns: drive.turns,
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
      reveals: sortedRefs(scene.reveals),
      implies: sortedRefs(scene.implies),
      withholds: sortedRefs(scene.withholds),
      plants: sortedRefs(scene.plants),
      paysOff: sortedRefs(scene.paysOff),
    })),
    openQuestions: byId(
      story.openQuestions.map(({ superseded, ...question }) => ({
        ...question,
        // In the order they happened.
        ...(superseded === undefined || superseded.length === 0
          ? {}
          : { superseded }),
        about: sortedRefs(question.about),
        candidates: byId(
          question.candidates.map((candidate) => ({
            ...candidate,
            touches: sortedRefs(candidate.touches),
          })),
        ),
      })),
    ),
    causes: sortedBy(story.causes, CAUSE_KEY),
    deliberateGaps: sortedBy(story.deliberateGaps, GAP_MARK_KEY),
    versions: byId(
      story.versions.map((version) => ({
        ...version,
        by: sortedStrings(version.by),
      })),
    ),
    knowledge: byId(story.knowledge),
    objects: byId(story.objects),
    participants: sortedBy(story.participants, PARTICIPANT_KEY),
    timeline: {
      ...timeline,
      events: byId(timeline.events),
      positions: sortedBy(timeline.positions, POSITION_KEY),
      constraints: byId(timeline.constraints),
      placements: sortedBy(
        timeline.placements.map((placement) => ({
          ...placement,
          constraints: sortedBy(
            placement.constraints,
            ({ event, relation, duration }) => [
              event,
              relation,
              JSON.stringify(withOrderedKeys(duration)),
            ],
          ),
        })),
        PLACEMENT_KEY,
      ),
      frames: byId(timeline.frames),
      correspondences: byId(timeline.correspondences),
      follows: sortedBy(timeline.follows, FOLLOWING_KEY),
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
  "causes",
  "deliberateGaps",
  "versions",
  "knowledge",
  "objects",
  "participants",
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
  "candidate",
  "answer",
  "touches",
  "rejected",
  "conflict",
  "leftOpen",
  "cause",
  "effect",
  "superseded",
  "by",
  "gap",
  "ref",
  "reason",
  "actor",
  "how",
  "what",
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
  const {
    causes,
    deliberateGaps,
    versions,
    knowledge,
    objects,
    participants,
    scenes,
    drives,
    ...rest
  } = normalized(story);
  const written = {
    ...rest,
    drives: drives.map(({ turns, ...drive }) => ({
      ...drive,
      ...(turns.length === 0 ? {} : { turns }),
    })),
    scenes: scenes.map((scene) => ({
      ...scene,
      // Links are left out when empty, so files without them read the same.
      ...Object.fromEntries(
        SCENE_LINK_KINDS.map((kind) => [
          kind,
          scene[kind].length === 0 ? undefined : scene[kind],
        ]),
      ),
    })),
    ...(causes.length === 0 ? {} : { causes }),
    ...(deliberateGaps.length === 0 ? {} : { deliberateGaps }),
    ...(versions.length === 0 ? {} : { versions }),
    ...(knowledge.length === 0 ? {} : { knowledge }),
    ...(objects.length === 0 ? {} : { objects }),
    ...(participants.length === 0 ? {} : { participants }),
  };
  return `${JSON.stringify(withOrderedKeys(written), null, 2)}\n`;
}
