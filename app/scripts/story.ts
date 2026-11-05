/**
 * A command line for sketching and reworking a story held in one file
 * (`src/story/`). It's a thin wrapper: each edit is one `StoryCommand`, and
 * the file is written only if the command succeeds. Run it with `--help`.
 *
 * Exit codes: 0 on success (including an edit that adds a timeline problem,
 * which is kept and printed), 1 when a command is refused or a file can't be
 * read or written, 2 for a malformed command line.
 */

import { createHash } from "node:crypto";
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { err, ok, Result } from "neverthrow";
import {
  describeBetween,
  describeSpan,
  describeYears,
  parseSpan,
  parseWhen,
  type Span,
} from "../src/story/calendar";
import {
  applyStoryCommand,
  type StoryCommand,
  type StoryCommandType,
} from "../src/story/commands";
import {
  storyContradictions,
  timelineProblemMessage,
} from "../src/story/contradictions";
import {
  belowThreshold,
  type CountStep,
  countSeries,
  seriesTexts,
  stepAt,
  stepText,
} from "../src/story/counts";
import { deliberateGaps, storyGaps } from "../src/story/gaps";
import {
  type FirstTold,
  knowledgeAlways,
  type TellingHow,
  type ToldSoFar,
  tellingOrder,
  tellingWords,
  toldBefore,
  trueOrder,
} from "../src/story/learning";
import { type Mention, storyTexts, whatMentions } from "../src/story/mentions";
import {
  eventTime,
  RENDER_SECTION_NAMES,
  renderStory,
  wordCount,
} from "../src/story/render";
import { scenesTouching } from "../src/story/scenes";
import {
  type Candidate,
  COUNT_DIRECTIONS,
  type CountDirection,
  DRIVE_TURN_HOWS,
  GAP_KINDS,
  type GapKind,
  KNOWLEDGE_HOWS,
  type Knowledge,
  newStory,
  type OpenQuestion,
  PARTICIPANT_KEY,
  type Participant,
  parseStory,
  type QuestionState,
  questionState,
  type Ref,
  type RefKind,
  refExists,
  SCENE_LINK_KINDS,
  type Story,
  serializeStory,
} from "../src/story/story";
import {
  refLabel,
  TOUCH_KINDS,
  type TouchGroups,
  whatThisTouches,
} from "../src/story/touches";
import { type Prose, type Suspect, traceDependents } from "../src/story/trace";
import { WORLD_FRAME } from "../src/time/timeline";

// ---------------------------------------------------------------------------
// Refs as text: `drive:shut`, `candidate:why/ferryman`.

export const KIND_NAMES: Record<Ref["kind"], string> = {
  actor: "actor",
  drive: "drive",
  fact: "fact",
  readerQuestion: "reader-question",
  event: "event",
  scene: "scene",
  openQuestion: "open-question",
  candidate: "candidate",
  version: "version",
  knowledge: "knowledge",
  object: "object",
  count: "count",
};

const REF_KIND_BY_NAME = new Map(
  Object.entries(KIND_NAMES).map(([kind, name]) => [name, kind]),
);

const isRefKind = (kind: string | undefined): kind is RefKind =>
  kind !== undefined && kind !== "candidate" && kind in KIND_NAMES;

export function formatRef(ref: Ref): string {
  const name = KIND_NAMES[ref.kind];
  return ref.kind === "candidate"
    ? `${name}:${ref.questionId}/${ref.id}`
    : `${name}:${ref.id}`;
}

export function parseRef(text: string): Result<Ref, string> {
  const colon = text.indexOf(":");
  const kind = REF_KIND_BY_NAME.get(text.slice(0, colon));
  const id = text.slice(colon + 1);
  if (colon === -1 || kind === undefined || id === "") {
    return err(
      `"${text}" is not a ref: write kind:id, with kind one of ${Object.values(KIND_NAMES).join(", ")} (a candidate is candidate:question/candidate)`,
    );
  }
  if (kind === "candidate") {
    const slash = id.indexOf("/");
    return slash <= 0 || slash === id.length - 1
      ? err(
          `"${text}" is not a candidate ref: write candidate:question/candidate`,
        )
      : ok({
          kind: "candidate",
          questionId: id.slice(0, slash),
          id: id.slice(slash + 1),
        });
  }
  return isRefKind(kind) ? ok({ kind, id }) : err(`unknown kind in "${text}"`);
}

// ---------------------------------------------------------------------------
// Command-line specs and parsing.

/** `value` is the placeholder shown in usage, such as `<text>`. */
/** A `required` flag is shown without brackets in usage. */
type Flag =
  | { value: string; help?: string; required?: true }
  | { bool: true; help?: string };

type Spec = {
  group: string;
  /** Positional names: `name`, `[name]` (optional) or `name...` (any number). */
  args: readonly string[];
  flags?: Readonly<Record<string, Flag>>;
  summary: string;
  /** The arguments after `<file>`, starting with the command name. */
  example: readonly string[];
  /** Another name the command answers to, such as `update-event`. */
  alias?: string;
};

type Parsed = {
  positional: Map<string, string | undefined>;
  rest: string[];
  flags: Map<string, string | boolean>;
};

function parseArgs(
  spec: Spec,
  argv: readonly string[],
): Result<Parsed, string> {
  const flags = new Map<string, string | boolean>();
  const values: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i] ?? "";
    if (!token.startsWith("--")) {
      values.push(token);
      continue;
    }
    const eq = token.indexOf("=");
    const raw = eq === -1 ? token.slice(2) : token.slice(2, eq);
    const negated = raw.startsWith("no-") && !(raw in (spec.flags ?? {}));
    const name = negated ? raw.slice(3) : raw;
    const flag = spec.flags?.[name];
    if (flag === undefined) return err(`unknown option --${raw}`);
    if (flags.has(name)) return err(`--${name} is given twice`);
    if ("bool" in flag) {
      if (eq !== -1) return err(`--${name} takes no value`);
      flags.set(name, !negated);
    } else {
      if (negated) return err(`unknown option --${raw}`);
      const value = eq === -1 ? argv[++i] : token.slice(eq + 1);
      if (value === undefined) return err(`--${name} needs a value`);
      flags.set(name, value);
    }
  }
  const positional = new Map<string, string | undefined>();
  let rest: string[] = [];
  for (const arg of spec.args) {
    if (arg.endsWith("...")) {
      rest = values.splice(0);
    } else if (arg.startsWith("[")) {
      positional.set(arg.slice(1, -1), values.shift());
    } else {
      const value = values.shift();
      if (value === undefined) return err(`missing <${arg}>`);
      positional.set(arg, value);
    }
  }
  if (values.length > 0) {
    return err(
      `unexpected argument "${values[0]}" (put text with spaces in quotes)`,
    );
  }
  return ok({ positional, rest, flags });
}

/**
 * Reads parsed arguments by name for one command. A bad value is recorded in
 * `errors` and a placeholder returned, so a command can be built in one
 * expression and discarded if anything was wrong.
 */
class Reader {
  readonly errors: string[] = [];
  constructor(private readonly parsed: Parsed) {}

  arg(name: string): string {
    return this.parsed.positional.get(name) ?? "";
  }

  optionalArg(name: string): string | undefined {
    return this.parsed.positional.get(name);
  }

  /** The remaining arguments; a lone `none` is an empty list. */
  rest(): string[] {
    const { rest } = this.parsed;
    return rest.length === 1 && rest[0] === "none" ? [] : rest;
  }

  /** The remaining arguments as refs; a lone `none` is an empty list. */
  restRefs(): Ref[] {
    return this.rest().flatMap((value) => {
      const ref = parseRef(value);
      if (ref.isOk()) return [ref.value];
      this.errors.push(ref.error);
      return [];
    });
  }

  text(flag: string): string | undefined {
    const value = this.parsed.flags.get(flag);
    return typeof value === "string" ? value : undefined;
  }

  bool(flag: string): boolean | undefined {
    const value = this.parsed.flags.get(flag);
    return typeof value === "boolean" ? value : undefined;
  }

  choice<T extends string>(
    value: string,
    options: readonly [T, ...T[]],
    what: string,
  ): T {
    const found = options.find((option) => option === value);
    if (found !== undefined) return found;
    this.errors.push(`${what} must be one of ${options.join(", ")}`);
    return options[0];
  }

  number(value: string, what: string): number {
    const n = Number(value);
    if (value.trim() === "" || !Number.isFinite(n)) {
      this.errors.push(`${what} must be a number, not "${value}"`);
    }
    return n;
  }

  /** A year or a date as a span of fractional years (`./calendar.ts`). */
  when(value: string, what: string): Span {
    const span = parseWhen(value);
    if (span.isOk()) return span.value;
    this.errors.push(`${what}: ${span.error}`);
    return { start: 0, end: 0 };
  }

  /** A length of time in years, and the size of the unit it was given in. */
  span(value: string, what: string): { years: number; unit: number } {
    const span = parseSpan(value);
    if (span.isOk()) return span.value;
    this.errors.push(`${what}: ${span.error}`);
    return { years: 0, unit: 1 };
  }

  /** One ref; a bad one is recorded and an actor ref returned. */
  ref(value: string): Ref {
    const ref = parseRef(value);
    if (ref.isOk()) return ref.value;
    this.errors.push(ref.error);
    return { kind: "actor", id: "" };
  }

  /** An event ID, or null for `none`. */
  eventOrNone(flag: string): string | null | undefined {
    const value = this.text(flag);
    return value === undefined ? undefined : orNone(value);
  }

  /** One ref, or null for `story`. */
  refOrStory(value: string): Ref | null {
    if (value === "story") return null;
    const ref = parseRef(value);
    if (ref.isOk()) return ref.value;
    this.errors.push(ref.error);
    return null;
  }

  /** A gap kind, written in kebab case: `drive-without-origin`. */
  gapKind(value: string): GapKind {
    const found = GAP_KINDS.find((kind) => gapName(kind) === value);
    if (found !== undefined) return found;
    this.errors.push(
      `<gap> must be one of ${GAP_KINDS.map(gapName).join(", ")}`,
    );
    return GAP_KINDS[0];
  }

  /** A comma-separated list of refs; an empty string is an empty list. */
  /** A comma-separated list of IDs; an empty string is an empty list. */
  list(flag: string): string[] | undefined {
    return this.text(flag)
      ?.split(",")
      .map((part) => part.trim())
      .filter((part) => part !== "");
  }

  /** A comma-separated list of refs; an empty string is an empty list. */
  refs(flag: string): Ref[] | undefined {
    const value = this.text(flag);
    if (value === undefined) return undefined;
    const refs: Ref[] = [];
    for (const part of value.split(",")) {
      if (part.trim() === "") continue;
      const ref = parseRef(part.trim());
      if (ref.isErr()) this.errors.push(ref.error);
      else refs.push(ref.value);
    }
    return refs;
  }
}

/** `drive_without_origin` as the command line writes it: `drive-without-origin`. */
const gapName = (kind: GapKind) => kind.replaceAll("_", "-");

/** Printed above the gaps, so a list of them doesn't read as a to-do list. */
const GAPS_ADVISORY =
  "Optional prompts, not problems: places you could add a link or a record. None is a reason to cut or merge anything true; a record can stay unlinked.";

type EditSpec<C extends StoryCommand> = Spec & {
  build: (a: Reader, story: Story) => C;
};

type EditSpecs = {
  [T in StoryCommandType]: EditSpec<Extract<StoryCommand, { type: T }>>;
};

const ACTOR_KINDS = ["person", "organization"] as const;
const RELATIONS = ["opposes", "allies", "competes"] as const;
const TIME_RELATIONS = ["before", "after", "during", "simultaneous"] as const;

const text = { value: "<text>" } as const;

/** Scene link kinds as the command line writes them: `pays-off`. */
const SCENE_LINK_NAMES = [
  "reveals",
  "implies",
  "withholds",
  "plants",
  "pays-off",
] as const;
const refList = (help: string) =>
  ({ value: "<ref,ref,...>", help: `${help} ("" for none)` }) as const;

/** `null` for `none`. */
const orNone = (value: string): string | null =>
  value === "none" ? null : value;

const COUNT_FLAGS = {
  notes: text,
  total: { value: "<number>", help: "a fixed total it is out of" },
  of: {
    value: "<count-id>",
    help: "another count whose value at the time is its total, for a total that changes",
  },
  threshold: {
    value: "<number|more-than-half>",
    help: "a value that matters; more-than-half is the smallest whole number above half the total",
  },
  direction: {
    value: "<rises|falls>",
    help: "it only goes this way in story time",
  },
} as const;

type CountOptions = {
  total?: number | null;
  of?: string | null;
  threshold?: number | "more_than_half" | null;
  direction?: CountDirection | null;
};

/** A count's total, threshold and direction from the flags; "none" is null. */
function countOptions(a: Reader): CountOptions {
  const read = <T>(flag: string, parse: (value: string) => T) => {
    const value = a.text(flag);
    return value === undefined
      ? undefined
      : value === "none"
        ? null
        : parse(value);
  };
  const options: CountOptions = {};
  const total = read("total", (v) => a.number(v, "--total"));
  const of = read("of", (v) => v);
  const threshold = read("threshold", (v): number | "more_than_half" =>
    v === "more-than-half" ? "more_than_half" : a.number(v, "--threshold"),
  );
  const direction = read("direction", (v) =>
    a.choice(v, COUNT_DIRECTIONS, "--direction"),
  );
  if (total !== undefined) options.total = total;
  if (of !== undefined) options.of = of;
  if (threshold !== undefined) options.threshold = threshold;
  if (direction !== undefined) options.direction = direction;
  return options;
}

/** As `countOptions`, for a new count, where "none" means leave it out. */
function newCountOptions(a: Reader) {
  const { total, of, threshold, direction } = countOptions(a);
  return {
    ...(total == null ? {} : { total }),
    ...(of == null ? {} : { of }),
    ...(threshold == null ? {} : { threshold }),
    ...(direction == null ? {} : { direction }),
  };
}

/**
 * Every story command, in help order. A key is the command's type; its name
 * on the command line is the type in kebab case.
 */
export const EDITS: EditSpecs = {
  setPremise: {
    group: "The premise",
    args: ["premise"],
    summary: "Replace the premise.",
    example: [
      "set-premise",
      "A lighthouse keeper finds a letter addressed to her drowned brother.",
    ],
    build: (a) => ({ type: "setPremise", premise: a.arg("premise") }),
  },

  addActor: {
    group: "Actors: people and groups",
    args: ["id", "name"],
    flags: {
      kind: { value: "person|organization", help: "default person" },
      notes: text,
    },
    summary: "Add a person or group.",
    example: [
      "add-actor",
      "mara",
      "Mara",
      "--notes",
      "Keeps the light alone since the wreck",
    ],
    build: (a) => ({
      type: "addActor",
      id: a.arg("id"),
      name: a.arg("name"),
      kind: a.choice(a.text("kind") ?? "person", ACTOR_KINDS, "--kind"),
      notes: a.text("notes") ?? "",
    }),
  },
  updateActor: {
    group: "Actors: people and groups",
    args: ["id"],
    flags: { name: text, kind: { value: "person|organization" }, notes: text },
    summary: "Change an actor; options left out are kept.",
    example: [
      "update-actor",
      "mara",
      "--notes",
      "Took over the light from her father",
    ],
    build: (a) => {
      const kind = a.text("kind");
      const name = a.text("name");
      const notes = a.text("notes");
      return {
        type: "updateActor",
        id: a.arg("id"),
        ...(name === undefined ? {} : { name }),
        ...(kind === undefined
          ? {}
          : { kind: a.choice(kind, ACTOR_KINDS, "--kind") }),
        ...(notes === undefined ? {} : { notes }),
      };
    },
  },
  removeActor: {
    group: "Actors: people and groups",
    args: ["id"],
    summary:
      "Remove an actor. Their drives stay, held by nobody; what they know or believe goes, so do their parts in events, and they stop telling any version. Any knowledge of the actor goes too, with links to that; the edit lists what went.",
    example: ["remove-actor", "mara"],
    build: (a) => ({ type: "removeActor", id: a.arg("id") }),
  },

  addEvent: {
    group: "Events: what happens in story time",
    args: ["id", "label"],
    flags: { summary: text },
    summary: "Add an event. Place it with set-position or constrain.",
    example: [
      "add-event",
      "wreck",
      "The wreck of the Alba",
      "--summary",
      "The supply boat sinks on the reef in a storm",
    ],
    build: (a) => ({
      type: "addEvent",
      id: a.arg("id"),
      label: a.arg("label"),
      summary: a.text("summary") ?? "",
    }),
  },
  describeEvent: {
    group: "Events: what happens in story time",
    args: ["id"],
    flags: { label: text, summary: text },
    summary: "Change an event's label or summary.",
    alias: "update-event",
    example: [
      "describe-event",
      "wreck",
      "--summary",
      "The light was dark that night",
    ],
    build: (a) => {
      const label = a.text("label");
      const summary = a.text("summary");
      return {
        type: "describeEvent",
        id: a.arg("id"),
        ...(label === undefined ? {} : { label }),
        ...(summary === undefined ? {} : { summary }),
      };
    },
  },
  removeEvent: {
    group: "Events: what happens in story time",
    args: ["id"],
    summary:
      "Remove an event, its position and constraints, and links to it. Its versions and participants go, and any knowledge of it or of them, with links to those; knowledge held from or until it, and drive turns at it, lose that time. The edit lists what went.",
    example: ["remove-event", "wreck"],
    build: (a) => ({ type: "removeEvent", id: a.arg("id") }),
  },
  setPosition: {
    group: "Events: what happens in story time",
    args: ["event-id", "start"],
    flags: {
      end: {
        value: "<year|date>",
        help: "default: the start, or the end of a date",
      },
      precision: { value: "<text>", help: 'such as "roughly"' },
    },
    summary:
      'Place an event in story time: a year (1954, 1954.8) is that moment, as before; a date (1954-10, 1954-10-12, "1954-10-12 21:00") is that month, day or minute, so two events on one day can still be ordered with constrain. Start "none" unplaces it. A move that contradicts other events is kept and reported.',
    example: ["set-position", "wreck", "17"],
    build: (a) => {
      const start = a.arg("start");
      if (start === "none") {
        return {
          type: "setPosition",
          event: a.arg("event-id"),
          frame: WORLD_FRAME,
          position: null,
        };
      }
      const end = a.text("end");
      const precision = a.text("precision");
      const from = a.when(start, "<start>");
      return {
        type: "setPosition",
        event: a.arg("event-id"),
        frame: WORLD_FRAME,
        position: {
          start: from.start,
          end: end === undefined ? from.end : a.when(end, "--end").end,
          ...(precision === undefined ? {} : { precision }),
        },
      };
    },
  },
  constrain: {
    group: "Events: what happens in story time",
    args: ["id", "a", "relation", "b"],
    flags: {
      gap: {
        value: "<span>",
        help: "with before or after: how long between, in years or with a unit (3d, 2w, 6h, 4mo)",
      },
      tolerance: {
        value: "<span>",
        help: "give or take, with --gap; default half its unit",
      },
    },
    summary:
      "Order two events: a before|after|during|simultaneous b. The id names the constraint. A contradiction is kept and reported.",
    example: ["constrain", "wreck-first", "wreck", "before", "letter"],
    build: (a) => {
      const gap = a.text("gap");
      const tolerance = a.text("tolerance");
      return {
        type: "constrain",
        id: a.arg("id"),
        a: a.arg("a"),
        b: a.arg("b"),
        relation: a.choice(a.arg("relation"), TIME_RELATIONS, "<relation>"),
        ...(gap === undefined
          ? {}
          : {
              duration: (() => {
                const span = a.span(gap, "--gap");
                // A gap in years keeps the timeline's default of half a year.
                const given =
                  tolerance === undefined
                    ? span.unit === 1
                      ? undefined
                      : span.unit / 2
                    : a.span(tolerance, "--tolerance").years;
                return {
                  amount: span.years,
                  frame: WORLD_FRAME,
                  ...(given === undefined ? {} : { tolerance: given }),
                };
              })(),
            }),
      };
    },
  },
  removeConstraint: {
    group: "Events: what happens in story time",
    args: ["id"],
    summary: "Remove a constraint between events.",
    example: ["remove-constraint", "wreck-first"],
    build: (a) => ({ type: "removeConstraint", id: a.arg("id") }),
  },
  addCause: {
    group: "Events: what happens in story time",
    args: ["cause-id", "effect-id"],
    summary:
      "Record that the effect happened because of the cause. An effect placed before its cause, or a circle of causes, is kept and reported.",
    example: ["add-cause", "wreck", "letter"],
    build: (a) => ({
      type: "addCause",
      cause: a.arg("cause-id"),
      effect: a.arg("effect-id"),
    }),
  },
  removeCause: {
    group: "Events: what happens in story time",
    args: ["cause-id", "effect-id"],
    summary: "Remove a cause recorded between two events.",
    example: ["remove-cause", "wreck", "letter"],
    build: (a) => ({
      type: "removeCause",
      cause: a.arg("cause-id"),
      effect: a.arg("effect-id"),
    }),
  },

  setParticipant: {
    group: "Events: what happens in story time",
    args: ["event-id", "ref"],
    flags: {
      role: {
        value: "<text>",
        help: 'its part: "did it", "witness", "the weapon"',
      },
    },
    summary:
      "Say an actor or object takes part in an event. Setting it again replaces the role.",
    example: ["set-participant", "wreck", "actor:ivo", "--role", "at the helm"],
    build: (a) => ({
      type: "setParticipant",
      event: a.arg("event-id"),
      who: a.ref(a.arg("ref")),
      role: a.text("role") ?? "",
    }),
  },
  removeParticipant: {
    group: "Events: what happens in story time",
    args: ["event-id", "ref"],
    summary: "Say an actor or object takes no part in an event after all.",
    example: ["remove-participant", "wreck", "actor:ivo"],
    build: (a) => ({
      type: "removeParticipant",
      event: a.arg("event-id"),
      who: a.ref(a.arg("ref")),
    }),
  },

  addDrive: {
    group: "Drives: what someone wants",
    args: ["id", "want"],
    flags: {
      actor: { value: "<actor-id>", help: "who holds it" },
      stakes: text,
      method: text,
    },
    summary: "Add a want. It can have no holder yet.",
    example: [
      "add-drive",
      "find-sender",
      "Learn who wrote the letter",
      "--actor",
      "mara",
      "--stakes",
      "She can never leave the island",
    ],
    build: (a) => {
      const actor = a.text("actor");
      return {
        type: "addDrive",
        id: a.arg("id"),
        actorId: actor ?? null,
        want: a.arg("want"),
        stakes: a.text("stakes") ?? "",
        method: a.text("method") ?? "",
      };
    },
  },
  updateDrive: {
    group: "Drives: what someone wants",
    args: ["id"],
    flags: {
      actor: { value: "<actor-id>|none" },
      want: text,
      stakes: text,
      method: text,
    },
    summary: "Change a drive; options left out are kept.",
    example: [
      "update-drive",
      "find-sender",
      "--want",
      "Prove her brother is alive",
    ],
    build: (a) => {
      const actor = a.text("actor");
      const want = a.text("want");
      const stakes = a.text("stakes");
      const method = a.text("method");
      return {
        type: "updateDrive",
        id: a.arg("id"),
        ...(actor === undefined ? {} : { actorId: orNone(actor) }),
        ...(want === undefined ? {} : { want }),
        ...(stakes === undefined ? {} : { stakes }),
        ...(method === undefined ? {} : { method }),
      };
    },
  },
  removeDrive: {
    group: "Drives: what someone wants",
    args: ["id"],
    summary:
      "Remove a drive and every link to it; turns of other drives into it lose that link. Any knowledge of it goes too, with links to that; the edit lists what went.",
    example: ["remove-drive", "find-sender"],
    build: (a) => ({ type: "removeDrive", id: a.arg("id") }),
  },
  setDriveOrigins: {
    group: "Drives: what someone wants",
    args: ["id", "event-id..."],
    summary: "Set the events that created the drive (none clears them).",
    example: ["set-drive-origins", "find-sender", "wreck"],
    build: (a) => ({
      type: "setDriveOrigins",
      id: a.arg("id"),
      origins: a.rest(),
    }),
  },
  relateDrives: {
    group: "Drives: what someone wants",
    args: ["from", "relation", "to"],
    summary:
      "Relate two drives: opposes, allies or competes. Two drives have one relation at most.",
    example: ["relate-drives", "find-sender", "opposes", "keep-quiet"],
    build: (a) => ({
      type: "relateDrives",
      from: a.arg("from"),
      to: a.arg("to"),
      relation: a.choice(a.arg("relation"), RELATIONS, "<relation>"),
    }),
  },
  unrelateDrives: {
    group: "Drives: what someone wants",
    args: ["a", "b"],
    summary: "Remove the relation between two drives.",
    example: ["unrelate-drives", "find-sender", "keep-quiet"],
    build: (a) => ({ type: "unrelateDrives", a: a.arg("a"), b: a.arg("b") }),
  },
  addDriveTurn: {
    group: "Drives: what someone wants",
    args: ["drive-id", "how"],
    flags: {
      at: { value: "<event-id>", help: "the event where it turns" },
      into: {
        value: "<drive-id>",
        help: "with replaced or flipped: the drive it becomes",
      },
      note: text,
    },
    summary:
      "Add a turn to a drive's life, after any it has: satisfied (met), renounced (given up), replaced (by another want) or flipped (into its opposite). A drive can turn more than once; one with no turns is still live.",
    example: [
      "add-drive-turn",
      "find-sender",
      "satisfied",
      "--at",
      "letter",
      "--note",
      "She learns who wrote it",
    ],
    build: (a) => {
      const at = a.text("at");
      const into = a.text("into");
      return {
        type: "addDriveTurn",
        drive: a.arg("drive-id"),
        how: a.choice(a.arg("how"), DRIVE_TURN_HOWS, "<how>"),
        ...(at === undefined ? {} : { at }),
        ...(into === undefined ? {} : { into }),
        note: a.text("note") ?? "",
      };
    },
  },
  removeDriveTurn: {
    group: "Drives: what someone wants",
    args: ["drive-id", "turn"],
    summary:
      "Remove a turn from a drive's life, counting from 1 (show lists them).",
    example: ["remove-drive-turn", "find-sender", "1"],
    build: (a) => ({
      type: "removeDriveTurn",
      drive: a.arg("drive-id"),
      index: a.number(a.arg("turn"), "<turn>") - 1,
    }),
  },

  addScene: {
    group: "Scenes: the telling",
    args: ["id", "title"],
    flags: {
      summary: {
        value: "<text>",
        help: "your note on what happens, not its prose, which goes in its own file",
      },
    },
    summary: "Add a scene at the end of the telling order.",
    example: [
      "add-scene",
      "storm",
      "The storm night",
      "--summary",
      "Mara relights the lamp while Ivo rows out",
    ],
    build: (a) => ({
      type: "addScene",
      id: a.arg("id"),
      title: a.arg("title"),
      summary: a.text("summary") ?? "",
    }),
  },
  updateScene: {
    group: "Scenes: the telling",
    args: ["id"],
    flags: { title: text, summary: text },
    summary: "Change a scene's title or summary.",
    example: ["update-scene", "storm", "--title", "The night the light failed"],
    build: (a) => {
      const title = a.text("title");
      const summary = a.text("summary");
      return {
        type: "updateScene",
        id: a.arg("id"),
        ...(title === undefined ? {} : { title }),
        ...(summary === undefined ? {} : { summary }),
      };
    },
  },
  removeScene: {
    group: "Scenes: the telling",
    args: ["id"],
    summary:
      "Remove a scene and links to it. Its prose file is left alone. Any knowledge of it goes too, with links to that; the edit lists what went.",
    example: ["remove-scene", "storm"],
    build: (a) => ({ type: "removeScene", id: a.arg("id") }),
  },
  moveScene: {
    group: "Scenes: the telling",
    args: ["id", "position"],
    summary: "Move a scene to a place in the telling order, counting from 1.",
    example: ["move-scene", "storm", "1"],
    build: (a) => ({
      type: "moveScene",
      id: a.arg("id"),
      index: a.number(a.arg("position"), "<position>") - 1,
    }),
  },
  setSceneActors: {
    group: "Scenes: the telling",
    args: ["id", "actor-id..."],
    summary: "Set who is in the scene (none clears them).",
    example: ["set-scene-actors", "storm", "mara", "ivo"],
    build: (a) => ({
      type: "setSceneActors",
      id: a.arg("id"),
      actors: a.rest(),
    }),
  },
  setSceneEvents: {
    group: "Scenes: the telling",
    args: ["id", "event-id..."],
    summary: "Set the events the scene shows (none clears them).",
    example: ["set-scene-events", "storm", "letter"],
    build: (a) => ({
      type: "setSceneEvents",
      id: a.arg("id"),
      depicts: a.rest(),
    }),
  },
  setScenePressures: {
    group: "Scenes: the telling",
    args: ["id", "drive-id..."],
    summary: "Set the drives the scene puts under pressure (none clears them).",
    example: ["set-scene-pressures", "storm", "find-sender"],
    build: (a) => ({
      type: "setScenePressures",
      id: a.arg("id"),
      pressures: a.rest(),
    }),
  },
  setSceneLinks: {
    group: "Scenes: the telling",
    args: ["id", "how", "ref..."],
    flags: {
      add: {
        bool: true,
        help: "add the refs to the list instead of replacing it",
      },
      remove: { bool: true, help: "take the refs off the list" },
    },
    summary:
      "Set the records the scene reveals (tells the reader), implies (lets the reader infer), withholds (keeps back where the reader would expect it), plants (sets up to matter later) or pays-off (brings back what was planted); none clears them. Any record or candidate can be linked. Without --add or --remove the refs replace the list, and the edit names any it dropped, and any ref the scene now both tells and withholds.",
    example: ["set-scene-links", "storm", "withholds", "--add", "event:letter"],
    build: (a, story) => {
      const choice = a.choice(a.arg("how"), SCENE_LINK_NAMES, "<how>");
      const how = choice === "pays-off" ? "paysOff" : choice;
      const id = a.arg("id");
      const given = a.restRefs();
      const add = a.bool("add") === true;
      const remove = a.bool("remove") === true;
      const linked = story.scenes.find((scene) => scene.id === id)?.[how] ?? [];
      const has = (refs: readonly Ref[], ref: Ref) =>
        refs.some((r) => formatRef(r) === formatRef(ref));
      if (add && remove) a.errors.push("give --add or --remove, not both");
      if (remove) {
        for (const ref of given.filter((ref) => !has(linked, ref))) {
          a.errors.push(`${id} ${choice} doesn't include ${formatRef(ref)}`);
        }
      }
      return {
        type: "setSceneLinks",
        id,
        how,
        refs: add
          ? [...linked, ...given.filter((ref) => !has(linked, ref))]
          : remove
            ? linked.filter((ref) => !has(given, ref))
            : given,
      };
    },
  },

  addObject: {
    group: "Objects: things that matter",
    args: ["id", "name"],
    flags: { notes: text },
    summary:
      "Add a thing that matters: a knife, a letter. Plant it and pay it off with set-scene-links; give it a part in events with set-participant.",
    example: ["add-object", "knife", "Doran's knife", "--notes", "Bone handle"],
    build: (a) => ({
      type: "addObject",
      id: a.arg("id"),
      name: a.arg("name"),
      notes: a.text("notes") ?? "",
    }),
  },
  updateObject: {
    group: "Objects: things that matter",
    args: ["id"],
    flags: { name: text, notes: text },
    summary: "Change an object's name or notes.",
    example: ["update-object", "knife", "--notes", "Bone handle, nicked"],
    build: (a) => {
      const name = a.text("name");
      const notes = a.text("notes");
      return {
        type: "updateObject",
        id: a.arg("id"),
        ...(name === undefined ? {} : { name }),
        ...(notes === undefined ? {} : { notes }),
      };
    },
  },
  removeObject: {
    group: "Objects: things that matter",
    args: ["id"],
    summary:
      "Remove an object and links to it. Its parts in events go, and any knowledge of it, with links to that; the edit lists what went.",
    example: ["remove-object", "knife"],
    build: (a) => ({ type: "removeObject", id: a.arg("id") }),
  },

  addCount: {
    group: "Counts: numbers that change at events",
    args: ["id", "label"],
    flags: COUNT_FLAGS,
    summary:
      "Add a number that changes at events: hands aboard, days of food, oil left in the lamp. Set its values with set-count; show and render print them as a running series in story order, with the total, saying how a value stands against the threshold where that changes, and listing the values below it once. contradictions reports a value above its total, and with --direction a value that moves the other way.",
    example: [
      "add-count",
      "crew",
      "Hands aboard the Alba",
      "--total",
      "12",
      "--direction",
      "falls",
    ],
    build: (a) => ({
      type: "addCount",
      id: a.arg("id"),
      label: a.arg("label"),
      notes: a.text("notes") ?? "",
      ...newCountOptions(a),
    }),
  },
  updateCount: {
    group: "Counts: numbers that change at events",
    args: ["id"],
    flags: { label: text, ...COUNT_FLAGS },
    summary:
      'Change a count\'s label, notes, total, threshold or direction; "none" clears the last four.',
    example: ["update-count", "crew", "--threshold", "6"],
    build: (a) => {
      const label = a.text("label");
      const notes = a.text("notes");
      return {
        type: "updateCount",
        id: a.arg("id"),
        ...(label === undefined ? {} : { label }),
        ...(notes === undefined ? {} : { notes }),
        ...countOptions(a),
      };
    },
  },
  removeCount: {
    group: "Counts: numbers that change at events",
    args: ["id"],
    summary:
      "Remove a count, its values, and links to it; a count out of it loses its total.",
    example: ["remove-count", "crew"],
    build: (a) => ({ type: "removeCount", id: a.arg("id") }),
  },
  setCount: {
    group: "Counts: numbers that change at events",
    args: ["id", "event-id", "value"],
    flags: { note: { value: "<text>", help: "why it is that, then" } },
    summary:
      'Set a count\'s value from an event on, until its next value in story order; setting it again at that event replaces it, and "none" removes it.',
    example: [
      "set-count",
      "crew",
      "wreck",
      "3",
      "--note",
      "Nine drowned off the reef",
    ],
    build: (a) => {
      const value = a.arg("value");
      return {
        type: "setCount",
        id: a.arg("id"),
        at: a.arg("event-id"),
        value: value === "none" ? null : a.number(value, "<value>"),
        note: a.text("note") ?? "",
      };
    },
  },

  addFact: {
    group: "Facts: plain statements about the world",
    args: ["id", "text"],
    flags: { about: refList("what it's about") },
    summary: "Add a fact.",
    example: [
      "add-fact",
      "seen-ashore",
      "The light can be seen from the mainland",
      "--about",
      "event:letter",
    ],
    build: (a) => ({
      type: "addFact",
      id: a.arg("id"),
      text: a.arg("text"),
      about: a.refs("about") ?? [],
    }),
  },
  updateFact: {
    group: "Facts: plain statements about the world",
    args: ["id"],
    flags: { text, about: refList("replaces what it's about") },
    summary: "Change a fact.",
    example: [
      "update-fact",
      "seen-ashore",
      "--about",
      "actor:ivo,event:letter",
    ],
    build: (a) => {
      const value = a.text("text");
      const about = a.refs("about");
      return {
        type: "updateFact",
        id: a.arg("id"),
        ...(value === undefined ? {} : { text: value }),
        ...(about === undefined ? {} : { about }),
      };
    },
  },
  removeFact: {
    group: "Facts: plain statements about the world",
    args: ["id"],
    summary:
      "Remove a fact. Any knowledge of it goes too, with links to that; the edit lists what went.",
    example: ["remove-fact", "seen-ashore"],
    build: (a) => ({ type: "removeFact", id: a.arg("id") }),
  },

  addReaderQuestion: {
    group: "Reader questions: what the reader waits to find out",
    args: ["id", "question"],
    summary: "Add a question the reader will be waiting on.",
    example: ["add-reader-question", "sender", "Is her brother alive?"],
    build: (a) => ({
      type: "addReaderQuestion",
      id: a.arg("id"),
      question: a.arg("question"),
    }),
  },
  updateReaderQuestion: {
    group: "Reader questions: what the reader waits to find out",
    args: ["id", "question"],
    summary: "Reword a reader question.",
    example: [
      "update-reader-question",
      "sender",
      "Who is still writing to a dead man?",
    ],
    build: (a) => ({
      type: "updateReaderQuestion",
      id: a.arg("id"),
      question: a.arg("question"),
    }),
  },
  removeReaderQuestion: {
    group: "Reader questions: what the reader waits to find out",
    args: ["id"],
    summary:
      "Remove a reader question. Any knowledge of it goes too, with links to that; the edit lists what went.",
    example: ["remove-reader-question", "sender"],
    build: (a) => ({ type: "removeReaderQuestion", id: a.arg("id") }),
  },
  setReaderQuestionScenes: {
    group: "Reader questions: what the reader waits to find out",
    args: ["id"],
    flags: {
      opens: { value: "<scene-id>|none", help: "the scene that raises it" },
      answered: { value: "<scene-id>|none", help: "the scene that answers it" },
    },
    summary:
      "Set the scenes that raise and answer it; options left out are kept.",
    example: ["set-reader-question-scenes", "sender", "--opens", "storm"],
    build: (a, story) => {
      const id = a.arg("id");
      const current = story.readerQuestions.find((q) => q.id === id);
      const opens = a.text("opens");
      const answered = a.text("answered");
      return {
        type: "setReaderQuestionScenes",
        id,
        opensAt:
          opens === undefined ? (current?.opensAt ?? null) : orNone(opens),
        answeredAt:
          answered === undefined
            ? (current?.answeredAt ?? null)
            : orNone(answered),
      };
    },
  },

  addOpenQuestion: {
    group: "Open questions: undecided, decided, left open or revealed",
    args: ["id", "question"],
    flags: {
      about: refList("what it's about"),
      conflict: { bool: true, help: "it records a contradiction" },
    },
    summary: "Add something undecided. Give it candidate answers to weigh.",
    example: [
      "add-open-question",
      "who-wrote",
      "Who wrote the letter?",
      "--about",
      "actor:mara,event:wreck",
    ],
    build: (a) => ({
      type: "addOpenQuestion",
      id: a.arg("id"),
      question: a.arg("question"),
      about: a.refs("about") ?? [],
      conflict: a.bool("conflict") ?? false,
    }),
  },
  updateOpenQuestion: {
    group: "Open questions: undecided, decided, left open or revealed",
    args: ["id"],
    flags: {
      question: text,
      about: refList("replaces what it's about"),
      conflict: { bool: true, help: "--no-conflict clears it" },
    },
    summary: "Change an open question; options left out are kept.",
    example: ["update-open-question", "who-wrote", "--conflict"],
    build: (a) => {
      const question = a.text("question");
      const about = a.refs("about");
      const conflict = a.bool("conflict");
      return {
        type: "updateOpenQuestion",
        id: a.arg("id"),
        ...(question === undefined ? {} : { question }),
        ...(about === undefined ? {} : { about }),
        ...(conflict === undefined ? {} : { conflict }),
      };
    },
  },
  removeOpenQuestion: {
    group: "Open questions: undecided, decided, left open or revealed",
    args: ["id"],
    summary:
      "Remove an open question and its candidates. Any knowledge of the question or a candidate goes too, with links to that; the edit lists what went.",
    example: ["remove-open-question", "who-wrote"],
    build: (a) => ({ type: "removeOpenQuestion", id: a.arg("id") }),
  },
  addCandidate: {
    group: "Open questions: undecided, decided, left open or revealed",
    args: ["question-id", "id", "answer"],
    flags: { touches: refList("what it would connect to") },
    summary:
      "Add a candidate answer. Then run touches candidate:<question-id>/<id> to see what it reaches.",
    example: [
      "add-candidate",
      "who-wrote",
      "ferryman",
      "The ferryman, who saw the wreck and never told",
      "--touches",
      "actor:ivo,fact:seen-ashore",
    ],
    build: (a) => ({
      type: "addCandidate",
      questionId: a.arg("question-id"),
      id: a.arg("id"),
      answer: a.arg("answer"),
      touches: a.refs("touches") ?? [],
    }),
  },
  updateCandidate: {
    group: "Open questions: undecided, decided, left open or revealed",
    args: ["question-id", "id"],
    flags: { answer: text, touches: refList("replaces what it would touch") },
    summary: "Change a candidate answer.",
    example: [
      "update-candidate",
      "who-wrote",
      "ferryman",
      "--touches",
      "actor:ivo,drive:find-sender",
    ],
    build: (a) => {
      const answer = a.text("answer");
      const touches = a.refs("touches");
      return {
        type: "updateCandidate",
        questionId: a.arg("question-id"),
        id: a.arg("id"),
        ...(answer === undefined ? {} : { answer }),
        ...(touches === undefined ? {} : { touches }),
      };
    },
  },
  removeCandidate: {
    group: "Open questions: undecided, decided, left open or revealed",
    args: ["question-id", "id"],
    summary:
      "Remove a candidate answer. Any knowledge of it goes too, with links to that; the edit lists what went.",
    example: ["remove-candidate", "who-wrote", "ferryman"],
    build: (a) => ({
      type: "removeCandidate",
      questionId: a.arg("question-id"),
      id: a.arg("id"),
    }),
  },
  answerOpenQuestion: {
    group: "Open questions: undecided, decided, left open or revealed",
    args: ["question-id", "candidate-id"],
    summary:
      "Choose a candidate. An answer it replaces is kept as superseded, which show lists and render leaves out. Nothing else changes: make what it implies with other commands.",
    example: ["answer-open-question", "who-wrote", "ferryman"],
    build: (a) => ({
      type: "answerOpenQuestion",
      id: a.arg("question-id"),
      candidateId: a.arg("candidate-id"),
    }),
  },
  unanswerOpenQuestion: {
    group: "Open questions: undecided, decided, left open or revealed",
    args: ["question-id"],
    summary: "Make the question open again. The answer is kept as superseded.",
    example: ["unanswer-open-question", "who-wrote"],
    build: (a) => ({ type: "unanswerOpenQuestion", id: a.arg("question-id") }),
  },
  rejectCandidate: {
    group: "Open questions: undecided, decided, left open or revealed",
    args: ["question-id", "candidate-id"],
    flags: {
      reason: { value: "<text>", help: "why it's ruled out" },
      undo: { bool: true, help: "put it back in the running" },
    },
    summary:
      "Rule a candidate out. It stays in the file with its reason, and show and render list it as ruled out. Refused on the chosen answer; answering with a ruled-out candidate puts it back.",
    example: [
      "reject-candidate",
      "who-wrote",
      "ferryman",
      "--reason",
      "He was at sea the night it was posted",
    ],
    build: (a) => {
      const undo = a.bool("undo") === true;
      const reason = a.text("reason");
      if (undo === (reason !== undefined)) {
        a.errors.push("give --reason <text> or --undo");
      }
      return {
        type: "rejectCandidate",
        questionId: a.arg("question-id"),
        id: a.arg("candidate-id"),
        reason: undo ? null : (reason ?? ""),
      };
    },
  },
  leaveForReader: {
    group: "Open questions: undecided, decided, left open or revealed",
    args: ["question-id"],
    flags: {
      reason: { value: "<text>", help: "why the story never answers it" },
      undo: { bool: true, help: "take the mark off" },
    },
    summary:
      "Leave the question open for the reader on purpose, answered by you or not. Until a scene reveals it, it is listed as left open, and gaps and contradictions don't report it.",
    example: [
      "leave-for-reader",
      "who-wrote",
      "--reason",
      "The ending works only if the reader can't be sure",
    ],
    build: (a) => {
      const undo = a.bool("undo") === true;
      const reason = a.text("reason");
      if (undo === (reason !== undefined)) {
        a.errors.push("give --reason <text> or --undo");
      }
      return {
        type: "leaveForReader",
        id: a.arg("question-id"),
        reason: undo ? null : (reason ?? ""),
      };
    },
  },

  addVersion: {
    group: "Knowledge: who knows or believes what, and the versions told",
    args: ["id", "event-id", "text"],
    flags: { by: { value: "<actor,actor,...>", help: "who tells it" } },
    summary:
      "Add one account of an event, beside the event's own summary (what really happened) and any other versions. It can be true, partial or a lie.",
    example: [
      "add-version",
      "ivo-wreck",
      "wreck",
      "The boat hit the rocks in the fog; nobody could have saved it",
      "--by",
      "ivo",
    ],
    build: (a) => ({
      type: "addVersion",
      id: a.arg("id"),
      event: a.arg("event-id"),
      text: a.arg("text"),
      by: a.list("by") ?? [],
    }),
  },
  updateVersion: {
    group: "Knowledge: who knows or believes what, and the versions told",
    args: ["id"],
    flags: {
      event: { value: "<event-id>" },
      text,
      by: { value: "<actor,actor,...>", help: '"" for nobody' },
    },
    summary: "Change a version's event, text or tellers.",
    example: ["update-version", "ivo-wreck", "--by", "ivo,mara"],
    build: (a) => {
      const event = a.text("event");
      const text = a.text("text");
      const by = a.list("by");
      return {
        type: "updateVersion",
        id: a.arg("id"),
        ...(event === undefined ? {} : { event }),
        ...(text === undefined ? {} : { text }),
        ...(by === undefined ? {} : { by }),
      };
    },
  },
  removeVersion: {
    group: "Knowledge: who knows or believes what, and the versions told",
    args: ["id"],
    summary:
      "Remove a version, knowledge of it, and links to both; the edit lists the knowledge that went.",
    example: ["remove-version", "ivo-wreck"],
    build: (a) => ({ type: "removeVersion", id: a.arg("id") }),
  },
  addKnowledge: {
    group: "Knowledge: who knows or believes what, and the versions told",
    args: ["id", "actor-id", "how", "ref"],
    flags: {
      since: { value: "<event-id>", help: "from when, in story time" },
      until: { value: "<event-id>", help: "until when" },
    },
    summary:
      "Say an actor knows or believes a record: a fact, a version of an event, an event, a candidate answer. Without --since it holds from the start. To tell the reader, have a scene reveal knowledge:<id>.",
    example: [
      "add-knowledge",
      "mara-doubts",
      "mara",
      "believes",
      "version:ivo-wreck",
      "--since",
      "letter",
    ],
    build: (a) => {
      const since = a.text("since");
      const until = a.text("until");
      return {
        type: "addKnowledge",
        id: a.arg("id"),
        actor: a.arg("actor-id"),
        how: a.choice(a.arg("how"), KNOWLEDGE_HOWS, "<how>"),
        what: a.ref(a.arg("ref")),
        ...(since === undefined ? {} : { since }),
        ...(until === undefined ? {} : { until }),
      };
    },
  },
  updateKnowledge: {
    group: "Knowledge: who knows or believes what, and the versions told",
    args: ["id"],
    flags: {
      how: { value: "knows|believes" },
      what: { value: "<ref>" },
      since: { value: "<event-id>", help: "none clears it" },
      until: { value: "<event-id>", help: "none clears it" },
    },
    summary: "Change what an actor knows or believes, or from and until when.",
    example: ["update-knowledge", "mara-doubts", "--until", "none"],
    build: (a) => {
      const how = a.text("how");
      const what = a.text("what");
      const since = a.eventOrNone("since");
      const until = a.eventOrNone("until");
      return {
        type: "updateKnowledge",
        id: a.arg("id"),
        ...(how === undefined
          ? {}
          : { how: a.choice(how, KNOWLEDGE_HOWS, "--how") }),
        ...(what === undefined ? {} : { what: a.ref(what) }),
        ...(since === undefined ? {} : { since }),
        ...(until === undefined ? {} : { until }),
      };
    },
  },
  removeKnowledge: {
    group: "Knowledge: who knows or believes what, and the versions told",
    args: ["id"],
    summary:
      "Remove what an actor knows or believes, and links to it. Knowledge of that knowledge goes too; the edit lists it.",
    example: ["remove-knowledge", "mara-doubts"],
    build: (a) => ({ type: "removeKnowledge", id: a.arg("id") }),
  },

  markGapDeliberate: {
    group: "Gaps: optional prompts",
    args: ["gap", "ref"],
    flags: {
      reason: { value: "<text>", help: "why it's fine", required: true },
    },
    summary:
      "Mark one gap on one record as deliberate, so gaps stops listing it. The gap and ref are as gaps prints them; story stands for the whole story.",
    example: [
      "mark-gap-deliberate",
      "drive-without-origin",
      "drive:find-sender",
      "--reason",
      "She has always been stubborn",
    ],
    build: (a) => ({
      type: "markGapDeliberate",
      gap: a.gapKind(a.arg("gap")),
      ref: a.refOrStory(a.arg("ref")),
      reason: a.text("reason") ?? "",
    }),
  },
  unmarkGapDeliberate: {
    group: "Gaps: optional prompts",
    args: ["gap", "ref"],
    summary: "Remove the mark, so gaps lists the gap again.",
    example: [
      "unmark-gap-deliberate",
      "drive-without-origin",
      "drive:find-sender",
    ],
    build: (a) => ({
      type: "unmarkGapDeliberate",
      gap: a.gapKind(a.arg("gap")),
      ref: a.refOrStory(a.arg("ref")),
    }),
  },
};

const kebab = (type: string) =>
  type.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

const isEditType = (type: string): type is StoryCommandType => type in EDITS;

const EDIT_BY_NAME = new Map(
  Object.keys(EDITS)
    .filter(isEditType)
    .flatMap((type) => {
      const alias = EDITS[type].alias;
      return [
        [kebab(type), type] as const,
        ...(alias === undefined ? [] : [[alias, type] as const]),
      ];
    }),
);

// ---------------------------------------------------------------------------
// Read commands.

type ReadName =
  | "init"
  | "show"
  | "list"
  | "touches"
  | "scenes"
  | "reader-order"
  | "span"
  | "trace"
  | "mentions"
  | "gaps"
  | "contradictions"
  | "render";

export const LIST_KINDS = [
  "actor",
  "drive",
  "event",
  "constraint",
  "scene",
  "fact",
  "reader-question",
  "open-question",
  "candidate",
  "version",
  "knowledge",
  "object",
  "count",
] as const;

export const READS: Record<ReadName, Spec> = {
  init: {
    group: "Start and read",
    args: ["premise"],
    summary:
      "Create the story file with a premise. Refuses if the file exists.",
    example: [
      "init",
      "A lighthouse keeper finds a letter addressed to her drowned brother.",
    ],
  },
  show: {
    group: "Start and read",
    args: ["ref"],
    summary: "Show one record with its IDs and links.",
    example: ["show", "drive:find-sender"],
  },
  list: {
    group: "Start and read",
    args: ["[kind]"],
    summary: `List records with their refs: ${LIST_KINDS.join(", ")}, or everything.`,
    example: ["list", "drive"],
  },
  touches: {
    group: "Start and read",
    args: ["ref"],
    summary:
      "What a record or candidate is connected to: its declared links, plus one step further. Only declared links count; for what free text mentions, use mentions.",
    example: ["touches", "candidate:who-wrote/ferryman"],
  },
  scenes: {
    group: "Start and read",
    args: ["ref"],
    summary:
      "The scenes that touch a record, in telling order, and how: who is in them, what they depict, pressure, open or answer, and what they reveal, imply or withhold. For a scene's own links, use show scene:<id>.",
    example: ["scenes", "fact:seen-ashore"],
  },
  "reader-order": {
    group: "Start and read",
    args: [],
    flags: {
      before: {
        value: "<scene-id>",
        help: "instead, only what the scenes before it have told the reader, in short labels, each with how long before the scene it happens, then each count's value as of the scene",
      },
    },
    summary:
      "The order the reader learns things in, beside the order they happen: each scene in telling order with what it shows, reveals, implies or withholds and when that is in story time; then events in story order, each with the first scene that tells the reader of it (itself, a version of it, or someone's knowledge of it) and the knowledge that starts then.",
    example: ["reader-order", "--before", "storm"],
  },
  span: {
    group: "Start and read",
    args: ["from-event", "to-event"],
    summary:
      "The time from one placed event to another, start to start: in days once it is a day or more, with years or months beside them past eight weeks, else in hours or minutes.",
    example: ["span", "wreck", "letter"],
  },
  trace: {
    group: "Start and read",
    args: ["ref"],
    summary:
      'What may depend on a record, likeliest first, each with why it is suspected: declared links and one step on (touches), the text naming it (mentions), free text and scene prose sharing its distinctive words, the prose of scenes that touch it (with any span such as "ten years ago" for an event), and scenes revealing an answer since replaced. It suspects and never decides: read each and judge. Edits that change a record print the top of this list.',
    example: ["trace", "event:wreck"],
  },
  mentions: {
    group: "Start and read",
    args: ["ref"],
    summary:
      "Free text that mentions a record: its name, a drive's holder, an event's year, and spans or seasons near an event. Records only, not prose; trace adds prose, shared words and links. Nothing is rewritten.",
    example: ["mentions", "event:wreck"],
  },
  gaps: {
    group: "Start and read",
    args: [],
    summary:
      "Optional prompts: what you could still link or add, each with its [gap ref] for mark-gap-deliberate. Advisory, not a to-do list, and never a reason to cut or merge anything true.",
    example: ["gaps"],
  },
  contradictions: {
    group: "Start and read",
    args: [],
    summary:
      "Timeline problems, effects placed before their causes, circles of causes, knowledge that ends before it starts, and open questions marked as conflicts.",
    example: ["contradictions"],
  },
  render: {
    group: "Start and read",
    args: [],
    flags: {
      section: {
        value: "<name,...>",
        help: `only these sections: ${RENDER_SECTION_NAMES.join(", ")}`,
      },
    },
    summary:
      "The whole bible as readable text with no IDs, for you while you work. It is not the story and no reader sees it; the story is the scenes' prose. Open questions are grouped by state: undecided, decided (not revealed yet), revealed and left open.",
    example: ["render", "--section", "undecided,decided"],
  },
};

const isReadName = (name: string): name is ReadName => name in READS;

// ---------------------------------------------------------------------------
// Help.

function quote(arg: string): string {
  return /^[\w.,:/@=+-]+$/.test(arg)
    ? arg
    : `"${arg.replace(/(["\\$`])/g, "\\$1")}"`;
}

function usage(name: string, spec: Spec): string {
  const args = spec.args.map((arg) =>
    arg.startsWith("[")
      ? `[<${arg.slice(1, -1)}>]`
      : arg.endsWith("...")
        ? `[<${arg.slice(0, -3)}>...]`
        : `<${arg}>`,
  );
  const flags = Object.entries(spec.flags ?? {}).map(([flag, f]) =>
    "bool" in f
      ? `[--${flag}]`
      : f.required === true
        ? `--${flag} ${f.value}`
        : `[--${flag} ${f.value}]`,
  );
  return [name, ...args, ...flags].join(" ");
}

function commandHelp(name: string, spec: Spec): string[] {
  const flagNotes = Object.entries(spec.flags ?? {})
    .filter(([, f]) => f.help !== undefined)
    .map(([flag, f]) => `--${flag}: ${f.help}`);
  return [
    `  ${usage(name, spec)}${spec.alias === undefined ? "" : ` (also ${spec.alias})`}`,
    `      ${spec.summary}${flagNotes.length === 0 ? "" : ` (${flagNotes.join("; ")})`}`,
    `      e.g. story story.json ${spec.example.map(quote).join(" ")}`,
  ];
}

export function helpText(): string {
  const lines = [
    "Usage: story <file> <command> [arguments]",
    "",
    "Sketch and rework a story held in one JSON file. Below, `story` stands for",
    "however you run this script (for example `bun app/scripts/story.ts` or",
    '`bun "$STORY_CLI"`). Each edit is checked and the file is written only if',
    "it succeeds; a refused edit prints why on stderr and exits non-zero. An",
    "edit that succeeds prints nothing unless there is something to read, so",
    "anything an edit prints is worth reading. An edit that makes events",
    "contradict each other is kept: it prints the problem and exits zero, so",
    "the contradiction can be worked on.",
    "",
    "IDs are short names you choose, such as mara or who-wrote. A ref names",
    `any record as kind:id, with kind one of ${Object.values(KIND_NAMES).join(", ")};`,
    "a candidate is candidate:<question-id>/<candidate-id>. Lists of refs are",
    "comma-separated (--about actor:mara,event:wreck). Quote text with spaces.",
    "A link can only point at a record that exists, so add records first.",
    "",
    "The story file is your bible: what the story holds, for you, never shown",
    "to a reader. A scene's prose goes in its own file, scenes/<scene-id>.md",
    "beside the story file (show scene:<id> prints the path); write it there",
    "with any editor. Link a scene to what it reveals, implies or withholds",
    "with set-scene-links, and see the scenes that touch a record with scenes.",
    "",
    "What a character knows or believes, and from when in story time, is",
    "knowledge (add-knowledge); the accounts different people give of an event",
    "are versions (add-version), held beside the event's own summary, which is",
    "what really happened. A scene tells the reader one by revealing it, and",
    "reader-order lists what the reader learns in telling order beside the",
    "order things happen.",
    "",
    'Times are years (1954) or dates (1954-10-12, "1954-10-12 21:00"); span',
    "gives the days between two events. Objects (add-object) are things scenes",
    "plant and pay off; set-participant says who or what takes part in an",
    "event; add-drive-turn says a want was satisfied, renounced, replaced or",
    "flipped, and where. A count (add-count, set-count) is a number that",
    "changes at events, shown as a running series against its total.",
    "reader-order --before <scene> lists, briefly, what the reader has been",
    "told before a scene and how long before it each thing happened.",
    "",
    "After an edit that changes a record, the CLI prints the top three",
    "suspects that may still state its old version, records and lines of",
    "scene prose, each with why; trace <ref> lists them all. Adding a record",
    "or placing an event for the first time prints none, since nothing can",
    "state an old version yet; a count traces only a changed value, looking",
    "for the old value at that event in figures, words or rounded. Within one",
    "shell command line, the trace leaves out records an earlier edit in it",
    "rewrote and the scene whose prose was written since the story file was",
    "last saved. touches (links only) and mentions (text naming it only) are",
    "the narrower views trace builds on.",
  ];
  let group = "";
  const specs: [string, Spec][] = [
    ...Object.entries(READS),
    ...Object.entries(EDITS).map(([type, spec]): [string, Spec] => [
      kebab(type),
      spec,
    ]),
  ];
  for (const [name, spec] of specs) {
    if (spec.group !== group) {
      group = spec.group;
      lines.push("", `${group}:`);
    }
    lines.push(...commandHelp(name, spec));
  }
  return `${lines.join("\n")}\n`;
}

// ---------------------------------------------------------------------------
// Reading.

/**
 * Where a scene's prose lives: `scenes/<scene-id>.md` beside the story file.
 * The story file holds the bible; the prose is kept out of it.
 */
export function proseFile(storyPath: string, sceneId: string): string {
  return join(dirname(storyPath), "scenes", `${sceneId}.md`);
}

/** `prose: scenes/storm.md (1840 words)`, or `(not written yet)`. */
function proseLine(storyPath: string, sceneId: string): string {
  const path = proseFile(storyPath, sceneId);
  const words = readFile(path)
    .map((text) => `${wordCount(text)} words`)
    .unwrapOr("not written yet");
  return `prose: ${path} (${words})`;
}

function showRecord(story: Story, ref: Ref, storyPath: string): string[] {
  const field = (name: string, value: string) =>
    value.trim() === "" ? [] : [`${name}: ${value}`];
  const ids = (name: string, kind: RefKind, values: readonly string[]) =>
    values.length === 0
      ? []
      : [
          `${name}: ${values.map((id) => describe(story, { kind, id })).join(", ")}`,
        ];
  const refs = (name: string, values: readonly Ref[]) =>
    values.length === 0
      ? []
      : [`${name}: ${values.map((r) => describe(story, r)).join(", ")}`];
  const head = [formatRef(ref)];
  switch (ref.kind) {
    case "actor": {
      const actor = story.actors.find((a) => a.id === ref.id);
      if (actor === undefined) return head;
      return [
        ...head,
        `name: ${actor.name}`,
        `kind: ${actor.kind}`,
        ...field("notes", actor.notes),
        ...ids(
          "drives",
          "drive",
          story.drives.filter((d) => d.actorId === actor.id).map((d) => d.id),
        ),
        ...participations(story, ref),
        ...ids(
          "knows or believes",
          "knowledge",
          story.knowledge.filter((k) => k.actor === actor.id).map((k) => k.id),
        ),
        ...ids(
          "tells",
          "version",
          story.versions
            .filter((v) => v.by.includes(actor.id))
            .map((v) => v.id),
        ),
      ];
    }
    case "drive": {
      const drive = story.drives.find((d) => d.id === ref.id);
      if (drive === undefined) return head;
      return [
        ...head,
        `want: ${drive.want}`,
        drive.actorId === null
          ? "actor: none"
          : `actor: ${describe(story, { kind: "actor", id: drive.actorId })}`,
        ...field("stakes", drive.stakes),
        ...field("method", drive.method),
        ...ids("origins", "event", drive.origins),
        ...drive.relations.map(
          (r) => `${r.type}: ${describe(story, { kind: "drive", id: r.to })}`,
        ),
        ...(drive.turns.length === 0
          ? ["life: live, no turns yet"]
          : ["life, in order:"]),
        ...drive.turns.map(
          (turn, i) =>
            `  ${i + 1}. ${turn.how}${turn.into === undefined ? "" : ` ${turn.how === "replaced" ? "by" : "into"} ${describe(story, { kind: "drive", id: turn.into })}`}${turn.at === undefined ? "" : ` at ${describe(story, { kind: "event", id: turn.at })}`}${turn.note.trim() === "" ? "" : `: ${turn.note}`}`,
        ),
        ...story.drives.flatMap((other) =>
          other.turns
            .filter((turn) => turn.into === drive.id)
            .map(
              (turn) =>
                `${turn.how === "replaced" ? "replaces" : "flipped from"}: ${describe(story, { kind: "drive", id: other.id })}`,
            ),
        ),
      ];
    }
    case "fact": {
      const fact = story.facts.find((f) => f.id === ref.id);
      if (fact === undefined) return head;
      return [...head, `text: ${fact.text}`, ...refs("about", fact.about)];
    }
    case "readerQuestion": {
      const q = story.readerQuestions.find((r) => r.id === ref.id);
      if (q === undefined) return head;
      return [
        ...head,
        `question: ${q.question}`,
        ...ids("opens at", "scene", q.opensAt === undefined ? [] : [q.opensAt]),
        ...ids(
          "answered at",
          "scene",
          q.answeredAt === undefined ? [] : [q.answeredAt],
        ),
      ];
    }
    case "event": {
      const event = story.timeline.events.find((e) => e.id === ref.id);
      if (event === undefined) return head;
      const position = story.timeline.positions.find(
        (p) => p.event === event.id && p.frame === WORLD_FRAME,
      );
      return [
        ...head,
        `label: ${event.label}`,
        ...field("summary", event.summary),
        ...(position === undefined
          ? ["position: none"]
          : [`position: ${eventTime(story, event.id) ?? ""}`]),
        ...story.participants
          .filter((p) => p.event === event.id)
          .map(
            (p) =>
              `participant: ${describe(story, p.who)}${p.role.trim() === "" ? "" : ` (${p.role})`}`,
          ),
        ...turnsAt(story, event.id),
        ...countsAt(story, event.id),
        ...story.timeline.constraints
          .filter((c) => c.a === event.id || c.b === event.id)
          .map((c) => `constraint ${constraintLine(story, c)}`),
        ...ids(
          "because of",
          "event",
          story.causes.filter((c) => c.effect === event.id).map((c) => c.cause),
        ),
        ...ids(
          "caused",
          "event",
          story.causes.filter((c) => c.cause === event.id).map((c) => c.effect),
        ),
        ...ids(
          "versions",
          "version",
          story.versions.filter((v) => v.event === event.id).map((v) => v.id),
        ),
        ...ids(
          "knowledge from then",
          "knowledge",
          story.knowledge.filter((k) => k.since === event.id).map((k) => k.id),
        ),
        ...ids(
          "knowledge until then",
          "knowledge",
          story.knowledge.filter((k) => k.until === event.id).map((k) => k.id),
        ),
      ];
    }
    case "scene": {
      const index = story.scenes.findIndex((s) => s.id === ref.id);
      const scene = story.scenes[index];
      if (scene === undefined) return head;
      return [
        ...head,
        `title: ${scene.title}`,
        `telling order: ${index + 1} of ${story.scenes.length}`,
        ...field("summary", scene.summary),
        ...ids("actors", "actor", scene.actors),
        ...ids("depicts", "event", scene.depicts),
        ...ids("pressures", "drive", scene.pressures),
        ...SCENE_LINK_KINDS.flatMap((how) => refs(how, scene[how])),
        proseLine(storyPath, scene.id),
      ];
    }
    case "openQuestion": {
      const q = story.openQuestions.find((o) => o.id === ref.id);
      if (q === undefined) return head;
      return [
        ...head,
        `question: ${q.question}`,
        ...(q.conflict ? ["conflict: yes"] : []),
        `state: ${stateText(questionState(story, q))}`,
        ...(q.leftOpen === undefined
          ? []
          : [
              `left open for the reader${q.leftOpen.trim() === "" ? "" : `: ${q.leftOpen}`}`,
            ]),
        ...refs("about", q.about),
        ...(q.candidates.length === 0 ? ["candidates: none"] : ["candidates:"]),
        ...q.candidates.map(
          (c) =>
            `  ${formatRef({ kind: "candidate", questionId: q.id, id: c.id })}${candidateMark(q, c)}: ${c.answer}`,
        ),
        ...((q.superseded ?? []).length === 0
          ? []
          : ["superseded answers, oldest first:"]),
        ...(q.superseded ?? []).map(
          (old) =>
            `  ${old.candidate}: ${old.answer} (${old.by === undefined ? "unanswered" : `replaced by ${formatRef({ kind: "candidate", questionId: q.id, id: old.by })}`})`,
        ),
      ];
    }
    case "count": {
      const count = story.counts.find((c) => c.id === ref.id);
      if (count === undefined) return head;
      const threshold =
        count.threshold === "more_than_half"
          ? "more than half of the total"
          : count.threshold === undefined
            ? ""
            : `${count.threshold}`;
      const series = countSeries(story, count);
      return [
        ...head,
        `label: ${count.label}`,
        ...field("notes", count.notes),
        ...(count.total === undefined ? [] : [`total: ${count.total}`]),
        ...ids("of", "count", count.of === undefined ? [] : [count.of]),
        ...field("threshold", threshold),
        ...field("direction", count.direction ?? ""),
        series.length === 0 ? "values: none yet" : "values, in story order:",
        ...seriesTexts(count, series).map(
          (text, i) => `  ${countStepLine(story, series[i], text)}`,
        ),
        ...listLine(
          "below the threshold at",
          belowThreshold(series).map(
            (step) =>
              `${formatRef({ kind: "event", id: step.at })} (${stepText(count, step, false)})`,
          ),
        ),
      ];
    }
    case "object": {
      const object = story.objects.find((o) => o.id === ref.id);
      if (object === undefined) return head;
      const scenesWith = (how: "plants" | "paysOff") =>
        story.scenes
          .filter((scene) =>
            scene[how].some((r) => r.kind === "object" && r.id === object.id),
          )
          .map((scene) => scene.id);
      return [
        ...head,
        `name: ${object.name}`,
        ...field("notes", object.notes),
        ...ids("planted in", "scene", scenesWith("plants")),
        ...ids("paid off in", "scene", scenesWith("paysOff")),
        ...participations(story, ref),
      ];
    }
    case "version": {
      const version = story.versions.find((v) => v.id === ref.id);
      if (version === undefined) return head;
      return [
        ...head,
        `text: ${version.text}`,
        `event: ${describe(story, { kind: "event", id: version.event })}`,
        ...ids("told by", "actor", version.by),
        ...ids(
          "held by",
          "knowledge",
          story.knowledge
            .filter(
              (k) => k.what.kind === "version" && k.what.id === version.id,
            )
            .map((k) => k.id),
        ),
      ];
    }
    case "knowledge": {
      const k = story.knowledge.find((x) => x.id === ref.id);
      if (k === undefined) return head;
      return [
        ...head,
        `actor: ${describe(story, { kind: "actor", id: k.actor })}`,
        `${k.how}: ${describe(story, k.what)}`,
        k.since === undefined
          ? "since: the start"
          : `since: ${describe(story, { kind: "event", id: k.since })}`,
        ...ids("until", "event", k.until === undefined ? [] : [k.until]),
      ];
    }
    case "candidate": {
      const q = story.openQuestions.find((o) => o.id === ref.questionId);
      const c = q?.candidates.find((x) => x.id === ref.id);
      if (q === undefined || c === undefined) return head;
      return [
        ...head,
        `answer: ${c.answer}`,
        `question: ${describe(story, { kind: "openQuestion", id: q.id })}`,
        ...(c.id === q.answer ? ["chosen: yes"] : []),
        ...(c.rejected === undefined ? [] : [`ruled out: ${c.rejected}`]),
        ...refs("touches", c.touches),
      ];
    }
  }
}

/** `revealed in scene:docks`, `left open for the reader`, and so on. */
function stateText(state: QuestionState): string {
  switch (state.state) {
    case "undecided":
      return "undecided";
    case "decided":
      return "decided, not revealed yet";
    case "left_open":
      return "left open for the reader";
    case "revealed":
      return `revealed in scene:${state.scene}`;
  }
}

/** ` (chosen)`, ` (ruled out: reason)` or nothing. */
function candidateMark(q: OpenQuestion, c: Candidate): string {
  if (c.id === q.answer) return " (chosen)";
  return c.rejected === undefined
    ? ""
    : ` (ruled out${c.rejected.trim() === "" ? "" : `: ${c.rejected}`})`;
}

/** `in event: event:wreck ("The wreck") (at the helm)`, for each event it's in. */
/** `event:wreck ("The wreck") at 12 October 1954: 3 of 12 (Nine drowned)`. */
function countStepLine(
  story: Story,
  step: CountStep | undefined,
  text: string,
): string {
  if (step === undefined) return text;
  const at = eventTime(story, step.at);
  return `${describe(story, { kind: "event", id: step.at })}${at === undefined ? "" : ` at ${at}`}: ${text}${step.note.trim() === "" ? "" : ` (${step.note})`}`;
}

/** `name: a, b`, or nothing for an empty list. */
const listLine = (name: string, items: readonly string[]) =>
  items.length === 0 ? [] : [`${name}: ${items.join(", ")}`];

/** The counts set at an event, with the value they take then. */
function countsAt(story: Story, event: string): string[] {
  return story.counts.flatMap((count) =>
    countSeries(story, count)
      .filter((step) => step.at === event)
      .map(
        (step) =>
          `count: ${describe(story, { kind: "count", id: count.id })} = ${stepText(count, step)}${step.note.trim() === "" ? "" : ` (${step.note})`}`,
      ),
  );
}

function participations(story: Story, ref: Ref): string[] {
  return story.participants
    .filter((p) => p.who.kind === ref.kind && p.who.id === ref.id)
    .map(
      (p) =>
        `in event: ${describe(story, { kind: "event", id: p.event })}${p.role.trim() === "" ? "" : ` (${p.role})`}`,
    );
}

/** `drive turn: drive:find-sender satisfied`, for each drive that turns at it. */
function turnsAt(story: Story, event: string): string[] {
  return story.drives.flatMap((drive) =>
    drive.turns
      .filter((turn) => turn.at === event)
      .map(
        (turn) =>
          `drive turn: ${describe(story, { kind: "drive", id: drive.id })} ${turn.how}`,
      ),
  );
}

/** The record's deliberate gaps, with their reasons. */
function markLines(story: Story, ref: Ref): string[] {
  return story.deliberateGaps
    .filter((m) => m.ref !== null && formatRef(m.ref) === formatRef(ref))
    .map((m) => `deliberate gap: ${gapName(m.gap)} (${m.reason})`);
}

/** `drive:find-sender ("Learn who wrote the letter")`. */
function describe(story: Story, ref: Ref): string {
  if (!refExists(story, ref)) return `${formatRef(ref)} (missing)`;
  const label = refLabel(story, ref);
  return label === ref.id ? formatRef(ref) : `${formatRef(ref)} ("${label}")`;
}

function constraintLine(
  story: Story,
  c: {
    id: string;
    a: string;
    relation: string;
    b: string;
    duration: { amount: number; tolerance?: number } | null;
  },
): string {
  // A gap given in a unit (2w) is stored in years; say it in the unit.
  const amount = (years: number) =>
    story.timeline.worldUnit === "year" ? describeYears(years) : `${years}`;
  const gap =
    c.duration === null
      ? ""
      : ` (gap ${amount(c.duration.amount)}${c.duration.tolerance === undefined ? "" : ` ± ${amount(c.duration.tolerance)}`})`;
  return `${c.id}: ${c.a} ${c.relation} ${c.b}${gap}`;
}

function listLines(story: Story, kind: (typeof LIST_KINDS)[number]): string[] {
  const line = (ref: Ref) => describe(story, ref);
  switch (kind) {
    case "actor":
      return story.actors.map(
        (a) => `${line({ kind: "actor", id: a.id })} ${a.kind}`,
      );
    case "drive":
      return story.drives.map((d) => line({ kind: "drive", id: d.id }));
    case "event":
      return story.timeline.events.map((e) => {
        const p = story.timeline.positions.find(
          (x) => x.event === e.id && x.frame === WORLD_FRAME,
        );
        return `${line({ kind: "event", id: e.id })}${p === undefined ? "" : ` at ${eventTime(story, e.id) ?? ""}`}`;
      });
    case "constraint":
      return story.timeline.constraints.map((c) => constraintLine(story, c));
    case "scene":
      return story.scenes.map(
        (s, i) => `${i + 1}. ${line({ kind: "scene", id: s.id })}`,
      );
    case "fact":
      return story.facts.map((f) => line({ kind: "fact", id: f.id }));
    case "reader-question":
      return story.readerQuestions.map((q) =>
        line({ kind: "readerQuestion", id: q.id }),
      );
    case "open-question":
      return story.openQuestions.map(
        (q) =>
          `${line({ kind: "openQuestion", id: q.id })} (${stateText(questionState(story, q))})${q.conflict ? " (conflict)" : ""}`,
      );
    case "version":
      return story.versions.map(
        (v) =>
          `${line({ kind: "version", id: v.id })} of ${formatRef({ kind: "event", id: v.event })}`,
      );
    case "knowledge":
      return story.knowledge.map((k) => line({ kind: "knowledge", id: k.id }));
    case "object":
      return story.objects.map((o) => line({ kind: "object", id: o.id }));
    case "count":
      return story.counts.map(
        (c) =>
          `${line({ kind: "count", id: c.id })} (${c.values.length} value${c.values.length === 1 ? "" : "s"})`,
      );
    case "candidate":
      return story.openQuestions.flatMap((q) =>
        q.candidates.map(
          (c) =>
            `${line({ kind: "candidate", questionId: q.id, id: c.id })}${candidateMark(q, c)}`,
        ),
      );
  }
}

/** ` at year 30`, or nothing for a record with no place in story time. */
function storyTime(story: Story, ref: Ref): string {
  const at = (id: string | undefined) => {
    if (id === undefined) return undefined;
    return eventTime(story, id) ?? "an unplaced time";
  };
  switch (ref.kind) {
    case "event": {
      const time = at(ref.id);
      return time === undefined ? "" : ` at ${time}`;
    }
    case "version": {
      const event = story.versions.find((v) => v.id === ref.id)?.event;
      return event === undefined
        ? ""
        : `, of ${formatRef({ kind: "event", id: event })} at ${at(event)}`;
    }
    case "knowledge": {
      const since = story.knowledge.find((k) => k.id === ref.id)?.since;
      return since === undefined
        ? ", held from the start"
        : `, held from ${formatRef({ kind: "event", id: since })} at ${at(since)}`;
    }
    default:
      return "";
  }
}

function firstToldText(story: Story, first: FirstTold | undefined): string {
  if (first === undefined) return "no scene tells the reader";
  const scene = `${first.index + 1}. ${describe(story, { kind: "scene", id: first.scene.id })}`;
  const account =
    first.via.kind === "version"
      ? " (an account, maybe not what happened)"
      : "";
  return `first told in ${scene}, which ${tellingWords(first.how)} ${formatRef(first.via)}${account}`;
}

/** Telling order, then true order, as `reader-order` prints them. */
function readerOrderLines(story: Story): string[] {
  const telling = tellingOrder(story).flatMap(({ scene, index, told }) => [
    `${index + 1}. ${describe(story, { kind: "scene", id: scene.id })}`,
    ...(told.length === 0
      ? ["   (tells nothing yet)"]
      : told.map(
          ({ how, ref }) =>
            `   ${tellingWords(how)} ${describe(story, ref)}${storyTime(story, ref)}`,
        )),
  ]);
  const knowledgeLine = ({
    knowledge,
    first,
  }: {
    knowledge: Knowledge;
    first?: FirstTold;
  }) =>
    `${describe(story, { kind: "knowledge", id: knowledge.id })}: ${firstToldText(story, first)}`;
  const always = knowledgeAlways(story);
  const truth = trueOrder(story).flatMap(({ event, first, knowledgeFrom }) => [
    `- ${describe(story, { kind: "event", id: event.id })}${storyTime(story, { kind: "event", id: event.id })}: ${firstToldText(story, first)}`,
    ...knowledgeFrom.map((k) => `    from then, ${knowledgeLine(k)}`),
  ]);
  return [
    "In telling order, what each scene puts before the reader:",
    ...(telling.length === 0 ? ["(no scenes yet)"] : telling),
    "",
    "In story order, where the reader first learns of each event:",
    ...(truth.length === 0 ? ["(no events yet)"] : truth),
    ...(always.length === 0
      ? []
      : [
          "",
          "Held from the start:",
          ...always.map((k) => `- ${knowledgeLine(k)}`),
        ]),
  ];
}

/** `event:wreck ("The wreck") at 12 October 1954`. */
function placedEvent(story: Story, id: string): string {
  const at = eventTime(story, id);
  return `${shortDescribe(story, { kind: "event", id })}${at === undefined ? "" : ` at ${at}`}`;
}

/** The world position's start of an event, if it has one. */
const startOf = (story: Story, id: string) =>
  story.timeline.positions.find(
    (p) => p.event === id && p.frame === WORLD_FRAME,
  )?.start;

/** `From … to …: 27 days.`, saying which way it runs. */
function spanLine(story: Story, from: string, to: string): string {
  const a = startOf(story, from) ?? 0;
  const b = startOf(story, to) ?? 0;
  const ranged = [from, to].some((id) => {
    const p = story.timeline.positions.find(
      (x) => x.event === id && x.frame === WORLD_FRAME,
    );
    return p !== undefined && describeSpan(p) === undefined && p.end > p.start;
  });
  const gap =
    a === b
      ? "they start at the same time"
      : `${describeBetween(a, b)}${b < a ? ", going back" : ""}`;
  return `From ${placedEvent(story, from)} to ${placedEvent(story, to)}: ${gap}${ranged ? " (start to start)" : ""}.`;
}

/** A ref with its label cut short: `fact:reef ("Nobody fishes the…")`. */
function shortDescribe(story: Story, ref: Ref): string {
  const label = refLabel(story, ref);
  return label === ref.id
    ? formatRef(ref)
    : `${formatRef(ref)} ("${excerpt(label)}")`;
}

/** The event a told record happens at: itself, a version's, knowledge's start. */
function eventOf(story: Story, ref: Ref): string | undefined {
  switch (ref.kind) {
    case "event":
      return ref.id;
    case "version":
      return story.versions.find((v) => v.id === ref.id)?.event;
    case "knowledge":
      return story.knowledge.find((k) => k.id === ref.id)?.since;
    default:
      return undefined;
  }
}

/** `revealed in 3`. */
const TOLD_WORDS: Record<TellingHow, string> = {
  shows: "shown",
  reveals: "revealed",
  implies: "implied",
  withholds: "withheld",
  plants: "planted",
  paysOff: "paid off",
};

/** `reader-order --before`: what the scenes before it have told, briefly. */
function toldBeforeLines(story: Story, index: number): string[] {
  const scene = story.scenes[index];
  if (scene === undefined) return [];
  // The scene's now is the latest placed event it shows; earlier ones it
  // shows are flashbacks.
  const anchor = scene.depicts
    .filter((id) => startOf(story, id) !== undefined)
    .sort((a, b) => (startOf(story, b) ?? 0) - (startOf(story, a) ?? 0))[0];
  const now = anchor === undefined ? undefined : startOf(story, anchor);
  const { told, withheld } = toldBefore(story, index);
  const line = ({ ref, how, index: at }: ToldSoFar) => {
    const event = eventOf(story, ref);
    const when = event === undefined ? undefined : eventTime(story, event);
    const then = event === undefined ? undefined : startOf(story, event);
    const ago =
      now === undefined || then === undefined
        ? ""
        : then === now
          ? ", at the same time"
          : `, ${describeBetween(then, now)} ${then < now ? "before" : "after"}`;
    return `- ${shortDescribe(story, ref)}${when === undefined ? "" : ` at ${when}`}${ago}: ${TOLD_WORDS[how]} in ${at + 1}`;
  };
  return [
    `Before ${index + 1}. ${shortDescribe(story, { kind: "scene", id: scene.id })}${anchor === undefined ? "" : `, at ${placedEvent(story, anchor)} (the latest event it shows)`}, the reader has been told:`,
    ...(told.length === 0 ? ["(nothing yet)"] : told.map(line)),
    ...(withheld.length === 0
      ? []
      : [
          "Held back and not told yet:",
          ...withheld.map((ref) => `- ${shortDescribe(story, ref)}`),
        ]),
    ...countsBefore(story, anchor),
  ];
}

/** Each count's value in effect at `event`, with how it stands. */
function countsBefore(story: Story, event: string | undefined): string[] {
  if (event === undefined) return [];
  const lines = story.counts.flatMap((count) => {
    const step = stepAt(story, countSeries(story, count), event);
    if (step === undefined) return [];
    const at = eventTime(story, step.at);
    return [
      `- ${shortDescribe(story, { kind: "count", id: count.id })}: ${stepText(count, step)}, since ${formatRef({ kind: "event", id: step.at })}${at === undefined ? "" : ` at ${at}`}`,
    ];
  });
  return lines.length === 0 ? [] : ["Counts as of the scene:", ...lines];
}

/** `- scene:docks summary: "twenty years ago" (may state when this happened)`. */
function mentionLines(story: Story, found: readonly Mention[]): string[] {
  return found.map(
    (m) => `- ${describe(story, m.ref)} ${m.field}: "${m.text}" (${m.how})`,
  );
}

/** The most suspects an edit prints; `trace` lists them all. */
const MAX_STALE_LINES = 3;

/** The record as stored, with an event's position, to see whether an edit changed it. */
function recordState(story: Story, ref: Ref): string {
  const find = <T extends { id: string }>(items: readonly T[]) =>
    items.find((item) => item.id === ref.id);
  switch (ref.kind) {
    case "actor":
      return JSON.stringify(find(story.actors));
    case "drive":
      return JSON.stringify(find(story.drives));
    case "fact":
      return JSON.stringify(find(story.facts));
    case "readerQuestion":
      return JSON.stringify(find(story.readerQuestions));
    case "event":
      return JSON.stringify([
        find(story.timeline.events),
        story.timeline.positions.find(
          (p) => p.event === ref.id && p.frame === WORLD_FRAME,
        ),
      ]);
    case "scene":
      return JSON.stringify(find(story.scenes));
    case "openQuestion":
      return JSON.stringify(find(story.openQuestions));
    case "version":
      return JSON.stringify(find(story.versions));
    case "knowledge":
      return JSON.stringify(find(story.knowledge));
    case "object":
      return JSON.stringify(find(story.objects));
    case "count":
      return JSON.stringify(find(story.counts));
    case "candidate":
      return JSON.stringify(
        story.openQuestions
          .find((q) => q.id === ref.questionId)
          ?.candidates.find((c) => c.id === ref.id),
      );
  }
}

/** The record an edit changes the content of, if it changed it. */
function changedRef(
  before: Story,
  after: Story,
  command: StoryCommand,
): Ref | undefined {
  const target = ((): Ref | undefined => {
    switch (command.type) {
      case "setPosition":
        return { kind: "event", id: command.event };
      case "describeEvent":
        return { kind: "event", id: command.id };
      case "updateActor":
        return { kind: "actor", id: command.id };
      case "updateDrive":
        return { kind: "drive", id: command.id };
      case "addDriveTurn":
      case "removeDriveTurn":
        return { kind: "drive", id: command.drive };
      case "updateFact":
        return { kind: "fact", id: command.id };
      case "updateReaderQuestion":
        return { kind: "readerQuestion", id: command.id };
      case "updateOpenQuestion":
      case "answerOpenQuestion":
      case "unanswerOpenQuestion":
        return { kind: "openQuestion", id: command.id };
      case "updateCandidate":
        return {
          kind: "candidate",
          questionId: command.questionId,
          id: command.id,
        };
      case "updateVersion":
        return { kind: "version", id: command.id };
      case "updateKnowledge":
        return { kind: "knowledge", id: command.id };
      case "updateObject":
        return { kind: "object", id: command.id };
      case "updateCount":
      case "setCount":
        return { kind: "count", id: command.id };
      default:
        return undefined;
    }
  })();
  return target !== undefined &&
    refExists(after, target) &&
    recordState(before, target) !== recordState(after, target)
    ? target
    : undefined;
}

/** Each scene's prose file that exists, as `traceDependents` reads it. */
function readProse(storyPath: string, story: Story): Prose[] {
  return story.scenes.flatMap((scene) =>
    readFile(proseFile(storyPath, scene.id))
      .map((text) => [{ scene: scene.id, text }])
      .unwrapOr([]),
  );
}

/** `- 2. scenes/harbour.md:3 "Twenty years…": reason; reason`. */
function suspectLines(
  story: Story,
  storyPath: string,
  found: readonly Suspect[],
): string[] {
  return found.map(({ target, reasons }) => {
    const what =
      target.kind === "record"
        ? describe(story, target.ref)
        : target.line === 0
          ? proseFile(storyPath, target.scene)
          : `${proseFile(storyPath, target.scene)}:${target.line} "${excerpt(target.text)}"`;
    return `- ${what}: ${reasons.join("; ")}`;
  });
}

const EXCERPT_LENGTH = 60;
const excerpt = (text: string) =>
  text.length <= EXCERPT_LENGTH
    ? text
    : `${text.slice(0, EXCERPT_LENGTH).trimEnd()}…`;

/**
 * A prompt listing what may still state what the edit changed: suspects with
 * a reason in their text, at most `MAX_STALE_LINES`.
 */
function staleTextLines(
  before: Story,
  after: Story,
  command: StoryCommand,
  storyPath: string,
  rewritten: ReadonlySet<string> = new Set(),
): string[] {
  const ref = changedRef(before, after, command);
  // Nothing can state where an event was before it had a place.
  const firstPlacement =
    command.type === "setPosition" &&
    !before.timeline.positions.some(
      (p) => p.event === command.event && p.frame === WORLD_FRAME,
    );
  // Nor what a count was at an event before it had a value there.
  const firstValue =
    command.type === "setCount" &&
    !before.counts.some(
      (c) => c.id === command.id && c.values.some((v) => v.at === command.at),
    );
  if (ref === undefined || firstPlacement || firstValue) return [];
  const was = countWas(before, command);
  if (was === undefined) return [];
  const all = traceDependents(after, ref, {
    was,
    prose: readProse(storyPath, after),
  }).unwrapOr([]);
  // A record this batch has already rewritten states the new version, and
  // the scene being written is about to be rewritten anyway. (Prose is still
  // listed: a change after writing it can leave it stale.)
  const found = all.filter(
    ({ inText, target }) =>
      inText &&
      !(target.kind === "record" && rewritten.has(formatRef(target.ref))),
  );
  if (found.length === 0) return [];
  const shown = found.slice(0, MAX_STALE_LINES);
  const more = all.length - shown.length;
  return [
    `What may still state the old ${formatRef(ref)}, likeliest first (nothing was rewritten):`,
    ...suspectLines(after, storyPath, shown),
    ...(more === 0
      ? []
      : [`...run trace ${formatRef(ref)} for all ${all.length}.`]),
  ];
}

/**
 * The story before the edit, as the trace should see it. A count's change
 * is only its value at one event, so only that value is looked for, and a
 * change of note alone (the same value) traces nothing: undefined.
 */
function countWas(before: Story, command: StoryCommand): Story | undefined {
  if (command.type !== "setCount") return before;
  const old = before.counts
    .find((c) => c.id === command.id)
    ?.values.find((v) => v.at === command.at);
  if (old === undefined || old.value === command.value) return undefined;
  return {
    ...before,
    counts: before.counts.map((c) =>
      c.id === command.id ? { ...c, values: [old] } : c,
    ),
  };
}

// ---------------------------------------------------------------------------
// The batch: edits run from one shell command line, such as a writer's
// script of many edits. An edit's inline trace leaves out records whose
// text earlier edits in the batch rewrote, and the record of a scene whose
// prose was written since the story file was last saved before the batch:
// the scene being worked on. `trace <ref>` still lists everything.

const tryRead = Result.fromThrowable(
  (path: string) => readFileSync(path, "utf8"),
  () => null,
);
const tryWrite = Result.fromThrowable(
  (path: string, text: string) => writeFileSync(path, text),
  () => null,
);
const tryMtime = Result.fromThrowable(
  (path: string) => statSync(path).mtimeMs,
  () => null,
);

/**
 * The shell running this command line: the parent process, or on Linux the
 * first ancestor of it that isn't a copy of it (a subshell such as
 * `$(...)` is a forked copy, with the same command line).
 */
function batchKey(): string {
  const stat = (pid: number) =>
    tryRead(`/proc/${pid}/stat`)
      .map((text) => text.slice(text.lastIndexOf(")") + 2).split(" "))
      .unwrapOr(undefined);
  const cmdline = (pid: number) =>
    tryRead(`/proc/${pid}/cmdline`).unwrapOr(undefined);
  let pid = process.ppid;
  for (;;) {
    const parent = Number(stat(pid)?.[1]);
    const line = cmdline(pid);
    if (!(parent > 1) || line === undefined || cmdline(parent) !== line) break;
    pid = parent;
  }
  // The start time tells a reused process ID apart.
  return `${pid}-${stat(pid)?.[19] ?? ""}`;
}

const BATCH_PREFIX = "story-batch-";
const DAY_MS = 24 * 60 * 60 * 1000;

const storyHash = (storyPath: string) =>
  createHash("sha1").update(resolve(storyPath)).digest("hex").slice(0, 12);

function batchFile(storyPath: string): string {
  return join(
    tmpdir(),
    `${BATCH_PREFIX}${storyHash(storyPath)}-${batchKey()}.json`,
  );
}

/** Removes the story's earlier batches' lists, and anyone's a day old. */
function clearOldBatches(storyPath: string): void {
  const mine = `${BATCH_PREFIX}${storyHash(storyPath)}-`;
  const names = Result.fromThrowable(
    () => readdirSync(tmpdir()),
    () => null,
  )().unwrapOr([]);
  for (const name of names) {
    if (!name.startsWith(BATCH_PREFIX)) continue;
    const path = join(tmpdir(), name);
    const old = (tryMtime(path).unwrapOr(null) ?? 0) < Date.now() - DAY_MS;
    if (name.startsWith(mine) || old) {
      Result.fromThrowable(
        () => unlinkSync(path),
        () => null,
      )();
    }
  }
}

/** What this batch has rewritten so far, as refs; seeded on its first edit. */
function batchRewritten(story: Story, storyPath: string): Set<string> {
  const saved = tryRead(batchFile(storyPath))
    .map((text): unknown => JSON.parse(text))
    .unwrapOr(undefined);
  if (Array.isArray(saved)) {
    return new Set(saved.filter((x): x is string => typeof x === "string"));
  }
  clearOldBatches(storyPath);
  const storyTime = tryMtime(storyPath).unwrapOr(null);
  return new Set(
    storyTime === null
      ? []
      : story.scenes
          .filter((scene) => {
            const prose = tryMtime(proseFile(storyPath, scene.id)).unwrapOr(
              null,
            );
            return prose !== null && prose > storyTime;
          })
          .map((scene) => formatRef({ kind: "scene", id: scene.id })),
  );
}

/** Adds the records whose text an edit changed (not added) to the batch's list. */
function recordBatch(
  storyPath: string,
  rewritten: ReadonlySet<string>,
  before: Story,
  after: Story,
): void {
  const refs: Ref[] = [
    ...before.actors.map((x): Ref => ({ kind: "actor", id: x.id })),
    ...before.drives.map((x): Ref => ({ kind: "drive", id: x.id })),
    ...before.facts.map((x): Ref => ({ kind: "fact", id: x.id })),
    ...before.readerQuestions.map(
      (x): Ref => ({ kind: "readerQuestion", id: x.id }),
    ),
    ...before.timeline.events.map((x): Ref => ({ kind: "event", id: x.id })),
    ...before.scenes.map((x): Ref => ({ kind: "scene", id: x.id })),
    ...before.openQuestions.map(
      (x): Ref => ({ kind: "openQuestion", id: x.id }),
    ),
    ...before.versions.map((x): Ref => ({ kind: "version", id: x.id })),
    ...before.knowledge.map((x): Ref => ({ kind: "knowledge", id: x.id })),
    ...before.objects.map((x): Ref => ({ kind: "object", id: x.id })),
    ...before.counts.map((x): Ref => ({ kind: "count", id: x.id })),
  ];
  // Rewritten means its text changed; new links or a new place don't count.
  const text = (story: Story) =>
    new Map(
      storyTexts(story).map((t) => [`${formatRef(t.ref)} ${t.field}`, t.value]),
    );
  const was = text(before);
  const now = text(after);
  const changed = refs
    .map(formatRef)
    .filter((ref) =>
      [...was.keys(), ...now.keys()].some(
        (key) => key.startsWith(`${ref} `) && was.get(key) !== now.get(key),
      ),
    );
  tryWrite(
    batchFile(storyPath),
    JSON.stringify([...new Set([...rewritten, ...changed])]),
  );
}

function touchLines(groups: TouchGroups): string[] {
  const lines = TOUCH_KINDS.flatMap((kind) =>
    groups[kind].map(
      (t) =>
        `  ${formatRef(t.ref)}${t.label === t.ref.id ? "" : ` ("${t.label}")`}: ${t.how.join("; ")}`,
    ),
  );
  return lines.length === 0 ? ["  (nothing)"] : lines;
}

// ---------------------------------------------------------------------------
// Running.

type Failure = { code: 1 | 2; message: string };
type Output = { stdout: string; story?: Story };

const usageError = (message: string): Failure => ({
  code: 2,
  message: `${message}\nRun with --help for the commands.`,
});
const refused = (message: string): Failure => ({ code: 1, message });

const readFile = Result.fromThrowable(
  (path: string) => readFileSync(path, "utf8"),
  (cause) => refused(`cannot read ${String(cause)}`),
);
const writeFile = Result.fromThrowable(
  (path: string, text: string) => writeFileSync(path, text),
  (cause) => refused(`cannot write ${String(cause)}`),
);

function loadStory(path: string): Result<Story, Failure> {
  return readFile(path).andThen((text) =>
    parseStory(text).mapErr((e) => refused(`${path}: ${e.message}`)),
  );
}

function runRead(
  name: ReadName,
  a: Reader,
  story: Story,
  storyPath: string,
): Result<string[], Failure> {
  switch (name) {
    case "init":
      return ok([]);
    case "show":
      return parseRef(a.arg("ref"))
        .mapErr(usageError)
        .andThen((ref) =>
          refExists(story, ref)
            ? ok([
                ...showRecord(story, ref, storyPath),
                ...markLines(story, ref),
              ])
            : err(refused(`${formatRef(ref)} does not exist`)),
        );
    case "list": {
      const asked = a.optionalArg("kind");
      if (asked === undefined) {
        return ok(
          LIST_KINDS.flatMap((kind) => {
            const lines = listLines(story, kind);
            return lines.length === 0
              ? []
              : [`${kind}s:`, ...lines.map((l) => `  ${l}`)];
          }),
        );
      }
      const kind = LIST_KINDS.find((k) => k === asked || `${k}s` === asked);
      return kind === undefined
        ? err(usageError(`<kind> must be one of ${LIST_KINDS.join(", ")}`))
        : ok(listLines(story, kind));
    }
    case "touches":
      return parseRef(a.arg("ref"))
        .mapErr(usageError)
        .andThen((ref) =>
          whatThisTouches(story, ref).mapErr((e) => refused(e.message)),
        )
        .map((t) => [
          `${formatRef(t.subject)}${t.label === t.subject.id ? "" : ` ("${t.label}")`} touches`,
          "Directly:",
          ...touchLines(t.direct),
          "One step further:",
          ...touchLines(t.further),
        ]);
    case "scenes":
      return parseRef(a.arg("ref"))
        .mapErr(usageError)
        .andThen((ref) =>
          scenesTouching(story, ref).mapErr((e) => refused(e.message)),
        )
        .map((found) =>
          found.length === 0
            ? ["No scene touches it."]
            : found.map(
                ({ scene, index, how }) =>
                  `${index + 1}. ${describe(story, { kind: "scene", id: scene.id })}: ${how.join("; ")}`,
              ),
        );
    case "reader-order": {
      const before = a.text("before");
      if (before === undefined) return ok(readerOrderLines(story));
      const index = story.scenes.findIndex((scene) => scene.id === before);
      return index === -1
        ? err(refused(`scene ${before} does not exist`))
        : ok(toldBeforeLines(story, index));
    }
    case "span": {
      const from = a.arg("from-event");
      const to = a.arg("to-event");
      const start = (id: string) =>
        story.timeline.positions.find(
          (p) => p.event === id && p.frame === WORLD_FRAME,
        )?.start;
      const missing = [from, to].find(
        (id) => !refExists(story, { kind: "event", id }),
      );
      if (missing !== undefined) {
        return err(refused(`event ${missing} does not exist`));
      }
      const unplaced = [from, to].find((id) => start(id) === undefined);
      if (unplaced !== undefined) {
        return err(refused(`event ${unplaced} has no position (set-position)`));
      }
      return ok([spanLine(story, from, to)]);
    }
    case "trace":
      return parseRef(a.arg("ref"))
        .mapErr(usageError)
        .andThen((ref) =>
          traceDependents(story, ref, {
            prose: readProse(storyPath, story),
          })
            .mapErr((e) => refused(e.message))
            .map((found) =>
              found.length === 0
                ? ["Nothing seems to depend on it."]
                : [
                    `What may depend on ${describe(story, ref)}, likeliest first:`,
                    ...suspectLines(story, storyPath, found),
                  ],
            ),
        );
    case "mentions":
      return parseRef(a.arg("ref"))
        .mapErr(usageError)
        .andThen((ref) =>
          whatMentions(story, ref).mapErr((e) => refused(e.message)),
        )
        .map((found) =>
          found.length === 0
            ? ["No free text mentions it."]
            : mentionLines(story, found),
        );
    case "gaps": {
      const gaps = storyGaps(story);
      const marked = deliberateGaps(story);
      const where = (g: { kind: GapKind; ref: Ref | null }) =>
        `[${gapName(g.kind)} ${g.ref === null ? "story" : formatRef(g.ref)}]`;
      return ok([
        ...(gaps.length === 0
          ? ["No gaps found."]
          : [GAPS_ADVISORY, ...gaps.map((g) => `- ${g.message} ${where(g)}`)]),
        ...(marked.length === 0
          ? []
          : [
              `Marked deliberate, so not listed (${marked.length}): ${marked
                .map(({ gap }) => where(gap))
                .join(", ")}`,
            ]),
      ]);
    }
    case "contradictions": {
      const found = storyContradictions(story);
      return ok(
        found.length === 0
          ? ["No contradictions."]
          : found.map(
              (c) =>
                `- ${c.message}${c.source === "openQuestion" || c.source === "knowledge" || c.source === "count" ? ` [${formatRef(c.ref)}]` : ""}`,
            ),
      );
    }
    case "render": {
      const only = a.list("section");
      const unknown = only?.filter(
        (name) => !RENDER_SECTION_NAMES.includes(name),
      );
      return unknown !== undefined && unknown.length > 0
        ? err(
            usageError(
              `no section ${unknown.join(", ")}: --section takes ${RENDER_SECTION_NAMES.join(", ")}`,
            ),
          )
        : ok([renderStory(story, only).trimEnd()]);
    }
  }
}

function parsed(spec: Spec, argv: readonly string[]): Result<Reader, Failure> {
  return parseArgs(spec, argv)
    .mapErr(usageError)
    .map((p) => new Reader(p));
}

/** Runs one command line. Writes the story only when an edit succeeds. */
export function run(argv: readonly string[]): Result<Output, Failure> {
  if (
    argv.length === 0 ||
    argv.includes("--help") ||
    argv.includes("-h") ||
    argv[0] === "help"
  ) {
    return ok({ stdout: helpText() });
  }
  const [path, name, ...rest] = argv;
  if (path === undefined || name === undefined) {
    return err(usageError("usage: story <file> <command> [arguments]"));
  }
  if (name === "init") {
    return parsed(READS.init, rest).andThen((a) =>
      existsSync(path)
        ? err(refused(`${path} already exists`))
        : ok({
            stdout: `Created ${path}.\n`,
            story: newStory(a.arg("premise")),
          }),
    );
  }
  if (isReadName(name)) {
    return parsed(READS[name], rest).andThen((a) =>
      loadStory(path)
        .andThen((story) => runRead(name, a, story, path))
        .map((lines) => ({ stdout: `${lines.join("\n")}\n` })),
    );
  }
  const type = EDIT_BY_NAME.get(name);
  if (type === undefined) return err(usageError(`unknown command ${name}`));
  return runEdit(EDITS[type], rest, path);
}

function runEdit(
  spec: EditSpec<StoryCommand>,
  argv: readonly string[],
  path: string,
): Result<Output, Failure> {
  return parsed(spec, argv).andThen((a) =>
    loadStory(path).andThen((story) => {
      const command = spec.build(a, story);
      if (a.errors.length > 0) return err(usageError(a.errors.join("\n")));
      return applyStoryCommand(story, command)
        .mapErr((e) => refused(e.message))
        .map(({ story: next, problems }) => {
          const rewritten = batchRewritten(story, path);
          recordBatch(path, rewritten, story, next);
          return {
            story: next,
            stdout: [
              ...problems.map(
                (p) =>
                  `Timeline problem (kept; see contradictions): ${timelineProblemMessage(next, p)}`,
              ),
              ...addedProblems(story, next).map(
                ({ source, message }) =>
                  `${source === "cause" ? "Cause" : "Count"} problem (kept; see contradictions): ${message}`,
              ),
              ...alsoRemovedLines(story, next, command),
              ...(a.bool("remove") === true
                ? []
                : droppedLinkLines(story, next, command)),
              ...crossedLinkLines(story, next),
              ...staleTextLines(story, next, command, path, rewritten),
            ]
              .map((line) => `${line}\n`)
              .join(""),
          };
        });
    }),
  );
}

/**
 * The versions and knowledge an edit removed besides the record it named,
 * since removing one record can take them with it.
 */
function alsoRemovedLines(
  before: Story,
  after: Story,
  command: StoryCommand,
): string[] {
  const named = (kind: "version" | "knowledge", id: string) =>
    (command.type === "removeVersion" && kind === "version") ||
    (command.type === "removeKnowledge" && kind === "knowledge")
      ? command.id === id
      : false;
  const gone = (
    kind: "version" | "knowledge",
    was: readonly { id: string }[],
    now: readonly { id: string }[],
  ) =>
    was
      .filter(({ id }) => !now.some((n) => n.id === id) && !named(kind, id))
      .map(({ id }) => describe(before, { kind, id }));
  // A participant removed on its own isn't news; one that went with its
  // event, actor or object is.
  const key = (p: Participant) => JSON.stringify(PARTICIPANT_KEY(p));
  const participants =
    command.type === "removeParticipant"
      ? []
      : before.participants
          .filter((p) => !after.participants.some((q) => key(q) === key(p)))
          .map(
            (p) =>
              `${formatRef(p.who)} in ${formatRef({ kind: "event", id: p.event })}`,
          );
  // A count's value goes with its event, unless the count itself was named.
  const values =
    command.type === "removeCount" || command.type === "setCount"
      ? []
      : before.counts.flatMap((c) => {
          const kept = after.counts.find((x) => x.id === c.id);
          return kept === undefined
            ? []
            : c.values
                .filter((v) => !kept.values.some((w) => w.at === v.at))
                .map(
                  (v) =>
                    `the value of ${formatRef({ kind: "count", id: c.id })} at ${formatRef({ kind: "event", id: v.at })}`,
                );
        });
  const removed = [
    ...gone("version", before.versions, after.versions),
    ...gone("knowledge", before.knowledge, after.knowledge),
    ...participants.map((p) => `the part of ${p}`),
    ...values,
  ];
  return removed.length === 0 ? [] : [`Also removed: ${removed.join(", ")}`];
}

/**
 * The refs a scene-links set took off the list, since replacing a list can
 * drop one by accident. (`--remove` drops what it names, so isn't reported.)
 */
function droppedLinkLines(
  before: Story,
  after: Story,
  command: StoryCommand,
): string[] {
  if (command.type !== "setSceneLinks") return [];
  const links = (story: Story) =>
    (story.scenes.find((s) => s.id === command.id)?.[command.how] ?? []).map(
      formatRef,
    );
  const now = new Set(links(after));
  const dropped = links(before).filter((ref) => !now.has(ref));
  const how = SCENE_LINK_NAMES[SCENE_LINK_KINDS.indexOf(command.how)];
  return dropped.length === 0
    ? []
    : [
        `Dropped from ${command.id} ${how}: ${dropped.join(", ")} (--add adds without replacing the list)`,
      ];
}

/**
 * Refs a scene now both tells (reveals or implies) and withholds, which
 * cancel out; only those the edit made are listed.
 */
function crossedLinkLines(before: Story, after: Story): string[] {
  const crossed = (story: Story) =>
    story.scenes.flatMap((scene) =>
      (["reveals", "implies"] as const).flatMap((how) =>
        scene[how]
          .map(formatRef)
          .filter((ref) => scene.withholds.map(formatRef).includes(ref))
          .map(
            (ref) => `scene ${scene.id} now both ${how} and withholds ${ref}`,
          ),
      ),
    );
  const old = new Set(crossed(before));
  return crossed(after)
    .filter((line) => !old.has(line))
    .map((line) => `Note: ${line}; one of the two is probably meant.`);
}

/** Cause and count contradictions in `after` that weren't in `before`. */
function addedProblems(
  before: Story,
  after: Story,
): { source: "cause" | "count"; message: string }[] {
  type Found = { source: "cause" | "count"; key: string; message: string };
  const found = (story: Story) =>
    storyContradictions(story).flatMap((c): Found[] =>
      c.source === "cause"
        ? [
            {
              source: c.source,
              key: JSON.stringify([
                c.kind,
                ...(c.kind === "cycle" ? c.events : [c.cause, c.effect]),
              ]),
              message: c.message,
            },
          ]
        : c.source === "count"
          ? [{ source: c.source, key: c.message, message: c.message }]
          : [],
    );
  const old = new Set(found(before).map(({ key }) => key));
  return found(after)
    .filter(({ key }) => !old.has(key))
    .map(({ source, message }) => ({ source, message }));
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const result = run(argv).andThen((output) =>
    output.story === undefined
      ? ok(output)
      : writeFile(argv[0] ?? "", serializeStory(output.story)).map(
          () => output,
        ),
  );
  if (result.isOk()) {
    process.stdout.write(result.value.stdout);
  } else {
    process.stderr.write(`error: ${result.error.message}\n`);
    process.exitCode = result.error.code;
  }
}
