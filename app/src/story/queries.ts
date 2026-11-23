/**
 * The story's read queries (`show`, `list`, `touches`, `scenes`,
 * `reader-order`, `span`, `trace`, `mentions`, `gaps`, `contradictions`,
 * `render`), as pure functions of a story. Each returns the lines the CLI
 * prints and, beside them, the same answer as data, with refs written as
 * text (`drive:shut`) so a tool result can hold it as JSON. Two hold the
 * story's own shapes: `show` gives the record as stored, and `trace` the
 * `Suspect`s, whose prose lines only the prose source can place.
 *
 * Nothing here reads files or storage. Where scene prose comes in (`show`
 * of a scene, `trace`), the caller passes a `ProseSource`: the CLI reads
 * `scenes/*.md` beside the story file, and `./stored-queries.ts` projects
 * the scenes' linked documents.
 */

import { err, ok, type Result } from "neverthrow";
import { WORLD_FRAME } from "../time/timeline";
import {
  describeBetween,
  describeSpan,
  describeSpanRange,
  describeYears,
  spanRange,
} from "./calendar";
import { type Contradiction, storyContradictions } from "./contradictions";
import {
  type CountStep,
  countSeries,
  seriesTexts,
  stepsAround,
  stepText,
} from "./counts";
import { deliberateGaps, storyGaps } from "./gaps";
import {
  type FirstTold,
  knowledgeAlways,
  sceneNow,
  sceneSpan,
  type Telling,
  type TellingHow,
  type ToldSoFar,
  tellingOrder,
  tellingWords,
  toldBefore,
  trueOrder,
  viewpointGap,
  viewpointTurns,
} from "./learning";
import { type Mention, whatMentions } from "./mentions";
import { membershipsInStoryOrder } from "./order";
import { describe, excerpt, formatRef, gapName, shortDescribe } from "./refs";
import {
  countTime,
  eventTime,
  RENDER_SECTION_NAMES,
  renderStory,
} from "./render";
import { scenesTouching } from "./scenes";
import {
  type Candidate,
  type GapKind,
  type Knowledge,
  type Membership,
  type OpenQuestion,
  type QuestionState,
  questionState,
  type Ref,
  type RefKind,
  refExists,
  SCENE_LINK_KINDS,
  type Scene,
  type Story,
} from "./story";
import { TOUCH_KINDS, type TouchGroups, whatThisTouches } from "./touches";
import { type Prose, type Suspect, traceDependents } from "./trace";

/**
 * Where a story's scene prose is and how to name it: files beside the story
 * file for the CLI, linked documents for the store.
 */
export interface ProseSource {
  /** Each scene's prose there is, as `traceDependents` reads it. */
  readonly prose: readonly Prose[];
  /** The `show` line for a scene's prose: `prose: scenes/storm.md (1840 words)`. */
  proseLine(scene: Scene): string;
  /**
   * Where a scene's prose is, at a line (from 1) of the text in `prose`, or
   * as a whole for line 0: `scenes/harbour.md:3`.
   */
  locate(scene: string, line: number): string;
}

/** A source with no prose: every scene reads as not written yet. */
export const NO_PROSE: ProseSource = {
  prose: [],
  proseLine: () => "prose: not written yet",
  locate: (scene, line) =>
    line === 0 ? `scene:${scene} prose` : `scene:${scene} prose:${line}`,
};

/**
 * `refused`: the query names something the story doesn't have, such as a
 * missing record. `invalid`: the query itself is malformed, such as an
 * unknown render section.
 */
export type QueryError = { kind: "refused" | "invalid"; message: string };

/** What a query found: the lines to print, and the same as data. */
export type QueryResult<T> = { lines: string[]; data: T };

const refused = (message: string): QueryError => ({ kind: "refused", message });

/** Records of the kinds `list` lists: `list drive`. */
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

export type ListKind = (typeof LIST_KINDS)[number];

/** Printed above the gaps, so a list of them doesn't read as a to-do list. */
export const GAPS_ADVISORY =
  "Optional prompts, not problems: places you could add a link or a record. None is a reason to cut or merge anything true; a record can stay unlinked.";

function showRecord(story: Story, ref: Ref, source: ProseSource): string[] {
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
        ...membershipLines(story, actor.id),
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
        ...story.memberships.flatMap((m) =>
          [
            ...(m.since === event.id ? ["joins"] : []),
            ...(m.until === event.id ? ["leaves"] : []),
          ].map(
            (how) =>
              `membership ${m.id}: ${describe(story, { kind: "actor", id: m.member })} ${how} ${describe(story, { kind: "actor", id: m.group })}`,
          ),
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
        ...ids(
          "viewpoint",
          "actor",
          scene.viewpoint === undefined ? [] : [scene.viewpoint],
        ),
        ...ids("actors", "actor", scene.actors),
        ...ids("depicts", "event", scene.depicts),
        ...ids("pressures", "drive", scene.pressures),
        ...SCENE_LINK_KINDS.flatMap((how) => refs(how, scene[how])),
        source.proseLine(scene),
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
  const at = countTime(story, step.at);
  return `${describe(story, { kind: "event", id: step.at })}${at === undefined ? "" : ` at ${at}`}: ${text}${step.note.trim() === "" ? "" : ` (${step.note})`}`;
}

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

/**
 * `member of: actor:crew ("The crew") since event:signs-on ("Signs on")
 * (membership ivo-crew)` for each group the actor belongs to, and `member:`
 * for each member of the actor as a group, each in story order.
 */
function membershipLines(story: Story, actor: string): string[] {
  const line = (name: string, m: Membership, who: string) =>
    `${name}: ${describe(story, { kind: "actor", id: who })}${m.since === undefined ? "" : ` since ${describe(story, { kind: "event", id: m.since })}`}${m.until === undefined ? "" : ` until ${describe(story, { kind: "event", id: m.until })}`} (membership ${m.id})`;
  const sorted = membershipsInStoryOrder(story);
  return [
    ...sorted
      .filter((m) => m.member === actor)
      .map((m) => line("member of", m, m.group)),
    ...sorted
      .filter((m) => m.group === actor)
      .map((m) => line("member", m, m.member)),
  ];
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

/** The world position of an event, if it has one. */
const positionOf = (story: Story, id: string) =>
  story.timeline.positions.find(
    (p) => p.event === id && p.frame === WORLD_FRAME,
  );

/**
 * `11.7 to 12.7 years before`-style words for the time from one placed
 * event to another when either is placed by a month or more, else undefined.
 * `back` and `on` say the two directions.
 */
function rangeText(
  story: Story,
  from: string,
  to: string,
  back: string,
  on: string,
): string | undefined {
  const a = positionOf(story, from);
  const b = positionOf(story, to);
  if (a === undefined || b === undefined) return undefined;
  const range = spanRange(a, b);
  if (range === undefined) return undefined;
  const said = describeSpanRange(range);
  return said === undefined
    ? "either way round"
    : `${said}${range.max <= 0 ? back : on}`;
}

/** `From … to …: 27 days.`, saying which way it runs. */
function spanLine(story: Story, from: string, to: string): string {
  const a = startOf(story, from) ?? 0;
  const b = startOf(story, to) ?? 0;
  const ranged = [from, to].some((id) => {
    const p = positionOf(story, id);
    return p !== undefined && describeSpan(p) === undefined && p.end > p.start;
  });
  const years = rangeText(story, from, to, ", going back", "");
  if (years !== undefined) {
    return `From ${placedEvent(story, from)} to ${placedEvent(story, to)}: ${years} (an event placed by its month or year may be any part of it).`;
  }
  const gap =
    a === b
      ? "they start at the same time"
      : `${describeBetween(a, b)}${b < a ? ", going back" : ""}`;
  return `From ${placedEvent(story, from)} to ${placedEvent(story, to)}: ${gap}${ranged ? " (start to start)" : ""}.`;
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

/** `planted in 10, revealed and paid off in 24`. */
function tellingsText(tellings: readonly Telling[]): string {
  const scenes = [...new Set(tellings.map((t) => t.index))];
  return scenes
    .map(
      (at) =>
        `${tellings
          .filter((t) => t.index === at)
          .map((t) => TOLD_WORDS[t.how])
          .join(" and ")} in ${at + 1}`,
    )
    .join(", ");
}

/** `reader-order --before`: what the scenes before it have told, briefly. */
function toldBeforeLines(story: Story, index: number): string[] {
  const scene = story.scenes[index];
  if (scene === undefined) return [];
  const anchor = sceneNow(story, scene);
  const now = anchor === undefined ? undefined : startOf(story, anchor);
  const { told, withheld } = toldBefore(story, index);
  const line = ({ ref, tellings }: ToldSoFar) => {
    const event = eventOf(story, ref);
    const when = event === undefined ? undefined : eventTime(story, event);
    const then = event === undefined ? undefined : startOf(story, event);
    const years =
      event === undefined || anchor === undefined
        ? undefined
        : rangeText(story, event, anchor, " after", " before");
    const ago =
      years !== undefined
        ? `, ${years}`
        : now === undefined || then === undefined
          ? ""
          : then === now
            ? ", at the same time"
            : `, ${describeBetween(then, now)} ${then < now ? "before" : "after"}`;
    return `- ${shortDescribe(story, ref)}${when === undefined ? "" : ` at ${when}`}${ago}: ${tellingsText(tellings)}${unawareText(ref)}`;
  };
  const viewpoint =
    scene.viewpoint === undefined
      ? undefined
      : story.actors.find((actor) => actor.id === scene.viewpoint);
  const name =
    viewpoint === undefined
      ? ""
      : viewpoint.name.trim() === ""
        ? viewpoint.id
        : viewpoint.name;
  // Marks are taken as the scene opens, by story order, so a scene whose
  // events have no position is still placed.
  const opens = sceneSpan(story, scene)?.opens;
  /**
   * `; Mara doesn't know yet`, from the knowledge records, then what changes
   * during the scene: `; Mara believes until event:bell, in this scene`.
   */
  const unawareText = (ref: Ref) => {
    if (viewpoint === undefined) return "";
    const gap = viewpointGap(story, viewpoint.id, ref, opens, index);
    const how =
      gap === undefined
        ? undefined
        : gap.later
          ? "doesn't know yet"
          : gap.ended === undefined
            ? "doesn't know"
            : `no longer ${gap.ended}`;
    const believes =
      gap === undefined || gap.believes.length === 0
        ? ""
        : `, believes ${gap.believes.map((r) => shortDescribe(story, r)).join(" and ")}`;
    const turns = viewpointTurns(story, viewpoint.id, ref, scene).map(
      (t) =>
        `; ${name} ${t.how === "knows" ? "knows" : "believes"}${formatRef(t.what) === formatRef(ref) ? "" : ` ${formatRef(t.what)}`} ${t.turn === "starts" ? "from" : "until"} ${formatRef({ kind: "event", id: t.event })}, in this scene`,
    );
    return `${how === undefined ? "" : `; ${name} ${how}${believes}`}${turns.join("")}`;
  };
  const opening =
    viewpoint === undefined || opens === undefined || opens === anchor
      ? ""
      : ` as it opens at ${placedEvent(story, opens)}`;
  return [
    `Before ${index + 1}. ${shortDescribe(story, { kind: "scene", id: scene.id })}${viewpoint === undefined ? "" : `, through the eyes of ${name}${opening}`}${anchor === undefined ? "" : `, at ${placedEvent(story, anchor)} (the latest event it shows)`}, the reader has been told:`,
    ...(told.length === 0 ? ["(nothing yet)"] : told.map(line)),
    ...(withheld.length === 0
      ? []
      : [
          "Held back and not told yet:",
          ...withheld.map((ref) => `- ${shortDescribe(story, ref)}`),
        ]),
    ...countsBefore(story, scene),
  ];
}

/** Each count's value in effect at `event`, with how it stands. */
/**
 * Each count's value as the scene opens and each change from its earliest
 * event to its latest: `402, since event:surge at …; then 261 at
 * event:confession`.
 */
function countsBefore(story: Story, scene: Scene): string[] {
  if (scene.depicts.length === 0) return [];
  const lines = story.counts.flatMap((count) => {
    const { entering, during } = stepsAround(
      story,
      countSeries(story, count),
      scene.depicts,
    );
    if (entering === undefined && during.length === 0) return [];
    const at =
      entering === undefined ? undefined : countTime(story, entering.at);
    const opens =
      entering === undefined
        ? "none yet"
        : `${stepText(count, entering)}, since ${formatRef({ kind: "event", id: entering.at })}${at === undefined ? "" : ` at ${at}`}`;
    const then = during.map(
      (step) =>
        `; then ${stepText(count, step)} at ${formatRef({ kind: "event", id: step.at })}`,
    );
    return [
      `- ${shortDescribe(story, { kind: "count", id: count.id })}: ${opens}${then.join("")}`,
    ];
  });
  return lines.length === 0
    ? []
    : ["Counts as the scene opens, then as they change during it:", ...lines];
}

/** `- scene:docks summary: "twenty years ago" (may state when this happened)`. */
function mentionLines(story: Story, found: readonly Mention[]): string[] {
  return found.map(
    (m) => `- ${describe(story, m.ref)} ${m.field}: "${m.text}" (${m.how})`,
  );
}

/** `- 2. scenes/harbour.md:3 "Twenty years…": reason; reason`. */
export function suspectLines(
  story: Story,
  source: Pick<ProseSource, "locate">,
  found: readonly Suspect[],
): string[] {
  return found.map(({ target, reasons }) => {
    const what =
      target.kind === "record"
        ? describe(story, target.ref)
        : target.line === 0
          ? source.locate(target.scene, 0)
          : `${source.locate(target.scene, target.line)} "${excerpt(target.text)}"`;
    return `- ${what}: ${reasons.join("; ")}`;
  });
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
// The queries.

/**
 * The record a ref names, as the story holds it; an event with its world
 * position. Undefined when the story has no such record.
 */
export function storyRecord(story: Story, ref: Ref): unknown {
  const find = <T extends { id: string }>(items: readonly T[]) =>
    items.find((item) => item.id === ref.id);
  switch (ref.kind) {
    case "actor":
      return find(story.actors);
    case "drive":
      return find(story.drives);
    case "fact":
      return find(story.facts);
    case "readerQuestion":
      return find(story.readerQuestions);
    case "event": {
      const event = find(story.timeline.events);
      return event === undefined
        ? undefined
        : {
            ...event,
            position:
              story.timeline.positions.find(
                (p) => p.event === ref.id && p.frame === WORLD_FRAME,
              ) ?? null,
          };
    }
    case "scene":
      return find(story.scenes);
    case "openQuestion":
      return find(story.openQuestions);
    case "version":
      return find(story.versions);
    case "knowledge":
      return find(story.knowledge);
    case "object":
      return find(story.objects);
    case "count":
      return find(story.counts);
    case "candidate":
      return story.openQuestions
        .find((q) => q.id === ref.questionId)
        ?.candidates.find((c) => c.id === ref.id);
  }
}

const missing = (ref: Ref) => refused(`${formatRef(ref)} does not exist`);

/** `show <ref>`: one record with its IDs and links. */
export function showQuery(
  story: Story,
  ref: Ref,
  source: ProseSource = NO_PROSE,
): Result<QueryResult<{ ref: string; record: unknown }>, QueryError> {
  if (!refExists(story, ref)) return err(missing(ref));
  return ok({
    lines: [...showRecord(story, ref, source), ...markLines(story, ref)],
    data: { ref: formatRef(ref), record: storyRecord(story, ref) },
  });
}

/** `list [kind]`: the records of one kind, or of every kind under headings. */
export function listQuery(
  story: Story,
  kind?: ListKind,
): QueryResult<{ kind: ListKind; lines: string[] }[]> {
  const kinds = kind === undefined ? LIST_KINDS : [kind];
  const data = kinds.map((k) => ({ kind: k, lines: listLines(story, k) }));
  return {
    lines:
      kind === undefined
        ? data.flatMap(({ kind: k, lines }) =>
            lines.length === 0 ? [] : [`${k}s:`, ...lines.map((l) => `  ${l}`)],
          )
        : (data[0]?.lines ?? []),
    data,
  };
}

/** A touch as data: `{ ref: "drive:shut", label, how }`. */
export type TouchData = { ref: string; label: string; how: string[] };

const touchData = (groups: TouchGroups): TouchData[] =>
  TOUCH_KINDS.flatMap((kind) =>
    groups[kind].map((t) => ({
      ref: formatRef(t.ref),
      label: t.label,
      how: t.how,
    })),
  );

/** `touches <ref>`: declared links, and one step further. */
export function touchesQuery(
  story: Story,
  ref: Ref,
): Result<
  QueryResult<{ ref: string; direct: TouchData[]; further: TouchData[] }>,
  QueryError
> {
  return whatThisTouches(story, ref)
    .mapErr((e) => refused(e.message))
    .map((t) => ({
      lines: [
        `${formatRef(t.subject)}${t.label === t.subject.id ? "" : ` ("${t.label}")`} touches`,
        "Directly:",
        ...touchLines(t.direct),
        "One step further:",
        ...touchLines(t.further),
      ],
      data: {
        ref: formatRef(t.subject),
        direct: touchData(t.direct),
        further: touchData(t.further),
      },
    }));
}

/** `scenes <ref>`: the scenes that touch a record, in telling order, and how. */
export function scenesQuery(
  story: Story,
  ref: Ref,
): Result<
  QueryResult<{ scene: string; position: number; how: string[] }[]>,
  QueryError
> {
  return scenesTouching(story, ref)
    .mapErr((e) => refused(e.message))
    .map((found) => ({
      lines:
        found.length === 0
          ? ["No scene touches it."]
          : found.map(
              ({ scene, index, how }) =>
                `${index + 1}. ${describe(story, { kind: "scene", id: scene.id })}: ${how.join("; ")}`,
            ),
      data: found.map(({ scene, index, how }) => ({
        scene: scene.id,
        position: index + 1,
        how,
      })),
    }));
}

/** What the scenes before one have told the reader, as data. */
export type ToldBeforeData = {
  scene: string;
  /** In telling order, from 1. */
  position: number;
  told: { ref: string; tellings: { how: TellingHow; position: number }[] }[];
  withheld: string[];
};

/**
 * `reader-order`: each scene in telling order with what it tells, then
 * events in story order with where the reader first learns of each. With
 * `before`, only what the scenes before that one have told.
 */
export function readerOrderQuery(
  story: Story,
  before?: string,
): Result<QueryResult<ToldBeforeData | null>, QueryError> {
  if (before === undefined) {
    return ok({ lines: readerOrderLines(story), data: null });
  }
  const index = story.scenes.findIndex((scene) => scene.id === before);
  if (index === -1) return err(refused(`scene ${before} does not exist`));
  const { told, withheld } = toldBefore(story, index);
  return ok({
    lines: toldBeforeLines(story, index),
    data: {
      scene: before,
      position: index + 1,
      told: told.map(({ ref, tellings }) => ({
        ref: formatRef(ref),
        tellings: tellings.map((t) => ({ how: t.how, position: t.index + 1 })),
      })),
      withheld: withheld.map(formatRef),
    },
  });
}

/**
 * `span <from> <to>`: the time from one placed event to another, start to
 * start. `years` is in the timeline's world unit; negative runs back.
 */
export function spanQuery(
  story: Story,
  from: string,
  to: string,
): Result<
  QueryResult<{ from: string; to: string; years: number }>,
  QueryError
> {
  const missingEvent = [from, to].find(
    (id) => !refExists(story, { kind: "event", id }),
  );
  if (missingEvent !== undefined) {
    return err(refused(`event ${missingEvent} does not exist`));
  }
  const unplaced = [from, to].find((id) => startOf(story, id) === undefined);
  if (unplaced !== undefined) {
    return err(refused(`event ${unplaced} has no position (set-position)`));
  }
  return ok({
    lines: [spanLine(story, from, to)],
    data: {
      from,
      to,
      years: (startOf(story, to) ?? 0) - (startOf(story, from) ?? 0),
    },
  });
}

/** `trace <ref>`: what may depend on a record, likeliest first. */
export function traceQuery(
  story: Story,
  ref: Ref,
  source: ProseSource = NO_PROSE,
): Result<QueryResult<Suspect[]>, QueryError> {
  return traceDependents(story, ref, { prose: source.prose })
    .mapErr((e) => refused(e.message))
    .map((found) => ({
      lines:
        found.length === 0
          ? ["Nothing seems to depend on it."]
          : [
              `What may depend on ${describe(story, ref)}, likeliest first:`,
              ...suspectLines(story, source, found),
            ],
      data: found,
    }));
}

/** A mention as data, with its record's ref as text. */
export type MentionData = Omit<Mention, "ref"> & { ref: string };

/** `mentions <ref>`: the free text that mentions a record. */
export function mentionsQuery(
  story: Story,
  ref: Ref,
): Result<QueryResult<MentionData[]>, QueryError> {
  return whatMentions(story, ref)
    .mapErr((e) => refused(e.message))
    .map((found) => ({
      lines:
        found.length === 0
          ? ["No free text mentions it."]
          : mentionLines(story, found),
      data: found.map((m) => ({ ...m, ref: formatRef(m.ref) })),
    }));
}

/** A gap as data: `gap` is the `[gap ref]` that marks it deliberate. */
export type GapData = {
  kind: GapKind;
  ref: string | null;
  message: string;
  gap: string;
};

const gapWhere = (g: { kind: GapKind; ref: Ref | null }) =>
  `${gapName(g.kind)} ${g.ref === null ? "story" : formatRef(g.ref)}`;

/** `gaps`: optional prompts, and those marked deliberate. */
export function gapsQuery(story: Story): QueryResult<{
  gaps: GapData[];
  deliberate: (GapData & { reason: string })[];
}> {
  const gaps = storyGaps(story);
  const marked = deliberateGaps(story);
  const data = (g: { kind: GapKind; ref: Ref | null; message: string }) => ({
    kind: g.kind,
    ref: g.ref === null ? null : formatRef(g.ref),
    message: g.message,
    gap: gapWhere(g),
  });
  return {
    lines: [
      ...(gaps.length === 0
        ? ["No gaps found."]
        : [
            GAPS_ADVISORY,
            ...gaps.map((g) => `- ${g.message} [${gapWhere(g)}]`),
          ]),
      ...(marked.length === 0
        ? []
        : [
            `Marked deliberate, so not listed (${marked.length}): ${marked
              .map(({ gap }) => `[${gapWhere(gap)}]`)
              .join(", ")}`,
          ]),
    ],
    data: {
      gaps: gaps.map(data),
      deliberate: marked.map(({ gap, reason }) => ({ ...data(gap), reason })),
    },
  };
}

/** A contradiction as data: where it is, if it is on one record. */
export type ContradictionData = {
  source: Contradiction["source"];
  message: string;
  /** The record it is on: `knowledge:k`, or `membership m` for a membership. */
  on?: string;
};

/** The record a contradiction is on, as `contradictions` tags it. */
export function contradictionData(c: Contradiction): ContradictionData {
  const on =
    c.source === "openQuestion" ||
    c.source === "knowledge" ||
    c.source === "count"
      ? formatRef(c.ref)
      : c.source === "membership"
        ? `membership ${c.id}`
        : undefined;
  return {
    source: c.source,
    message: c.message,
    ...(on === undefined ? {} : { on }),
  };
}

/**
 * `contradictions`: timeline problems, effects before causes, circles of
 * causes, knowledge or memberships that end before they start, counts past
 * their totals, and open questions marked as conflicts.
 */
export function contradictionsQuery(
  story: Story,
): QueryResult<ContradictionData[]> {
  const found = storyContradictions(story).map(contradictionData);
  return {
    lines:
      found.length === 0
        ? ["No contradictions."]
        : found.map(
            (c) => `- ${c.message}${c.on === undefined ? "" : ` [${c.on}]`}`,
          ),
    data: found,
  };
}

/** `render`: the bible as readable text, or only the sections named. */
export function renderQuery(
  story: Story,
  sections?: readonly string[],
): Result<QueryResult<null>, QueryError> {
  const unknown = sections?.filter(
    (name) => !RENDER_SECTION_NAMES.includes(name),
  );
  if (unknown !== undefined && unknown.length > 0) {
    return err({
      kind: "invalid",
      message: `no section ${unknown.join(", ")}: --section takes ${RENDER_SECTION_NAMES.join(", ")}`,
    });
  }
  return ok({
    lines: [renderStory(story, sections).trimEnd()],
    data: null,
  });
}
