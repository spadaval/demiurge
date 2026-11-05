/**
 * A command line for sketching and reworking a story held in one file
 * (`src/story/`). It's a thin wrapper: each edit is one `StoryCommand`, and
 * the file is written only if the command succeeds. Run it with `--help`.
 *
 * Exit codes: 0 on success (including an edit that adds a timeline problem,
 * which is kept and printed), 1 when a command is refused or a file can't be
 * read or written, 2 for a malformed command line.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { err, ok, Result } from "neverthrow";
import {
  applyStoryCommand,
  type StoryCommand,
  type StoryCommandType,
} from "../src/story/commands";
import { storyContradictions } from "../src/story/contradictions";
import { deliberateGaps, storyGaps } from "../src/story/gaps";
import { type Mention, whatMentions } from "../src/story/mentions";
import { renderStory, wordCount } from "../src/story/render";
import {
  GAP_KINDS,
  type GapKind,
  newStory,
  parseStory,
  type Ref,
  type RefKind,
  refExists,
  type Story,
  serializeStory,
} from "../src/story/story";
import {
  refLabel,
  TOUCH_KINDS,
  type TouchGroups,
  whatThisTouches,
} from "../src/story/touches";
import { WORLD_FRAME } from "../src/time/timeline";

// ---------------------------------------------------------------------------
// Refs as text: `drive:shut`, `candidate:why/ferryman`.

const KIND_NAMES: Record<Ref["kind"], string> = {
  actor: "actor",
  drive: "drive",
  fact: "fact",
  readerQuestion: "reader-question",
  event: "event",
  scene: "scene",
  openQuestion: "open-question",
  candidate: "candidate",
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
const refList = (help: string) =>
  ({ value: "<ref,ref,...>", help: `${help} ("" for none)` }) as const;

/** `null` for `none`. */
const orNone = (value: string): string | null =>
  value === "none" ? null : value;

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
    summary: "Remove an actor. Their drives stay, held by nobody.",
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
    summary: "Remove an event, its position and constraints, and links to it.",
    example: ["remove-event", "wreck"],
    build: (a) => ({ type: "removeEvent", id: a.arg("id") }),
  },
  setPosition: {
    group: "Events: what happens in story time",
    args: ["event-id", "start"],
    flags: {
      end: { value: "<number>", help: "default: the start" },
      precision: { value: "<text>", help: 'such as "roughly"' },
    },
    summary:
      'Place an event at a time in years (start "none" unplaces it). A move that contradicts other events is kept and reported.',
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
      const at = a.number(start, "<start>");
      return {
        type: "setPosition",
        event: a.arg("event-id"),
        frame: WORLD_FRAME,
        position: {
          start: at,
          end: end === undefined ? at : a.number(end, "--end"),
          ...(precision === undefined ? {} : { precision }),
        },
      };
    },
  },
  constrain: {
    group: "Events: what happens in story time",
    args: ["id", "a", "relation", "b"],
    flags: {
      gap: { value: "<years>", help: "with before or after: how long between" },
      tolerance: { value: "<years>", help: "give or take, with --gap" },
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
              duration: {
                amount: a.number(gap, "--gap"),
                frame: WORLD_FRAME,
                ...(tolerance === undefined
                  ? {}
                  : { tolerance: a.number(tolerance, "--tolerance") }),
              },
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
    summary: "Remove a drive and every link to it.",
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

  addScene: {
    group: "Scenes: the telling",
    args: ["id", "title"],
    flags: { summary: text },
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
    summary: "Remove a scene and links to it.",
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
    summary: "Remove a fact.",
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
    summary: "Remove a reader question.",
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
    group: "Open questions: what isn't decided yet",
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
    group: "Open questions: what isn't decided yet",
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
    group: "Open questions: what isn't decided yet",
    args: ["id"],
    summary: "Remove an open question and its candidates.",
    example: ["remove-open-question", "who-wrote"],
    build: (a) => ({ type: "removeOpenQuestion", id: a.arg("id") }),
  },
  addCandidate: {
    group: "Open questions: what isn't decided yet",
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
    group: "Open questions: what isn't decided yet",
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
    group: "Open questions: what isn't decided yet",
    args: ["question-id", "id"],
    summary: "Remove a candidate answer.",
    example: ["remove-candidate", "who-wrote", "ferryman"],
    build: (a) => ({
      type: "removeCandidate",
      questionId: a.arg("question-id"),
      id: a.arg("id"),
    }),
  },
  answerOpenQuestion: {
    group: "Open questions: what isn't decided yet",
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
    group: "Open questions: what isn't decided yet",
    args: ["question-id"],
    summary: "Make the question open again. The answer is kept as superseded.",
    example: ["unanswer-open-question", "who-wrote"],
    build: (a) => ({ type: "unanswerOpenQuestion", id: a.arg("question-id") }),
  },
  setOpenQuestionWorking: {
    group: "Open questions: what isn't decided yet",
    args: ["question-id"],
    flags: {
      stop: { bool: true, help: "stop weighing, so render shows them again" },
    },
    summary:
      "Mark the question as being weighed: render shows it in one line and leaves out its candidates, which stay in the file.",
    example: ["set-open-question-working", "who-wrote"],
    build: (a) => ({
      type: "setOpenQuestionWorking",
      id: a.arg("question-id"),
      working: a.bool("stop") !== true,
    }),
  },

  markGapDeliberate: {
    group: "Gaps: what isn't woven in yet",
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
    group: "Gaps: what isn't woven in yet",
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
    .map((type) => [kebab(type), type]),
);

// ---------------------------------------------------------------------------
// Read commands.

type ReadName =
  | "init"
  | "show"
  | "list"
  | "touches"
  | "mentions"
  | "gaps"
  | "contradictions"
  | "render";

const LIST_KINDS = [
  "actor",
  "drive",
  "event",
  "constraint",
  "scene",
  "fact",
  "reader-question",
  "open-question",
  "candidate",
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
  mentions: {
    group: "Start and read",
    args: ["ref"],
    summary:
      "Free text that mentions a record: its name, a drive's holder, an event's year, and spans or seasons near an event. Edits that change a record print this too. Nothing is rewritten.",
    example: ["mentions", "event:wreck"],
  },
  gaps: {
    group: "Start and read",
    args: [],
    summary:
      "What isn't woven in yet, each with its [gap ref] for mark-gap-deliberate. Prompts, not a to-do list.",
    example: ["gaps"],
  },
  contradictions: {
    group: "Start and read",
    args: [],
    summary:
      "Timeline problems, effects placed before their causes, circles of causes, and open questions marked as conflicts.",
    example: ["contradictions"],
  },
  render: {
    group: "Start and read",
    args: [],
    summary:
      "The whole story as readable text with no IDs, then its word count.",
    example: ["render"],
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
    `  ${usage(name, spec)}`,
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
    "edit that makes events contradict each other is kept: it prints the",
    "problem and exits zero, so the contradiction can be worked on.",
    "",
    "IDs are short names you choose, such as mara or who-wrote. A ref names",
    `any record as kind:id, with kind one of ${Object.values(KIND_NAMES).join(", ")};`,
    "a candidate is candidate:<question-id>/<candidate-id>. Lists of refs are",
    "comma-separated (--about actor:mara,event:wreck). Quote text with spaces.",
    "A link can only point at a record that exists, so add records first.",
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

function showRecord(story: Story, ref: Ref): string[] {
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
          : [
              `position: ${position.start}${position.end === position.start ? "" : ` to ${position.end}`} (${story.timeline.worldUnit})${position.precision === null ? "" : `, ${position.precision}`}`,
            ]),
        ...story.timeline.constraints
          .filter((c) => c.a === event.id || c.b === event.id)
          .map((c) => `constraint ${constraintLine(c)}`),
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
      ];
    }
    case "openQuestion": {
      const q = story.openQuestions.find((o) => o.id === ref.id);
      if (q === undefined) return head;
      return [
        ...head,
        `question: ${q.question}`,
        ...(q.conflict ? ["conflict: yes"] : []),
        ...(q.working === true ? ["working: yes"] : []),
        ...refs("about", q.about),
        ...(q.candidates.length === 0 ? ["candidates: none"] : ["candidates:"]),
        ...q.candidates.map(
          (c) =>
            `  ${formatRef({ kind: "candidate", questionId: q.id, id: c.id })}${c.id === q.answer ? " (chosen)" : ""}: ${c.answer}`,
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
    case "candidate": {
      const q = story.openQuestions.find((o) => o.id === ref.questionId);
      const c = q?.candidates.find((x) => x.id === ref.id);
      if (q === undefined || c === undefined) return head;
      return [
        ...head,
        `answer: ${c.answer}`,
        `question: ${describe(story, { kind: "openQuestion", id: q.id })}`,
        ...(c.id === q.answer ? ["chosen: yes"] : []),
        ...refs("touches", c.touches),
      ];
    }
  }
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

function constraintLine(c: {
  id: string;
  a: string;
  relation: string;
  b: string;
  duration: { amount: number; tolerance?: number } | null;
}): string {
  const gap =
    c.duration === null
      ? ""
      : ` (gap ${c.duration.amount}${c.duration.tolerance === undefined ? "" : ` ± ${c.duration.tolerance}`})`;
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
        return `${line({ kind: "event", id: e.id })}${p === undefined ? "" : ` at ${p.start}`}`;
      });
    case "constraint":
      return story.timeline.constraints.map(constraintLine);
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
          `${line({ kind: "openQuestion", id: q.id })}${q.answer === undefined ? "" : " (answered)"}${q.conflict ? " (conflict)" : ""}${q.working === true ? " (working)" : ""}`,
      );
    case "candidate":
      return story.openQuestions.flatMap((q) =>
        q.candidates.map(
          (c) =>
            `${line({ kind: "candidate", questionId: q.id, id: c.id })}${c.id === q.answer ? " (chosen)" : ""}`,
        ),
      );
  }
}

/** `- scene:docks summary: "twenty years ago" (may state when this happened)`. */
function mentionLines(story: Story, found: readonly Mention[]): string[] {
  return found.map(
    (m) => `- ${describe(story, m.ref)} ${m.field}: "${m.text}" (${m.how})`,
  );
}

/** The most mentions an edit prints; `mentions` lists them all. */
const MAX_STALE_LINES = 5;

/**
 * The record whose old version free text may still state, when the edit
 * changed something text can state: an actor's name, a drive's want or
 * holder, an event's label or position. An edit that changes none of these
 * prompts nothing.
 */
function changedRef(
  before: Story,
  after: Story,
  command: StoryCommand,
): Ref | undefined {
  const differs = <T>(find: (story: Story) => T) =>
    JSON.stringify(find(before)) !== JSON.stringify(find(after));
  switch (command.type) {
    case "setPosition": {
      const id = command.event;
      return differs((story) =>
        story.timeline.positions.find(
          (p) => p.event === id && p.frame === WORLD_FRAME,
        ),
      )
        ? { kind: "event", id }
        : undefined;
    }
    case "describeEvent": {
      const { id } = command;
      return differs(
        (story) => story.timeline.events.find((e) => e.id === id)?.label,
      )
        ? { kind: "event", id }
        : undefined;
    }
    case "updateDrive": {
      const { id } = command;
      return differs((story) => {
        const drive = story.drives.find((d) => d.id === id);
        return [drive?.want, drive?.actorId];
      })
        ? { kind: "drive", id }
        : undefined;
    }
    case "updateActor": {
      const { id } = command;
      return differs((story) => story.actors.find((a) => a.id === id)?.name)
        ? { kind: "actor", id }
        : undefined;
    }
    default:
      return undefined;
  }
}

/**
 * A prompt listing text that may still state what the edit changed, at most
 * `MAX_STALE_LINES` of it.
 */
function staleTextLines(
  before: Story,
  after: Story,
  command: StoryCommand,
): string[] {
  const ref = changedRef(before, after, command);
  if (ref === undefined) return [];
  const found = whatMentions(after, ref, before).unwrapOr([]);
  if (found.length === 0) return [];
  const shown = found.slice(0, MAX_STALE_LINES);
  const more = found.length - shown.length;
  return [
    `Free text that mentions ${formatRef(ref)} and may still state the old version (nothing was rewritten):`,
    ...mentionLines(after, shown),
    ...(more === 0
      ? []
      : [
          `...and ${more} more (${found.length} in all): run mentions ${formatRef(ref)} for all.`,
        ]),
  ];
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
): Result<string[], Failure> {
  switch (name) {
    case "init":
      return ok([]);
    case "show":
      return parseRef(a.arg("ref"))
        .mapErr(usageError)
        .andThen((ref) =>
          refExists(story, ref)
            ? ok([...showRecord(story, ref), ...markLines(story, ref)])
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
          : gaps.map((g) => `- ${g.message} ${where(g)}`)),
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
                `- ${c.message}${c.source === "openQuestion" ? ` [${formatRef(c.ref)}]` : ""}`,
            ),
      );
    }
    case "render": {
      const text = renderStory(story);
      return ok([text.trimEnd(), "", `(${wordCount(text)} words)`]);
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
        .andThen((story) => runRead(name, a, story))
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
        .map(({ story: next, problems }) => ({
          story: next,
          stdout: [
            "Saved.",
            ...problems.map(
              (p) =>
                `Timeline problem (kept; see contradictions): ${p.message}`,
            ),
            ...addedCauseProblems(story, next).map(
              (message) =>
                `Cause problem (kept; see contradictions): ${message}`,
            ),
            ...staleTextLines(story, next, command),
          ]
            .join("\n")
            .concat("\n"),
        }));
    }),
  );
}

/** Cause contradictions in `after` that weren't in `before`. */
function addedCauseProblems(before: Story, after: Story): string[] {
  const found = (story: Story) =>
    storyContradictions(story).flatMap((c) =>
      c.source !== "cause"
        ? []
        : [
            {
              key: JSON.stringify([
                c.kind,
                ...(c.kind === "cycle" ? c.events : [c.cause, c.effect]),
              ]),
              message: c.message,
            },
          ],
    );
  const old = new Set(found(before).map(({ key }) => key));
  return found(after)
    .filter(({ key }) => !old.has(key))
    .map(({ message }) => message);
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
