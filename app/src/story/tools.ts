/**
 * The story's commands (`./commands.ts`) and read queries (`./queries.ts`)
 * as tools a model calls, bound to a world's `StorageAdapter`. Each tool has
 * a JSON Schema for its arguments, sent in the request as a
 * `ToolDefinition`, and an executor that checks the arguments against that
 * schema before anything runs.
 *
 * A mutation's schema parses to exactly its command's fields, checked at
 * compile time, so a field added to a command can't be left out here. Three
 * take friendlier arguments than the command holds and convert them, as the
 * CLI does: `setPosition` takes dates (`1954-10-12`), `constrain` takes
 * spans (`3d`), and `moveScene` and `removeDriveTurn` count from 1.
 *
 * Every call resolves to a `StoryToolResult` the model can read, refusals
 * included: an unknown tool, arguments that don't fit the schema (each
 * issue with its path), or a command or query the story refuses. Only a
 * failure of storage itself, or a stored bible that doesn't load, is an
 * error, since the model can't fix those. A mutation that saved is never
 * one: if its scene prose can't be read for the report after, every linked
 * scene is listed as not read and the report goes on without it.
 *
 * Nothing the story keeps is kept quiet. A mutation's result carries the
 * timeline problems and other contradictions it added, what went with a
 * removed record, links a replaced list dropped, links that now cancel out,
 * and every suspect that may still state what it changed, none cut short;
 * a query or mutation that reads prose also lists linked scenes whose
 * prose couldn't be read.
 */

import {
  errAsync,
  err as fail,
  ok,
  okAsync,
  type Result,
  type ResultAsync,
} from "neverthrow";
import { parseToolArguments } from "../llm/parse";
import type {
  JsonValue,
  ToolCall,
  ToolDefinition,
  ToolResultMessage,
} from "../llm/types";
import type { StorageAdapter } from "../storage/types";
import { WORLD_FRAME } from "../time/timeline";
import { parseSpan, parseWhen } from "./calendar";
import type { StoryCommand, StoryCommandType } from "./commands";
import { type EditReport, editReport, editReportLines } from "./edit-report";
import {
  contradictionsQuery,
  gapsQuery,
  LIST_KINDS,
  listQuery,
  mentionsQuery,
  type QueryError,
  type QueryResult,
  readerOrderQuery,
  renderQuery,
  scenesQuery,
  showQuery,
  spanQuery,
  touchesQuery,
  traceQuery,
} from "./queries";
import { formatRef } from "./refs";
import { RENDER_SECTION_NAMES } from "./render";
import {
  executeStoryCommand,
  loadStory,
  type StoryRecordChange,
  type StoryStoreError,
} from "./store";
import {
  type ProseNotRead,
  type StoredProse,
  storedProse,
  unreadProse,
} from "./stored-prose";
import {
  COUNT_DIRECTIONS,
  DRIVE_TURN_HOWS,
  GAP_KINDS,
  KNOWLEDGE_HOWS,
  SCENE_LINK_KINDS,
  type Story,
  type StoryError,
} from "./story";
import {
  array,
  boolean,
  convert,
  either,
  type Issue,
  integer,
  nullable,
  number,
  object,
  oneOf,
  ref,
  type Schema,
  string,
} from "./tool-schema";
import type { Suspect } from "./trace";

// ---------------------------------------------------------------------------
// Results.

/** Why a call was refused. The message is written for the model. */
export type StoryToolRefusal =
  | { kind: "unknown_tool"; message: string }
  /** The arguments don't fit the schema; `issues` says where. */
  | { kind: "invalid_arguments"; message: string; issues: Issue[] }
  /** The story refused it: `code` is a command's `StoryError` kind. */
  | { kind: "refused"; code?: string; message: string };

/** A suspect as data: a record by ref, or prose by document and block. */
export type SuspectData = {
  target:
    | { kind: "record"; ref: string }
    | {
        kind: "prose";
        scene: string;
        documentId: string | null;
        /** Null for the scene's prose as a whole. */
        blockId: string | null;
        text: string;
      };
  score: number;
  reasons: string[];
  /** Whether a reason is in its text, not only in its links. */
  inText: boolean;
};

/** An edit's report as data (`EditReport`), with refs and suspects as text. */
export type EditWarnings = Omit<EditReport, "stale"> & {
  stale:
    | {
        kind: "suspects";
        ref: string;
        suspects: SuspectData[];
        traced: number;
      }
    | Extract<EditReport["stale"], { kind: "countNote" }>
    | null;
};

export type StoryToolResult =
  | {
      ok: true;
      tool: string;
      kind: "query";
      /** The answer as the CLI prints it. */
      lines: string[];
      /** The same answer as data. */
      data: JsonValue;
      /** Linked scenes whose prose this query couldn't read. */
      proseNotRead?: ProseNotRead[];
    }
  | {
      ok: true;
      tool: string;
      kind: "mutation";
      /** What the edit did besides what it was told, as lines. */
      lines: string[];
      warnings: EditWarnings;
      /** Linked scenes whose prose the edit's trace couldn't read. */
      proseNotRead?: ProseNotRead[];
    }
  | { ok: false; tool: string; error: StoryToolRefusal };

/** A result as the text of a tool turn: its JSON, whole. */
export function storyToolResultContent(result: StoryToolResult): string {
  return JSON.stringify(result);
}

const toJson = (value: unknown): JsonValue =>
  value === undefined ? null : JSON.parse(JSON.stringify(value));

function suspectData(found: Suspect, prose: StoredProse): SuspectData {
  const { target } = found;
  const place =
    target.kind === "prose"
      ? prose.place(target.scene, target.line)
      : undefined;
  return {
    target:
      target.kind === "record"
        ? { kind: "record", ref: formatRef(target.ref) }
        : {
            kind: "prose",
            scene: target.scene,
            documentId: place?.documentId ?? null,
            blockId: place?.blockId ?? null,
            text: target.text,
          },
    score: found.score,
    reasons: found.reasons,
    inText: found.inText,
  };
}

function warningsData(report: EditReport, prose: StoredProse): EditWarnings {
  const { stale } = report;
  return {
    ...report,
    stale:
      stale === null || stale.kind === "countNote"
        ? stale
        : {
            kind: "suspects",
            ref: formatRef(stale.ref),
            suspects: stale.suspects.map((s) => suspectData(s, prose)),
            traced: stale.traced,
          },
  };
}

const notRead = (prose: StoredProse | undefined) =>
  prose === undefined || prose.notRead.length === 0
    ? {}
    : { proseNotRead: [...prose.notRead] };

// ---------------------------------------------------------------------------
// Tools.

/** What a query runs on: the stored story, and its prose if it reads any. */
type QueryContext = { story: Story; prose: StoredProse | undefined };

type QueryOutput = Result<QueryResult<unknown>, QueryError>;

export type StoryTool = {
  readonly name: string;
  readonly kind: "query" | "mutation";
  readonly description: string;
  readonly parameters: Schema<unknown>;
  /** Whether it reads scene prose, which loads the linked documents. */
  readonly readsProse: boolean;
  /** For a query: runs it on the parsed arguments. */
  readonly run?: (context: QueryContext, args: unknown) => QueryOutput;
  /** For a mutation: the command the parsed arguments make. */
  readonly command?: (args: unknown) => StoryCommand;
};

/** A schema as one of unknown type, for the registry's list. */
const erased = <T>(schema: Schema<T>): Schema<unknown> => ({
  json: schema.json,
  parse: schema.parse,
});

type CommandOf<K extends StoryCommandType> = Extract<StoryCommand, { type: K }>;

/** A command's fields: what a mutation's arguments must parse to. */
type FieldsOf<K extends StoryCommandType> = Omit<CommandOf<K>, "type">;

type MutationTool<K extends StoryCommandType> = StoryTool & {
  readonly name: K;
  readonly kind: "mutation";
};

/** Whether `A` and `B` have the same keys and each is assignable to the other. */
type Same<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? [Exclude<keyof A, keyof B> | Exclude<keyof B, keyof A>] extends [never]
      ? true
      : false
    : false
  : false;

/**
 * Nothing when a schema's type `T` is exactly the command's fields `F`;
 * otherwise a property no schema has, so the call doesn't compile, and the
 * error names the fields that differ.
 */
type MatchesFields<T, F> =
  Same<T, F> extends true
    ? unknown
    : {
        schemaDiffersFromCommand: {
          missing: Exclude<keyof F, keyof T>;
          extra: Exclude<keyof T, keyof F>;
        };
      };

/**
 * The tool for command `type`, whose arguments parse to exactly its fields:
 * a field missing from `parameters`, extra, or typed differently doesn't
 * compile.
 */
function mutation<K extends StoryCommandType, T>(
  type: K,
  description: string,
  parameters: Schema<T> & MatchesFields<T, FieldsOf<K>>,
): MutationTool<K> {
  return {
    name: type,
    kind: "mutation",
    description,
    parameters: erased(parameters),
    readsProse: true,
    // The arguments were parsed by `parameters`, so they are `FieldsOf<K>`,
    // and with `type` they are that command.
    command: (args) => ({ ...(args as FieldsOf<K>), type }) as CommandOf<K>,
  };
}

function query<A>(
  name: string,
  description: string,
  parameters: Schema<A>,
  run: (context: QueryContext, args: A) => QueryOutput,
  readsProse = false,
): StoryTool {
  return {
    name,
    kind: "query",
    description,
    parameters: erased(parameters),
    readsProse,
    // The arguments were parsed by `parameters`, so they are `A`.
    run: (context, args) => run(context, args as A),
  };
}

const id = (what: string) => string(`The ${what}'s ID.`);
const events = (what: string) => array(string(), `Event IDs: ${what}.`);
const refs = (what: string) => array(ref(), what);
const noArgs = object({});

const ACTOR_KINDS = ["person", "organization"] as const;
const DRIVE_RELATIONS = ["opposes", "allies", "competes"] as const;
const TIME_RELATIONS = ["before", "after", "during", "simultaneous"] as const;

const WHEN_HELP =
  'a year (1954), month (1954-10), day (1954-10-12) or minute ("1954-10-12 21:00"), each meaning all of that span, or a fractional year (1954.8) for that moment';

const SPAN_HELP = "in years (3) or with a unit: 3d, 2w, 6h, 4mo, 2 weeks";

const threshold = either(
  number(),
  oneOf(["more_than_half"]),
  "The value a count is measured against: a number, or more_than_half of its total.",
);

const setPosition = convert(
  object(
    {
      event: id("event"),
      start: nullable(
        string(`When it starts: ${WHEN_HELP}. null unplaces the event.`),
      ),
    },
    {
      end: string(
        `When it ends, default the end of the start's span: ${WHEN_HELP}. 1950 to 1960 runs through 1960.`,
      ),
      precision: string(
        'Your words on how exact it is, such as "roughly"; shown beside the position, which it doesn\'t change.',
      ),
    },
  ),
  ({
    event,
    start,
    end,
    precision,
  }): Result<FieldsOf<"setPosition">, Issue[]> => {
    if (start === null) {
      return ok({ event, frame: WORLD_FRAME, position: null });
    }
    const from = parseWhen(start).mapErr((m): Issue[] => [
      { path: "start", message: m },
    ]);
    const to =
      end === undefined
        ? ok(undefined)
        : parseWhen(end).mapErr((m): Issue[] => [{ path: "end", message: m }]);
    return from.andThen((span) =>
      to.map((last) => ({
        event,
        frame: WORLD_FRAME,
        position: {
          start: span.start,
          end: last === undefined ? span.end : last.end,
          ...(precision === undefined ? {} : { precision }),
        },
      })),
    );
  },
);

const constrain = convert(
  object(
    {
      id: string("The constraint's ID, to change or remove it later."),
      a: id("first event"),
      relation: oneOf(TIME_RELATIONS, "a before|after|during|simultaneous b."),
      b: id("second event"),
    },
    {
      gap: string(
        `With before or after: how long between a and b, ${SPAN_HELP}.`,
      ),
      tolerance: string(
        `Give or take, with gap, ${SPAN_HELP}; default half the gap's unit.`,
      ),
    },
  ),
  ({ gap, tolerance, ...rest }): Result<FieldsOf<"constrain">, Issue[]> => {
    if (gap === undefined) {
      return tolerance === undefined
        ? ok(rest)
        : fail([{ path: "tolerance", message: "is only for a gap" }]);
    }
    return parseSpan(gap)
      .mapErr((m): Issue[] => [{ path: "gap", message: m }])
      .andThen((span) => {
        // A gap in years keeps the timeline's default of half a year.
        const given =
          tolerance === undefined
            ? ok(span.unit === 1 ? undefined : span.unit / 2)
            : parseSpan(tolerance)
                .map((t): number | undefined => t.years)
                .mapErr((m): Issue[] => [{ path: "tolerance", message: m }]);
        return given.map((t) => ({
          ...rest,
          duration: {
            amount: span.years,
            frame: WORLD_FRAME,
            ...(t === undefined ? {} : { tolerance: t }),
          },
        }));
      });
  },
);

/** A position from 1 as an index from 0. */
const fromOne = (what: string) =>
  convert(integer(`${what}, counting from 1.`), (n) =>
    n >= 1 ? ok(n - 1) : fail("must be 1 or more"),
  );

/** Every command, by type: the mapped type makes leaving one out an error. */
const MUTATIONS: { [K in StoryCommandType]: MutationTool<K> } = {
  setPremise: mutation(
    "setPremise",
    "Replace the story's premise.",
    object({ premise: string() }),
  ),
  addActor: mutation(
    "addActor",
    "Add a person or group (organization).",
    object({
      id: id("actor"),
      name: string(),
      kind: oneOf(ACTOR_KINDS),
      notes: string(),
    }),
  ),
  updateActor: mutation(
    "updateActor",
    "Change an actor; fields left out are kept.",
    object(
      { id: id("actor") },
      { name: string(), kind: oneOf(ACTOR_KINDS), notes: string() },
    ),
  ),
  removeActor: mutation(
    "removeActor",
    "Remove an actor. Their drives stay, held by nobody; their knowledge, parts in events and memberships go, and scenes through their eyes lose their viewpoint. The result lists what else went.",
    object({ id: id("actor") }),
  ),
  addMembership: mutation(
    "addMembership",
    "Say an actor (member) belongs to a group actor, from event since until event until; either left out means always.",
    object(
      {
        id: id("membership"),
        member: id("member actor"),
        group: id("group actor"),
      },
      { since: id("event it starts at"), until: id("event it ends at") },
    ),
  ),
  updateMembership: mutation(
    "updateMembership",
    "Change when a membership starts or ends; null clears either, a field left out is kept.",
    object(
      { id: id("membership") },
      { since: nullable(string()), until: nullable(string()) },
    ),
  ),
  removeMembership: mutation(
    "removeMembership",
    "Remove a membership.",
    object({ id: id("membership") }),
  ),
  addDrive: mutation(
    "addDrive",
    "Add a want, held by an actor or (actorId null) nobody yet.",
    object({
      id: id("drive"),
      actorId: nullable(string("The holder's actor ID.")),
      want: string(),
      stakes: string(),
      method: string(),
    }),
  ),
  updateDrive: mutation(
    "updateDrive",
    "Change a drive; fields left out are kept, actorId null clears the holder.",
    object(
      { id: id("drive") },
      {
        actorId: nullable(string()),
        want: string(),
        stakes: string(),
        method: string(),
      },
    ),
  ),
  removeDrive: mutation(
    "removeDrive",
    "Remove a drive and every link to it. The result lists what else went.",
    object({ id: id("drive") }),
  ),
  setDriveOrigins: mutation(
    "setDriveOrigins",
    "Set the events that created the drive, replacing the list ([] clears it).",
    object({ id: id("drive"), origins: events("the drive's origins") }),
  ),
  relateDrives: mutation(
    "relateDrives",
    "Relate two drives. Two drives have one relation at most, either way round.",
    object({
      from: id("drive holding the relation"),
      to: id("other drive"),
      relation: oneOf(DRIVE_RELATIONS),
    }),
  ),
  unrelateDrives: mutation(
    "unrelateDrives",
    "Remove the relation between two drives, whichever holds it.",
    object({ a: id("one drive"), b: id("other drive") }),
  ),
  addFact: mutation(
    "addFact",
    "Add a fact about the world, about the records it names.",
    object({
      id: id("fact"),
      text: string(),
      about: refs("What it is about."),
    }),
  ),
  updateFact: mutation(
    "updateFact",
    "Change a fact; fields left out are kept.",
    object(
      { id: id("fact") },
      { text: string(), about: refs("What it is about.") },
    ),
  ),
  removeFact: mutation(
    "removeFact",
    "Remove a fact. Knowledge of it goes too; the result lists what went.",
    object({ id: id("fact") }),
  ),
  addReaderQuestion: mutation(
    "addReaderQuestion",
    "Add a question the reader will be waiting on.",
    object({ id: id("reader question"), question: string() }),
  ),
  updateReaderQuestion: mutation(
    "updateReaderQuestion",
    "Reword a reader question.",
    object({ id: id("reader question"), question: string() }),
  ),
  removeReaderQuestion: mutation(
    "removeReaderQuestion",
    "Remove a reader question. Knowledge of it goes too; the result lists what went.",
    object({ id: id("reader question") }),
  ),
  setReaderQuestionScenes: mutation(
    "setReaderQuestionScenes",
    "Set the scenes that raise and answer a reader question; null clears either.",
    object({
      id: id("reader question"),
      opensAt: nullable(string("The scene ID that raises it.")),
      answeredAt: nullable(string("The scene ID that answers it.")),
    }),
  ),
  addScene: mutation(
    "addScene",
    "Add a scene at the end of the telling order.",
    object({ id: id("scene"), title: string(), summary: string() }),
  ),
  updateScene: mutation(
    "updateScene",
    "Change a scene's title or summary; fields left out are kept.",
    object({ id: id("scene") }, { title: string(), summary: string() }),
  ),
  removeScene: mutation(
    "removeScene",
    "Remove a scene and links to it. Its prose document is left alone. The result lists what else went.",
    object({ id: id("scene") }),
  ),
  moveScene: mutation(
    "moveScene",
    "Move a scene to a place in the telling order.",
    convert(
      object({ id: id("scene"), position: fromOne("The place") }),
      ({ id: scene, position }) => ok({ id: scene, index: position }),
    ),
  ),
  setSceneActors: mutation(
    "setSceneActors",
    "Set who is in the scene, replacing the list ([] clears it).",
    object({ id: id("scene"), actors: array(string(), "Actor IDs.") }),
  ),
  setSceneViewpoint: mutation(
    "setSceneViewpoint",
    "Say whose eyes the scene is told through; null clears it.",
    object({ id: id("scene"), actor: nullable(string("The actor ID.")) }),
  ),
  setSceneDocument: mutation(
    "setSceneDocument",
    "Link the scene to the document holding its prose; null unlinks it. Two scenes never share one.",
    object({ id: id("scene"), documentId: nullable(string()) }),
  ),
  setSceneChapter: mutation(
    "setSceneChapter",
    "Say which book and chapter the scene is packaged in; null clears either.",
    object({
      id: id("scene"),
      book: nullable(string()),
      chapter: nullable(string()),
    }),
  ),
  setSceneEvents: mutation(
    "setSceneEvents",
    "Set the events the scene shows, replacing the list ([] clears it).",
    object({ id: id("scene"), depicts: events("what the scene shows") }),
  ),
  setScenePressures: mutation(
    "setScenePressures",
    "Set the drives the scene puts under pressure, replacing the list ([] clears it).",
    object({
      id: id("scene"),
      pressures: array(string(), "Drive IDs."),
    }),
  ),
  setSceneLinks: mutation(
    "setSceneLinks",
    "Set the records the scene reveals (tells the reader), implies (lets the reader infer), withholds (keeps back), plants (sets up to matter later) or paysOff (brings back what was planted). The refs replace that list; the result names any it dropped, so to add one, give the list with it.",
    object({
      id: id("scene"),
      how: oneOf(SCENE_LINK_KINDS),
      refs: refs("The records, any kind, candidates included."),
    }),
  ),
  addOpenQuestion: mutation(
    "addOpenQuestion",
    "Add something undecided, with candidate answers to weigh later. conflict marks it as a contradiction to resolve.",
    object({
      id: id("open question"),
      question: string(),
      about: refs("What it is about."),
      conflict: boolean(),
    }),
  ),
  updateOpenQuestion: mutation(
    "updateOpenQuestion",
    "Change an open question; fields left out are kept.",
    object(
      { id: id("open question") },
      {
        question: string(),
        about: refs("What it is about."),
        conflict: boolean(),
      },
    ),
  ),
  removeOpenQuestion: mutation(
    "removeOpenQuestion",
    "Remove an open question and its candidates. The result lists what else went.",
    object({ id: id("open question") }),
  ),
  addCandidate: mutation(
    "addCandidate",
    "Add a candidate answer to an open question, with the records it would touch.",
    object({
      questionId: id("open question"),
      id: id("candidate"),
      answer: string(),
      touches: refs("The records it would touch."),
    }),
  ),
  updateCandidate: mutation(
    "updateCandidate",
    "Change a candidate answer; fields left out are kept.",
    object(
      { questionId: id("open question"), id: id("candidate") },
      { answer: string(), touches: refs("The records it would touch.") },
    ),
  ),
  removeCandidate: mutation(
    "removeCandidate",
    "Remove a candidate answer; if it was chosen, the answer is kept as superseded.",
    object({ questionId: id("open question"), id: id("candidate") }),
  ),
  answerOpenQuestion: mutation(
    "answerOpenQuestion",
    "Choose a candidate. An answer it replaces is kept as superseded. Nothing else changes: make what it implies with other tools.",
    object({ id: id("open question"), candidateId: id("candidate") }),
  ),
  unanswerOpenQuestion: mutation(
    "unanswerOpenQuestion",
    "Make the question open again; the answer is kept as superseded.",
    object({ id: id("open question") }),
  ),
  rejectCandidate: mutation(
    "rejectCandidate",
    "Rule a candidate out, keeping it and the reason; reason null puts it back in the running. Refused for the chosen answer.",
    object({
      questionId: id("open question"),
      id: id("candidate"),
      reason: nullable(string()),
    }),
  ),
  leaveForReader: mutation(
    "leaveForReader",
    "Leave the question open for the reader on purpose, with why; reason null takes the mark off.",
    object({ id: id("open question"), reason: nullable(string()) }),
  ),
  addEvent: mutation(
    "addEvent",
    "Add an event. Place it with setPosition or constrain.",
    object({ id: id("event"), label: string(), summary: string() }),
  ),
  describeEvent: mutation(
    "describeEvent",
    "Change an event's label or summary; fields left out are kept.",
    object({ id: id("event") }, { label: string(), summary: string() }),
  ),
  addCause: mutation(
    "addCause",
    "Record that effect happened because of cause. An effect placed before its cause, or a circle of causes, is kept and reported.",
    object({ cause: id("cause event"), effect: id("effect event") }),
  ),
  removeCause: mutation(
    "removeCause",
    "Remove a cause recorded between two events.",
    object({ cause: id("cause event"), effect: id("effect event") }),
  ),
  removeEvent: mutation(
    "removeEvent",
    "Remove an event, its position, constraints, causes and links. Its versions and participants go too; the result lists what went.",
    object({ id: id("event") }),
  ),
  addVersion: mutation(
    "addVersion",
    "Add one account of an event, told by the actors in by. It can be true, partial or a lie.",
    object({
      id: id("version"),
      event: id("event"),
      text: string(),
      by: array(string(), "Actor IDs of its tellers."),
    }),
  ),
  updateVersion: mutation(
    "updateVersion",
    "Change a version's event, text or tellers; fields left out are kept.",
    object(
      { id: id("version") },
      {
        event: id("event"),
        text: string(),
        by: array(string(), "Actor IDs of its tellers."),
      },
    ),
  ),
  removeVersion: mutation(
    "removeVersion",
    "Remove a version, knowledge of it, and links to both; the result lists what went.",
    object({ id: id("version") }),
  ),
  addKnowledge: mutation(
    "addKnowledge",
    "Say an actor knows or believes a record, from event since until event until; either left out means always. To tell the reader, have a scene reveal knowledge:<id>.",
    object(
      {
        id: id("knowledge"),
        actor: id("actor"),
        how: oneOf(KNOWLEDGE_HOWS),
        what: ref("What they know or believe"),
      },
      { since: id("event it starts at"), until: id("event it ends at") },
    ),
  ),
  updateKnowledge: mutation(
    "updateKnowledge",
    "Change what an actor knows or believes, or from and until when; null clears since or until, a field left out is kept.",
    object(
      { id: id("knowledge") },
      {
        how: oneOf(KNOWLEDGE_HOWS),
        what: ref("What they know or believe"),
        since: nullable(string()),
        until: nullable(string()),
      },
    ),
  ),
  removeKnowledge: mutation(
    "removeKnowledge",
    "Remove what an actor knows or believes, and links to it; the result lists what else went.",
    object({ id: id("knowledge") }),
  ),
  addObject: mutation(
    "addObject",
    "Add a thing that matters: a knife, a letter.",
    object({ id: id("object"), name: string(), notes: string() }),
  ),
  updateObject: mutation(
    "updateObject",
    "Change an object's name or notes; fields left out are kept.",
    object({ id: id("object") }, { name: string(), notes: string() }),
  ),
  removeObject: mutation(
    "removeObject",
    "Remove an object, its parts in events, knowledge of it, and links to it; the result lists what went.",
    object({ id: id("object") }),
  ),
  addCount: mutation(
    "addCount",
    "Add a number that changes at events: hands aboard, days of food. total and of (another count's ID, as its total) are alternatives. Set its values with setCount.",
    object(
      { id: id("count"), label: string(), notes: string() },
      {
        total: number(),
        of: string("Another count's ID, whose value is this one's total."),
        threshold,
        direction: oneOf(COUNT_DIRECTIONS, "The way it only ever moves."),
      },
    ),
  ),
  updateCount: mutation(
    "updateCount",
    "Change a count; null clears total, of, threshold or direction, a field left out is kept.",
    object(
      { id: id("count") },
      {
        label: string(),
        notes: string(),
        total: nullable(number()),
        of: nullable(string()),
        threshold: nullable(threshold),
        direction: nullable(oneOf(COUNT_DIRECTIONS)),
      },
    ),
  ),
  removeCount: mutation(
    "removeCount",
    "Remove a count, its values, and links to it.",
    object({ id: id("count") }),
  ),
  setCount: mutation(
    "setCount",
    "Set a count's value from event at on, until its next value in story order; value null removes it. Without note, a value already there keeps its note.",
    object(
      {
        id: id("count"),
        at: id("event"),
        value: nullable(number()),
      },
      { note: string() },
    ),
  ),
  setParticipant: mutation(
    "setParticipant",
    "Say an actor or object takes part in an event, with its part in words. Setting it again replaces the role.",
    object({
      event: id("event"),
      who: ref("The actor or object"),
      role: string(),
    }),
  ),
  removeParticipant: mutation(
    "removeParticipant",
    "Say an actor or object takes no part in an event after all.",
    object({ event: id("event"), who: ref("The actor or object") }),
  ),
  addDriveTurn: mutation(
    "addDriveTurn",
    "Add a turn at the end of a drive's life: satisfied, renounced, replaced (by the drive into) or flipped (into its opposite, the drive into).",
    object(
      { drive: id("drive"), how: oneOf(DRIVE_TURN_HOWS), note: string() },
      {
        at: id("event it turns at"),
        into: string("For replaced or flipped: the other drive's ID."),
      },
    ),
  ),
  removeDriveTurn: mutation(
    "removeDriveTurn",
    "Remove a turn from a drive's life.",
    convert(
      object({ drive: id("drive"), position: fromOne("The turn") }),
      ({ drive, position }) => ok({ drive, index: position }),
    ),
  ),
  markGapDeliberate: mutation(
    "markGapDeliberate",
    "Mark one gap on one record (ref null: on the whole story) as deliberate, so gaps stops listing it. Give the kind and ref as the gaps tool lists them.",
    object({
      gap: oneOf(GAP_KINDS),
      ref: nullable(ref()),
      reason: string(),
    }),
  ),
  unmarkGapDeliberate: mutation(
    "unmarkGapDeliberate",
    "Remove a deliberate mark, so gaps lists the gap again.",
    object({ gap: oneOf(GAP_KINDS), ref: nullable(ref()) }),
  ),
  setPosition: mutation(
    "setPosition",
    "Place an event in story time, or unplace it. A move that contradicts other events is kept and reported.",
    setPosition,
  ),
  constrain: mutation(
    "constrain",
    "Order two events: a before|after|during|simultaneous b, optionally with the gap. A contradiction is kept and reported.",
    constrain,
  ),
  removeConstraint: mutation(
    "removeConstraint",
    "Remove a constraint between events.",
    object({ id: id("constraint") }),
  ),
};

const QUERIES: readonly StoryTool[] = [
  query(
    "show",
    "One record with its IDs and links, and the record as stored.",
    object({ ref: ref() }),
    ({ story, prose }, { ref: r }) => showQuery(story, r, prose),
    true,
  ),
  query(
    "list",
    `List records with their refs: one kind (${LIST_KINDS.join(", ")}), or everything.`,
    object({}, { kind: oneOf(LIST_KINDS) }),
    ({ story }, { kind }) => ok(listQuery(story, kind)),
  ),
  query(
    "touches",
    "What a record or candidate is connected to: its declared links, plus one step further.",
    object({ ref: ref() }),
    ({ story }, { ref: r }) => touchesQuery(story, r),
  ),
  query(
    "scenes",
    "The scenes that touch a record, in telling order, and how.",
    object({ ref: ref() }),
    ({ story }, { ref: r }) => scenesQuery(story, r),
  ),
  query(
    "readerOrder",
    "The order the reader learns things in, beside the order they happen. With before, only what the scenes before that scene have told the reader, what is held back, and each count as the scene opens.",
    object({}, { before: id("scene") }),
    ({ story }, { before }) => readerOrderQuery(story, before),
  ),
  query(
    "span",
    "The time from one placed event to another, start to start.",
    object({ from: id("first event"), to: id("second event") }),
    ({ story }, { from, to }) => spanQuery(story, from, to),
  ),
  query(
    "trace",
    "What may depend on a record, likeliest first, each with why it is suspected: links, text naming it, free text and scene prose sharing its words. It suspects and never decides: read each and judge.",
    object({ ref: ref() }),
    ({ story, prose }, { ref: r }) =>
      traceQuery(story, r, prose).map(({ lines, data }) => ({
        lines,
        data:
          prose === undefined
            ? data
            : data.map((found) => suspectData(found, prose)),
      })),
    true,
  ),
  query(
    "mentions",
    "Free text in the records that mentions a record: its name, holder, year, and spans near an event.",
    object({ ref: ref() }),
    ({ story }, { ref: r }) => mentionsQuery(story, r),
  ),
  query(
    "gaps",
    "Optional prompts: what could still be linked or added. Advisory, never a reason to cut anything true.",
    noArgs,
    ({ story }) => ok(gapsQuery(story)),
  ),
  query(
    "contradictions",
    "Timeline problems, effects before their causes, circles of causes, knowledge or memberships that end before they start, counts past their totals, and open questions marked as conflicts.",
    noArgs,
    ({ story }) => ok(contradictionsQuery(story)),
  ),
  query(
    "render",
    `The whole bible as readable text, or only some sections: ${RENDER_SECTION_NAMES.join(", ")}.`,
    object({}, { sections: array(string()) }),
    ({ story }, { sections }) => renderQuery(story, sections),
  ),
];

/** Every story tool: the queries, then the mutations. */
export const STORY_TOOLS: readonly StoryTool[] = [
  ...QUERIES,
  ...Object.values(MUTATIONS),
];

const BY_NAME = new Map(STORY_TOOLS.map((tool) => [tool.name, tool]));

/** The tool named `name`, if there is one. */
export const storyTool = (name: string): StoryTool | undefined =>
  BY_NAME.get(name);

/** A tool as a request sends it. */
export function toolDefinition(tool: StoryTool): ToolDefinition {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters.json,
    },
  };
}

/** The definitions of the tools named, or of every story tool. */
export function storyToolDefinitions(
  names?: readonly string[],
): ToolDefinition[] {
  const tools =
    names === undefined
      ? STORY_TOOLS
      : names.flatMap((name) => {
          const tool = BY_NAME.get(name);
          return tool === undefined ? [] : [tool];
        });
  return tools.map(toolDefinition);
}

// ---------------------------------------------------------------------------
// Executing.

/** Kinds of `StoryError` that refuse a command; the rest mean a bad store. */
const REFUSALS: ReadonlySet<string> = new Set([
  "unknown_id",
  "duplicate_id",
  "self_relation",
  "relation_exists",
  "invalid_command",
]);

const isRefusal = (
  error: StoryStoreError,
): error is Extract<StoryError, { command: string }> =>
  REFUSALS.has(error.kind);

const refusal = (tool: string, error: StoryToolRefusal): StoryToolResult => ({
  ok: false,
  tool,
  error,
});

const invalidArguments = (tool: string, issues: Issue[]) =>
  refusal(tool, {
    kind: "invalid_arguments",
    message: `The arguments for ${tool} don't fit its schema: ${issues
      .map((i) => (i.path === "" ? i.message : `${i.path} ${i.message}`))
      .join("; ")}`,
    issues,
  });

/** A tool's result, and the story records it changed (none for a query). */
export type StoryToolRun = {
  result: StoryToolResult;
  changes: readonly StoryRecordChange[];
};

const answered = (result: StoryToolResult) =>
  okAsync<StoryToolRun, StoryStoreError>({ result, changes: [] });

/**
 * Runs the story tool `name` with `args` against the world in `storage`.
 * A mutation is saved before this resolves; `now` stamps what it wrote.
 */
export function executeStoryTool(
  storage: StorageAdapter,
  name: string,
  args: unknown,
  now: number = Date.now(),
): ResultAsync<StoryToolResult, StoryStoreError> {
  return runStoryTool(storage, name, args, now).map(({ result }) => result);
}

/** `executeStoryTool`, with the records a mutation changed. */
export function runStoryTool(
  storage: StorageAdapter,
  name: string,
  args: unknown,
  now: number = Date.now(),
): ResultAsync<StoryToolRun, StoryStoreError> {
  const tool = BY_NAME.get(name);
  if (tool === undefined) {
    return answered(
      refusal(name, {
        kind: "unknown_tool",
        message: `There is no story tool ${name}. The tools are ${STORY_TOOLS.map((t) => t.name).join(", ")}.`,
      }),
    );
  }
  const parsed = tool.parameters.parse(args, "");
  if (parsed.isErr()) return answered(invalidArguments(name, parsed.error));
  const { command, run } = tool;
  if (command !== undefined) {
    return runMutation(storage, name, command(parsed.value), now);
  }
  if (run === undefined) {
    throw new Error(`story tool ${name} has neither a command nor a query`);
  }
  return loadStory(storage).andThen((story) =>
    (tool.readsProse
      ? storedProse(storage, story).map((prose) => prose)
      : okAsync(undefined)
    ).map((prose): StoryToolRun => {
      const answer = run({ story, prose }, parsed.value);
      if (answer.isErr()) {
        const { kind, message } = answer.error;
        return {
          result:
            kind === "invalid"
              ? invalidArguments(name, [{ path: "", message }])
              : refusal(name, { kind: "refused", message }),
          changes: [],
        };
      }
      return {
        result: {
          ok: true,
          tool: name,
          kind: "query",
          lines: answer.value.lines,
          data: toJson(answer.value.data),
          ...notRead(prose),
        },
        changes: [],
      };
    }),
  );
}

/**
 * Runs `command` as the agent's tool call of the same name runs it: the same
 * save and the same report of what it kept and what may now be stale. A
 * control that edits the bible directly builds its command and calls this,
 * so it never takes a path of its own.
 */
export function runStoryCommand(
  storage: StorageAdapter,
  command: StoryCommand,
  now: number = Date.now(),
): ResultAsync<StoryToolRun, StoryStoreError> {
  return runMutation(storage, command.type, command, now);
}

function runMutation(
  storage: StorageAdapter,
  name: string,
  command: StoryCommand,
  now: number,
) {
  return executeStoryCommand(storage, command, now)
    .andThen(({ before, story: after, problems, changes }) =>
      // The edit is saved: a failed read of its prose narrows the report,
      // and doesn't make the edit read as failed.
      storedProse(storage, after)
        .orElse((error) =>
          okAsync<StoredProse, StoryStoreError>(unreadProse(after, error)),
        )
        .map((prose): StoryToolRun => {
          const report = editReport(before, after, command, {
            problems,
            prose: prose.prose,
          });
          return {
            result: {
              ok: true,
              tool: name,
              kind: "mutation",
              lines: editReportLines(after, report, { source: prose }),
              warnings: warningsData(report, prose),
              ...notRead(prose),
            },
            changes,
          };
        }),
    )
    .orElse((error) =>
      isRefusal(error)
        ? answered(
            refusal(name, {
              kind: "refused",
              code: error.kind,
              message: error.message,
            }),
          )
        : errAsync<StoryToolRun, StoryStoreError>(error),
    );
}

/**
 * Runs a model's tool call and gives the tool turn answering it, and the
 * story records it changed. Arguments that aren't a JSON object are refused
 * as `invalid_arguments`.
 */
export function executeStoryToolCall(
  storage: StorageAdapter,
  call: ToolCall,
  now: number = Date.now(),
) {
  const name = call.function.name;
  const args = parseToolArguments(call);
  const run = args.isErr()
    ? answered(
        invalidArguments(name, [{ path: "", message: args.error.message }]),
      )
    : runStoryTool(storage, name, args.value, now);
  return run.map(
    ({ result, changes }): StoryToolRun & { message: ToolResultMessage } => ({
      result,
      changes,
      message: {
        role: "tool",
        tool_call_id: call.id,
        content: storyToolResultContent(result),
      },
    }),
  );
}
