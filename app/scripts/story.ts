/**
 * A command line for sketching and reworking a story held in one file
 * (`src/story/`). It's a thin wrapper: each edit is one `StoryCommand`, and
 * the file is written only if the command succeeds; each read is a query in
 * `src/story/queries.ts`, and what an edit prints after it comes from
 * `src/story/edit-report.ts`, which the story tools (`src/story/tools.ts`)
 * share. What stays here is the command line itself and the files: the
 * story file, the prose in `scenes/*.md`, and the batch. Run it with
 * `--help`.
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
import { parseSpan, parseWhen, type Span } from "../src/story/calendar";
import {
  applyStoryCommand,
  type StoryCommand,
  type StoryCommandType,
} from "../src/story/commands";
import {
  allRefs,
  changedRef,
  editReport,
  editReportLines,
  recordText,
} from "../src/story/edit-report";
import {
  contradictionsQuery,
  gapsQuery,
  LIST_KINDS,
  listQuery,
  mentionsQuery,
  type ProseSource,
  type QueryError,
  type QueryResult,
  readerOrderQuery,
  renderQuery,
  scenesQuery,
  showQuery,
  spanQuery,
  touchesQuery,
  traceQuery,
} from "../src/story/queries";
import { formatRef, gapName, KIND_NAMES, parseRef } from "../src/story/refs";
import { RENDER_SECTION_NAMES, wordCount } from "../src/story/render";
import {
  COUNT_DIRECTIONS,
  type CountDirection,
  DRIVE_TURN_HOWS,
  GAP_KINDS,
  type GapKind,
  KNOWLEDGE_HOWS,
  newStory,
  parseStory,
  type Ref,
  SCENE_LINK_KINDS,
  type Story,
  serializeStory,
} from "../src/story/story";
import { contentStems, type Prose } from "../src/story/trace";
import { WORLD_FRAME } from "../src/time/timeline";

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

/** `--add` and `--remove`, for a command that sets a list. */
const LIST_FLAGS = {
  add: {
    bool: true,
    help: "add these to the list instead of replacing it",
  },
  remove: { bool: true, help: "take these off the list" },
} as const;

/**
 * The list a list-setting command leaves: `given` in place of `current`,
 * or with `--add` added to it (once each), or with `--remove` taken off it.
 * Removing what isn't there, or giving both flags, is a usage error.
 */
function editList<T>(
  a: Reader,
  current: readonly T[],
  given: readonly T[],
  key: (item: T) => string,
  what: string,
): T[] {
  const add = a.bool("add") === true;
  const remove = a.bool("remove") === true;
  const has = (items: readonly T[], item: T) =>
    items.some((x) => key(x) === key(item));
  if (add && remove) a.errors.push("give --add or --remove, not both");
  if (remove) {
    for (const item of given.filter((item) => !has(current, item))) {
      a.errors.push(`${what} doesn't include ${key(item)}`);
    }
  }
  return add
    ? [...current, ...given.filter((item) => !has(current, item))]
    : remove
      ? current.filter((item) => !has(given, item))
      : [...given];
}

/** `editList` for a scene's list of IDs. */
const listEdit = (a: Reader, current: readonly string[], what: string) =>
  editList(a, current, a.rest(), (id) => id, `${a.arg("id")} ${what}`);

/** A scene's list of actors, events or drives, empty if no such scene. */
const sceneList = (
  story: Story,
  id: string,
  list: "actors" | "depicts" | "pressures",
): string[] => story.scenes.find((scene) => scene.id === id)?.[list] ?? [];

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
      "Remove an actor. Their drives stay, held by nobody; what they know or believe goes, so do their parts in events and their memberships either way round, and they stop telling any version or being a scene's viewpoint. Any knowledge of the actor goes too, with links to that; the edit lists what went.",
    example: ["remove-actor", "mara"],
    build: (a) => ({ type: "removeActor", id: a.arg("id") }),
  },
  addMembership: {
    group: "Actors: people and groups",
    args: ["id", "member-id", "group-id"],
    flags: {
      since: { value: "<event-id>", help: "joins then, in story time" },
      until: { value: "<event-id>", help: "leaves then" },
    },
    summary:
      "Say an actor belongs to a group actor. Without --since they always have; without --until they never leave. Someone who leaves and rejoins has two memberships. show actor: lists them for the member and the group.",
    example: [
      "add-membership",
      "ivo-crew",
      "ivo",
      "crew",
      "--since",
      "signs-on",
    ],
    build: (a) => {
      const since = a.text("since");
      const until = a.text("until");
      return {
        type: "addMembership",
        id: a.arg("id"),
        member: a.arg("member-id"),
        group: a.arg("group-id"),
        ...(since === undefined ? {} : { since }),
        ...(until === undefined ? {} : { until }),
      };
    },
  },
  updateMembership: {
    group: "Actors: people and groups",
    args: ["id"],
    flags: {
      since: { value: "<event-id>", help: "none clears it" },
      until: { value: "<event-id>", help: "none clears it" },
    },
    summary: "Change when a membership starts or ends.",
    example: ["update-membership", "ivo-crew", "--until", "letter"],
    build: (a) => {
      const since = a.eventOrNone("since");
      const until = a.eventOrNone("until");
      return {
        type: "updateMembership",
        id: a.arg("id"),
        ...(since === undefined ? {} : { since }),
        ...(until === undefined ? {} : { until }),
      };
    },
  },
  removeMembership: {
    group: "Actors: people and groups",
    args: ["id"],
    summary: "Remove a membership.",
    example: ["remove-membership", "ivo-crew"],
    build: (a) => ({ type: "removeMembership", id: a.arg("id") }),
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
      "Remove an event, its position and constraints, and links to it. Its versions and participants go, and any knowledge of it or of them, with links to those; knowledge and memberships held from or until it, and drive turns at it, lose that time. The edit lists what went.",
    example: ["remove-event", "wreck"],
    build: (a) => ({ type: "removeEvent", id: a.arg("id") }),
  },
  setPosition: {
    group: "Events: what happens in story time",
    args: ["event-id", "start"],
    flags: {
      end: {
        value: "<year|date>",
        help: "default: the end of the start's span; it runs to the end of the year or date it names (1950 --end 1960 is 1950 through 1960)",
      },
      precision: {
        value: "<text>",
        help: 'your words on how exact it is, such as "roughly"; shown quoted beside the position, which it doesn\'t change',
      },
    },
    summary:
      'Place an event in story time: a year (1954), month (1954-10), day (1954-10-12) or minute ("1954-10-12 21:00") is all of that span, so two events in one year or on one day can still be ordered with constrain; a fractional year (1954.8) is that moment. Start "none" unplaces it. A move that contradicts other events is kept and reported.',
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
    flags: LIST_FLAGS,
    summary:
      "Set who is in the scene (none clears them); --add or --remove changes the list instead of replacing it.",
    example: ["set-scene-actors", "storm", "mara", "ivo"],
    build: (a, story) => ({
      type: "setSceneActors",
      id: a.arg("id"),
      actors: listEdit(a, sceneList(story, a.arg("id"), "actors"), "actors"),
    }),
  },
  setSceneViewpoint: {
    group: "Scenes: the telling",
    args: ["id", "actor-id"],
    summary:
      "Say whose eyes the scene is told through (none clears it). reader-order --before then marks what the reader has been told that they don't know.",
    example: ["set-scene-viewpoint", "storm", "mara"],
    build: (a) => {
      const actor = orNone(a.arg("actor-id"));
      return { type: "setSceneViewpoint", id: a.arg("id"), actor };
    },
  },
  setSceneDocument: {
    group: "Scenes: the telling",
    args: ["id", "document-id"],
    summary:
      "Link the scene to the app document that holds its prose (none unlinks it). The CLI still reads prose from scenes/<scene-id>.md.",
    example: ["set-scene-document", "storm", "doc-storm"],
    build: (a) => ({
      type: "setSceneDocument",
      id: a.arg("id"),
      documentId: orNone(a.arg("document-id")),
    }),
  },
  setSceneChapter: {
    group: "Scenes: the telling",
    args: ["id"],
    flags: {
      book: { value: "<name>", help: "the book (none clears it)" },
      chapter: { value: "<name>", help: "the chapter (none clears it)" },
    },
    summary:
      "Say which book and chapter the scene is packaged in. A flag left out clears that one; the telling order stays the scene order.",
    example: [
      "set-scene-chapter",
      "storm",
      "--book",
      "One",
      "--chapter",
      "The Lamp",
    ],
    build: (a) => {
      const name = (flag: string) => {
        const value = a.text(flag);
        return value === undefined ? null : orNone(value);
      };
      return {
        type: "setSceneChapter",
        id: a.arg("id"),
        book: name("book"),
        chapter: name("chapter"),
      };
    },
  },
  setSceneEvents: {
    group: "Scenes: the telling",
    args: ["id", "event-id..."],
    flags: LIST_FLAGS,
    summary:
      "Set the events the scene shows (none clears them); --add or --remove changes the list instead of replacing it.",
    example: ["set-scene-events", "storm", "letter"],
    build: (a, story) => ({
      type: "setSceneEvents",
      id: a.arg("id"),
      depicts: listEdit(a, sceneList(story, a.arg("id"), "depicts"), "events"),
    }),
  },
  setScenePressures: {
    group: "Scenes: the telling",
    args: ["id", "drive-id..."],
    flags: LIST_FLAGS,
    summary:
      "Set the drives the scene puts under pressure (none clears them); --add or --remove changes the list instead of replacing it.",
    example: ["set-scene-pressures", "storm", "find-sender"],
    build: (a, story) => ({
      type: "setScenePressures",
      id: a.arg("id"),
      pressures: listEdit(
        a,
        sceneList(story, a.arg("id"), "pressures"),
        "pressures",
      ),
    }),
  },
  setSceneLinks: {
    group: "Scenes: the telling",
    args: ["id", "how", "ref..."],
    flags: LIST_FLAGS,
    summary:
      "Set the records the scene reveals (tells the reader), implies (lets the reader infer), withholds (keeps back where the reader would expect it), plants (sets up to matter later) or pays-off (brings back what was planted); none clears them. Any record or candidate can be linked. Without --add or --remove the refs replace the list, and the edit names any it dropped, and any ref the scene now both tells and withholds.",
    example: ["set-scene-links", "storm", "withholds", "--add", "event:letter"],
    build: (a, story) => {
      const choice = a.choice(a.arg("how"), SCENE_LINK_NAMES, "<how>");
      const how = choice === "pays-off" ? "paysOff" : choice;
      const id = a.arg("id");
      const linked = story.scenes.find((scene) => scene.id === id)?.[how] ?? [];
      return {
        type: "setSceneLinks",
        id,
        how,
        refs: editList(a, linked, a.restRefs(), formatRef, `${id} ${choice}`),
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
    flags: {
      note: {
        value: "<text>",
        help: 'why it is that, then; left out, a value already there keeps its note, and "" clears it',
      },
    },
    summary:
      'Set a count\'s value from an event on, until its next value in story order; setting it again at that event replaces it, and "none" removes it. The value takes effect at the start of its event: for one that lasts days, the counts say from when; to have it at the end, give it an event placed there.',
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
      const note = a.text("note");
      return {
        type: "setCount",
        id: a.arg("id"),
        at: a.arg("event-id"),
        value: value === "none" ? null : a.number(value, "<value>"),
        ...(note === undefined ? {} : { note }),
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
        help: "instead, only what the scenes before it have told the reader, in short labels, each with how long before the scene it happens, each way it was told and where first (planted in 3, revealed in 7), and, if the scene has a viewpoint, whether that actor doesn't know it (by their knowledge records of it; without any, they know an event they take part in and the objects in it, a version they tell, what a scene through their eyes shows, reveals, implies or pays off, and what a scene they or their group are in, or whose events they take part in, reveals or pays off, from that scene's latest event on; revealing someone's knowledge of a thing tells the thing), as the scene opens, with any of their records that starts or ends at an event it shows marked as changing in this scene; then what was held back and not yet told or answered; then each count's value as the scene opens and each change from its earliest event to its latest",
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
      "The time from one placed event to another, start to start: in days once it is a day or more, with years or months beside them past eight weeks, else in hours or minutes. When either is placed by a month, a year or a longer range, the range it may be (11.7 to 12.7 years), since such an event may be any part of it.",
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
    'Times are years (1954) or dates (1954-10-12, "1954-10-12 21:00"), each',
    "all of that span; span gives the days between two events. Objects",
    "(add-object) are things scenes plant and pay off; set-participant says",
    "who or what takes part in an event; add-drive-turn says a want was",
    "satisfied, renounced, replaced or flipped, and where. A count",
    "(add-count, set-count) is a number that changes at events, shown as a",
    "running series against its total.",
    "reader-order --before <scene> lists, briefly, what the reader has been",
    "told before a scene and how long before it each thing happened. A scene",
    "told through someone's eyes (set-scene-viewpoint) marks what the reader",
    "has been told that they don't know: a told record is marked only when",
    "someone's knowledge of it is recorded, and they hold it by their own",
    "knowledge records or, without any, by taking part in it, telling it, or",
    "being told it in a scene through their eyes or one they are in (or",
    "their group is in); revealing someone's knowledge of a thing tells it.",
    "Marks are as the scene opens; a record of theirs that starts or ends",
    "at an event the scene shows is marked as changing in this scene. Who",
    "belongs to a group, and from and until when, is a membership",
    "(add-membership); show actor: lists it for the member and the group.",
    "",
    "After an edit that changes a record, the CLI prints the top three",
    "suspects that may still state its old version, records and lines of",
    "scene prose, each with why; trace <ref> lists them all. Adding a record",
    "or placing an event for the first time prints none, since nothing can",
    "state an old version yet; a count traces only a changed value no other",
    "event still has, looking for the old value at that event in figures,",
    "words or, from 100 up, rounded, and a value added between two others",
    "checks whether the next one's note states the change it no longer is.",
    "A moved event is looked for by its old year and by spans the move made",
    "untrue; shared words alone show only when they are many of the words",
    "the change took away. Within one shell command line, the trace leaves",
    "out the record and prose of the scene whose prose was written since the",
    "story file was last saved, and records added earlier in that command",
    "line. touches (links only) and mentions (text naming it only) are the",
    "narrower views trace builds on.",
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

/** The most suspects an edit prints; `trace` lists them all. */
const MAX_STALE_LINES = 3;

/** Each scene's prose file that exists, as `traceDependents` reads it. */
function readProse(storyPath: string, story: Story): Prose[] {
  return story.scenes.flatMap((scene) =>
    readFile(proseFile(storyPath, scene.id))
      .map((text) => [{ scene: scene.id, text }])
      .unwrapOr([]),
  );
}

// ---------------------------------------------------------------------------
// The batch: edits run from one shell command line, such as a writer's
// script of many edits. An edit's inline trace leaves out the record and
// prose of a scene whose prose was written since the story file was last
// saved before the batch (the scene being worked on), and records an
// earlier edit in the batch added. `trace <ref>` still lists everything. Records an earlier edit in the batch rewrote are still
// listed, since the rewrite may have been for another reason and left the
// old version standing (finding worldcrafter-gu8c).

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

/** What an edit's inline trace leaves out for its batch, as refs. */
type Batch = {
  writing: Set<string>;
  created: Set<string>;
  /** Records an earlier edit rewrote, with the word stems it added. */
  rewritten: Map<string, Set<string>>;
};

/**
 * The batch's state: the scenes it is writing, those whose prose file is
 * newer than the story file at the batch's first edit, which saves them
 * for the rest of the batch (each edit rewrites the story file), the
 * records its edits so far added, and those they rewrote.
 */
function batchState(story: Story, storyPath: string): Batch {
  const file = batchFile(storyPath);
  const saved = tryRead(file)
    .map((text): unknown => JSON.parse(text))
    .unwrapOr(undefined);
  const strings = (x: unknown) =>
    new Set(
      Array.isArray(x)
        ? x.filter((y): y is string => typeof y === "string")
        : [],
    );
  if (typeof saved === "object" && saved !== null && "writing" in saved) {
    const rewritten =
      "rewritten" in saved &&
      typeof saved.rewritten === "object" &&
      saved.rewritten !== null
        ? saved.rewritten
        : {};
    return {
      writing: strings(saved.writing),
      created: strings("created" in saved ? saved.created : []),
      rewritten: new Map(
        Object.entries(rewritten).map(([ref, stems]) => [ref, strings(stems)]),
      ),
    };
  }
  clearOldBatches(storyPath);
  const storyTime = tryMtime(storyPath).unwrapOr(null);
  const writing =
    storyTime === null
      ? []
      : story.scenes
          .filter((scene) => {
            const prose = tryMtime(proseFile(storyPath, scene.id)).unwrapOr(
              null,
            );
            return prose !== null && prose > storyTime;
          })
          .map((scene) => formatRef({ kind: "scene", id: scene.id }));
  const batch: Batch = {
    writing: new Set(writing),
    created: new Set(),
    rewritten: new Map(),
  };
  saveBatch(storyPath, batch);
  return batch;
}

function saveBatch(storyPath: string, batch: Batch): void {
  tryWrite(
    batchFile(storyPath),
    JSON.stringify({
      writing: [...batch.writing],
      created: [...batch.created],
      rewritten: Object.fromEntries(
        [...batch.rewritten].map(([ref, stems]) => [ref, [...stems]]),
      ),
    }),
  );
}

/**
 * Adds to the batch the records `after` has that `before` didn't, and the
 * record the edit rewrote with the words it added.
 */
function recordBatch(
  storyPath: string,
  batch: Batch,
  before: Story,
  after: Story,
  command: StoryCommand,
): void {
  const had = new Set(allRefs(before));
  const added = allRefs(after).filter((ref) => !had.has(ref));
  for (const ref of added) batch.created.add(ref);
  const changed = changedRef(before, after, command);
  const key = changed === undefined ? undefined : formatRef(changed);
  const words =
    changed === undefined || key === undefined || !had.has(key)
      ? []
      : (() => {
          const was = contentStems(recordText(before, changed));
          return [...contentStems(recordText(after, changed))].filter(
            (s) => !was.has(s),
          );
        })();
  if (key !== undefined && words.length > 0) {
    batch.rewritten.set(
      key,
      new Set([...(batch.rewritten.get(key) ?? []), ...words]),
    );
  }
  if (added.length > 0 || words.length > 0) saveBatch(storyPath, batch);
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

/** The prose files beside the story file, named by path. */
function fileSource(storyPath: string, story: Story): ProseSource {
  return {
    prose: readProse(storyPath, story),
    proseLine: (scene) => proseLine(storyPath, scene.id),
    locate: (scene, line) =>
      line === 0
        ? proseFile(storyPath, scene)
        : `${proseFile(storyPath, scene)}:${line}`,
  };
}

/** A query's refusal as the CLI reports it: a malformed query is a usage error. */
const queryFailure = (e: QueryError): Failure =>
  e.kind === "invalid" ? usageError(e.message) : refused(e.message);

function runRead(
  name: ReadName,
  a: Reader,
  story: Story,
  storyPath: string,
): Result<string[], Failure> {
  const withRef = <T>(
    query: (ref: Ref) => Result<QueryResult<T>, QueryError>,
  ): Result<string[], Failure> =>
    parseRef(a.arg("ref"))
      .mapErr(usageError)
      .andThen((ref) => query(ref).mapErr(queryFailure))
      .map(({ lines }) => lines);
  switch (name) {
    case "init":
      return ok([]);
    case "show":
      return withRef((ref) =>
        showQuery(story, ref, fileSource(storyPath, story)),
      );
    case "list": {
      const asked = a.optionalArg("kind");
      if (asked === undefined) return ok(listQuery(story).lines);
      const kind = LIST_KINDS.find((k) => k === asked || `${k}s` === asked);
      return kind === undefined
        ? err(usageError(`<kind> must be one of ${LIST_KINDS.join(", ")}`))
        : ok(listQuery(story, kind).lines);
    }
    case "touches":
      return withRef((ref) => touchesQuery(story, ref));
    case "scenes":
      return withRef((ref) => scenesQuery(story, ref));
    case "reader-order":
      return readerOrderQuery(story, a.text("before"))
        .mapErr(queryFailure)
        .map(({ lines }) => lines);
    case "span":
      return spanQuery(story, a.arg("from-event"), a.arg("to-event"))
        .mapErr(queryFailure)
        .map(({ lines }) => lines);
    case "trace":
      return withRef((ref) =>
        traceQuery(story, ref, fileSource(storyPath, story)),
      );
    case "mentions":
      return withRef((ref) => mentionsQuery(story, ref));
    case "gaps":
      return ok(gapsQuery(story).lines);
    case "contradictions":
      return ok(contradictionsQuery(story).lines);
    case "render":
      return renderQuery(story, a.list("section"))
        .mapErr(queryFailure)
        .map(({ lines }) => lines);
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
          const batch = batchState(story, path);
          recordBatch(path, batch, story, next, command);
          const report = editReport(story, next, command, {
            problems,
            prose: readProse(path, next),
            batch,
          });
          const lines = editReportLines(
            next,
            // `--remove` drops what it names, so isn't reported.
            a.bool("remove") === true
              ? { ...report, droppedLinks: null }
              : report,
            {
              source: fileSource(path, next),
              maxSuspects: MAX_STALE_LINES,
              linkName: (how) =>
                SCENE_LINK_NAMES[SCENE_LINK_KINDS.indexOf(how)] ?? how,
              droppedHint: "(--add adds without replacing the list)",
            },
          );
          return {
            story: next,
            stdout: lines.map((line) => `${line}\n`).join(""),
          };
        });
    }),
  );
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
