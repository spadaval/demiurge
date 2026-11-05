/**
 * A whole story as text a person can read, with no IDs: names, wants and
 * questions stand in for the records they belong to. It is the author's
 * bible, read while working on the story; it is not the story, and readers
 * never see it. The prose lives in each scene's own file.
 *
 * It says each thing once, in the order an author would want it, so it stays
 * easy to read: a want is printed in full only under its actor and named in a
 * few words elsewhere, a relation is printed once, and a constraint the
 * positions already satisfy is left out. Open questions are grouped by where
 * they stand (`questionState`), with the candidates ruled out and why. An
 * event's causes are named after it ("because of …"), and a scene's links
 * after the scene.
 */

import {
  type Chronology,
  compareEvents,
  compileChronology,
  type PointOrder,
} from "../time/chronology";
import type {
  Constraint,
  Position,
  TimeEvent,
  Timeline,
} from "../time/timeline";
import { storyContradictions } from "./contradictions";
import {
  type OpenQuestion,
  questionState,
  type Ref,
  SCENE_LINK_KINDS,
  type Story,
} from "./story";

/** The story as Markdown-like text. */
export function renderStory(story: Story): string {
  const sections = [
    section("Premise", story.premise.trim() === "" ? [] : [story.premise]),
    section("People and groups", actorLines(story)),
    section("Wants nobody holds yet", unheldDriveLines(story)),
    section("Events, in story order", eventLines(story)),
    section(
      "The world",
      story.facts.map((fact) => `- ${sentence(fact.text)}`),
    ),
    section("Who knows or believes what", knowledgeLines(story)),
    section("Scenes, in telling order", sceneLines(story)),
    section("What the reader is waiting to find out", readerLines(story)),
    section("Decided", decidedLines(story)),
    section("Left open for the reader", leftOpenLines(story)),
    section("Not decided yet", openQuestionLines(story)),
    section("Where the story pulls against itself", contradictionLines(story)),
  ].filter((text) => text !== "");
  return `${sections.join("\n\n")}\n`;
}

/** Words in `text`, counted as runs of non-space characters. */
export function wordCount(text: string): number {
  return text.split(/\s+/).filter((word) => word !== "").length;
}

function section(title: string, lines: string[]): string {
  return lines.length === 0 ? "" : [`## ${title}`, "", ...lines].join("\n");
}

const UNNAMED = "(unnamed)";
const named = (text: string | undefined) =>
  text === undefined || text.trim() === "" ? UNNAMED : text;

/** A sentence-like run of parts, skipping blank ones. */
const joined = (parts: readonly (string | undefined)[]) =>
  parts.filter((part) => part !== undefined && part.trim() !== "").join(" ");

/** The text, ending with a full stop unless it already ends a sentence. */
function sentence(text: string): string {
  const trimmed = text.trim();
  return /[.!?…:]["'”’)\]]*$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function actorName(story: Story, id: string | null): string | undefined {
  return story.actors.find((actor) => actor.id === id)?.name;
}

function eventLabel(story: Story, id: string): string {
  return named(story.timeline.events.find((event) => event.id === id)?.label);
}

/** The fewest words a reference to a want or a record's text starts with. */
const SHORT_WORDS = 5;
/** The most words such a reference uses. */
const MAX_SHORT_WORDS = 8;

/** The first `count` words of `text`, with "…" if any were left out. */
function firstWords(text: string, count: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= count) return text.trim().replace(/[.!?…:;,]+$/, "");
  return `${words
    .slice(0, count)
    .join(" ")
    .replace(/[.!?…:;,]+$/, "")}…`;
}

/** A drive's want in the fewest words, from five up to eight, that tell it apart. */
function wantWords(story: Story, id: string): string {
  const drive = story.drives.find((d) => d.id === id);
  if (drive === undefined) return UNNAMED;
  const want = named(drive.want);
  const rivals = story.drives
    .filter((d) => d.id !== id && d.actorId === drive.actorId)
    .map((d) => named(d.want));
  for (let count = SHORT_WORDS; count < MAX_SHORT_WORDS; count++) {
    const short = firstWords(want, count);
    if (rivals.every((other) => firstWords(other, count) !== short)) {
      return short;
    }
  }
  return firstWords(want, MAX_SHORT_WORDS);
}

/**
 * A drive named by its actor and the first words of its want, `Joel: "Find
 * where he belongs"`: the want is printed in full only under its actor.
 */
function driveName(story: Story, id: string): string {
  const drive = story.drives.find((d) => d.id === id);
  if (drive === undefined) return UNNAMED;
  const owner = actorName(story, drive.actorId);
  const want = `"${wantWords(story, id)}"`;
  return owner === undefined ? want : `${owner}: ${want}`;
}

function sceneTitle(story: Story, id: string): string {
  return named(story.scenes.find((scene) => scene.id === id)?.title);
}

/** Text printed in full elsewhere, in its first few words. */
const shortText = (text: string | undefined) =>
  firstWords(named(text), MAX_SHORT_WORDS);

/** What a reference names, in words. */
function refName(story: Story, ref: Ref): string {
  switch (ref.kind) {
    case "actor":
      return named(actorName(story, ref.id));
    case "drive":
      return driveName(story, ref.id);
    case "fact":
      return shortText(story.facts.find((f) => f.id === ref.id)?.text);
    case "readerQuestion":
      return shortText(
        story.readerQuestions.find((q) => q.id === ref.id)?.question,
      );
    case "event":
      return eventLabel(story, ref.id);
    case "scene":
      return `the scene "${sceneTitle(story, ref.id)}"`;
    case "openQuestion":
      return shortText(
        story.openQuestions.find((q) => q.id === ref.id)?.question,
      );
    case "candidate":
      return shortText(
        story.openQuestions
          .find((q) => q.id === ref.questionId)
          ?.candidates.find((c) => c.id === ref.id)?.answer,
      );
    case "version": {
      const version = story.versions.find((v) => v.id === ref.id);
      if (version === undefined) return UNNAMED;
      const event = eventLabel(story, version.event);
      return version.by.length === 0
        ? `an account of ${event}`
        : `${tellers(story, version.by)}'s account of ${event}`;
    }
    case "knowledge": {
      const k = story.knowledge.find((x) => x.id === ref.id);
      if (k === undefined) return UNNAMED;
      // Knowledge of knowledge is named one level deep.
      const what =
        k.what.kind === "knowledge"
          ? `what ${named(actorName(story, story.knowledge.find((x) => x.id === k.what.id)?.actor ?? null))} holds`
          : refName(story, k.what);
      return `${named(actorName(story, k.actor))} ${k.how}: ${what}`;
    }
  }
}

const RELATION_WORDS = {
  opposes: "Opposes",
  allies: "Allied with",
  competes: "Competes with",
} as const;

/** The drive's want, then its details, each prefixed. */
function driveLines(
  story: Story,
  id: string,
  head: string,
  indent: string,
): string[] {
  const drive = story.drives.find((d) => d.id === id);
  if (drive === undefined) return [];
  const lines = [
    `${head}${sentence(`Wants: ${named(drive.want)}`)} ${joined([
      drive.stakes.trim() === ""
        ? undefined
        : sentence(`At stake: ${drive.stakes}`),
      drive.method.trim() === "" ? undefined : sentence(`How: ${drive.method}`),
    ])}`.trimEnd(),
  ];
  const sub = indent;
  if (drive.origins.length > 0) {
    lines.push(
      `${sub}Comes from: ${drive.origins.map((e) => eventLabel(story, e)).join("; ")}.`,
    );
  }
  // Printed once, under the drive that holds it.
  for (const relation of drive.relations) {
    lines.push(
      `${sub}${RELATION_WORDS[relation.type]} ${driveName(story, relation.to)}.`,
    );
  }
  return lines;
}

function actorLines(story: Story): string[] {
  return story.actors.flatMap((actor) => [
    `- ${joined([
      `**${named(actor.name)}**${actor.kind === "organization" ? " (a group)" : ""}.`,
      actor.notes.trim() === "" ? undefined : sentence(actor.notes),
    ])}`,
    ...story.drives
      .filter((drive) => drive.actorId === actor.id)
      .flatMap((drive) => driveLines(story, drive.id, "  ", "    ")),
  ]);
}

function unheldDriveLines(story: Story): string[] {
  return story.drives
    .filter((drive) => actorName(story, drive.actorId) === undefined)
    .flatMap((drive) => driveLines(story, drive.id, "- ", "    "));
}

function positionText(story: Story, position: Position | undefined): string {
  if (position === undefined) return "";
  const { worldUnit } = story.timeline;
  const range =
    position.start === position.end
      ? `${position.start}`
      : `${position.start} to ${position.end}`;
  return ` (${worldUnit} ${range}${position.precision === null ? "" : `, ${position.precision}`})`;
}

function constraintText(story: Story, c: Constraint): string {
  const other = eventLabel(story, c.b);
  const gap =
    c.duration === null
      ? ""
      : `${c.duration.amount} ${story.timeline.worldUnit}${c.duration.amount === 1 ? "" : "s"}${c.duration.tolerance === undefined ? "" : ` (give or take ${c.duration.tolerance})`} `;
  switch (c.relation) {
    case "before":
      return `${gap}before ${other}`;
    case "after":
      return `${gap}after ${other}`;
    case "during":
      return `during ${other}`;
    case "simultaneous":
      return `at the same time as ${other}`;
  }
}

/**
 * Events in the order story time gives them: by how many events are known to
 * come before each, then by position, then causes before their effects, then
 * by label. Unordered events fall where that puts them.
 */
export function eventsInStoryOrder(story: Story): TimeEvent[] {
  const { events, positions } = story.timeline;
  const chronology = compileChronology(story.timeline, []);
  const worldPosition = (id: string) =>
    positions.find((p) => p.event === id && p.frame === "world");
  const earlier = new Map(
    events.map(({ id }) => [
      id,
      events.filter(
        (other) => compareEvents(chronology, other.id, id) === "before",
      ).length,
    ]),
  );
  const depth = causeDepths(story);
  return [...events].sort(
    (a, b) =>
      (earlier.get(a.id) ?? 0) - (earlier.get(b.id) ?? 0) ||
      (worldPosition(a.id)?.start ?? Number.POSITIVE_INFINITY) -
        (worldPosition(b.id)?.start ?? Number.POSITIVE_INFINITY) ||
      depth(a.id) - depth(b.id) ||
      named(a.label).localeCompare(named(b.label)),
  );
}

const worldPositionOf = (story: Story, id: string) =>
  story.timeline.positions.find((p) => p.event === id && p.frame === "world");

/** `year 30`, `year 1200 to 1210, spring`, or undefined if it has no place. */
export function eventTime(story: Story, id: string): string | undefined {
  const text = positionText(story, worldPositionOf(story, id));
  return text === "" ? undefined : text.slice(2, -1);
}

function eventLines(story: Story): string[] {
  const { constraints } = story.timeline;
  const ordered = eventsInStoryOrder(story);
  const worldPosition = (id: string) => worldPositionOf(story, id);
  const placed = positionsOnly(story.timeline);
  return ordered.flatMap((event) => {
    const stated = constraints
      .filter(
        (c) => c.a === event.id && c.b !== event.id && !satisfiedBy(placed, c),
      )
      .map((c) => constraintText(story, c));
    const when = stated.length === 0 ? "" : ` [${stated.join("; ")}]`;
    const summary =
      event.summary.trim() === "" ? "" : `: ${sentence(event.summary)}`;
    return [
      `- **${named(event.label)}**${positionText(story, worldPosition(event.id))}${when}${summary}${becauseText(story, event.id, summary !== "")}`,
      ...story.versions
        .filter((v) => v.event === event.id)
        .map(
          (v) =>
            `  - ${v.by.length === 0 ? "One account" : `As ${tellers(story, v.by)} tell${v.by.length === 1 ? "s" : ""} it`}: ${sentence(named(v.text))}`,
        ),
    ];
  });
}

/** `Lew`, `Lew and Ada`, `Lew, Ada and Tom`. */
function tellers(story: Story, ids: readonly string[]): string {
  const names = ids.map((id) => named(actorName(story, id)));
  return names.length <= 1
    ? (names[0] ?? "")
    : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** `Mara knows: The lamp was out, from The wreck until The trial.` */
function knowledgeLines(story: Story): string[] {
  return [...story.knowledge]
    .sort((a, b) =>
      named(actorName(story, a.actor)).localeCompare(
        named(actorName(story, b.actor)),
      ),
    )
    .map((k) => {
      const when = joined([
        k.since === undefined
          ? undefined
          : `from ${eventLabel(story, k.since)}`,
        k.until === undefined
          ? undefined
          : `until ${eventLabel(story, k.until)}`,
      ]);
      return `- ${sentence(`${refName(story, { kind: "knowledge", id: k.id })}${when === "" ? "" : `, ${when}`}`)}`;
    });
}

/** "Because of" takes two of a link's eight words. */
const CAUSE_WORDS = MAX_SHORT_WORDS - 2;

/**
 * ` Because of The wreck; The storm.` after a summary, `, because of …`
 * without one, or nothing for an event with no cause.
 */
function becauseText(story: Story, id: string, afterSummary: boolean): string {
  const causes = story.causes
    .filter(({ effect, cause }) => effect === id && cause !== id)
    .map(({ cause }) => cause)
    .filter((cause) => story.timeline.events.some((e) => e.id === cause));
  if (causes.length === 0) return "";
  const names = causes.map((cause) =>
    firstWords(eventLabel(story, cause), CAUSE_WORDS),
  );
  const because = `ecause of ${names.join("; ")}`;
  return afterSummary
    ? ` ${sentence(`B${because}`)}`
    : `, ${sentence(`b${because}`)}`;
}

/**
 * How long the longest chain of causes leading to each event is, so a cause
 * sorts before its effects. A cycle is cut where it closes.
 */
function causeDepths(story: Story): (id: string) => number {
  const depths = new Map<string, number>();
  const visiting = new Set<string>();
  const depth = (id: string): number => {
    const known = depths.get(id);
    if (known !== undefined) return known;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const causes = story.causes
      .filter(({ effect, cause }) => effect === id && cause !== id)
      .map(({ cause }) => cause);
    const found = causes.length === 0 ? 0 : 1 + Math.max(...causes.map(depth));
    visiting.delete(id);
    depths.set(id, found);
    return found;
  };
  return depth;
}

/** The order the timeline's positions alone give, without its constraints. */
function positionsOnly(timeline: Timeline): Chronology {
  return compileChronology(
    { ...timeline, constraints: [], placements: [] },
    [],
  );
}

/** A duration without a tolerance is as precise as its unit: half a unit. */
const DEFAULT_TOLERANCE = 0.5;

/**
 * Whether positions alone already give what the constraint says, so printing
 * it would say the same thing twice. One they don't settle, or that they
 * contradict, isn't satisfied.
 *
 * A gap is settled when the positions put it within the stated amount, give
 * or take its tolerance. Two events placed no more precisely than a unit
 * (points, or whole years) are that far apart when their starts are: 1203
 * and 1213 are ten years apart. For longer spans the gap runs from the end of
 * the earlier to the start of the later, so every gap their positions allow
 * must fit: 1200 to 1210 and 1220 to 1230 could be 10 to 30 years apart.
 */
function satisfiedBy(placed: Chronology, c: Constraint): boolean {
  const point = (event: string, end: "start" | "end") =>
    placed.point(event, end);
  const aStart = point(c.a, "start");
  const aEnd = point(c.a, "end");
  const bStart = point(c.b, "start");
  const bEnd = point(c.b, "end");
  if (
    aStart === undefined ||
    aEnd === undefined ||
    bStart === undefined ||
    bEnd === undefined
  ) {
    return false;
  }
  const notAfter = (order: PointOrder) =>
    order === "before" || order === "same_or_before" || order === "same";
  switch (c.relation) {
    case "during":
      return (
        notAfter(placed.comparePoints(bStart, aStart)) &&
        notAfter(placed.comparePoints(aEnd, bEnd))
      );
    case "simultaneous":
      return (
        placed.comparePoints(aStart, bStart) === "same" &&
        placed.comparePoints(aEnd, bEnd) === "same"
      );
    case "before":
    case "after": {
      if (compareEvents(placed, c.a, c.b) !== c.relation) return false;
      const { duration } = c;
      if (duration === null) return true;
      const [earlier, later] =
        c.relation === "before" ? [c.a, c.b] : [c.b, c.a];
      const from = placed.interval(earlier, duration.frame);
      const to = placed.interval(later, duration.frame);
      if (from === undefined || to === undefined) return false;
      const tolerance = duration.tolerance ?? DEFAULT_TOLERANCE;
      const fits = (gap: number) =>
        Math.abs(gap - duration.amount) <= tolerance + 1e-9;
      const withinAUnit = (span: { start: number; end: number }) =>
        span.end - span.start <= 1;
      return withinAUnit(from) && withinAUnit(to)
        ? fits(to.start - from.start)
        : fits(to.start - from.end) && fits(to.end - from.start);
    }
  }
}

const SCENE_LINK_WORDS = {
  reveals: "Reveals",
  implies: "Implies",
  withholds: "Withholds",
} as const;

function sceneLines(story: Story): string[] {
  return story.scenes.flatMap((scene, i) => {
    const details = [
      scene.actors.length === 0
        ? undefined
        : `With ${scene.actors.map((a) => named(actorName(story, a))).join(", ")}.`,
      scene.depicts.length === 0
        ? undefined
        : `Shows: ${scene.depicts.map((e) => eventLabel(story, e)).join("; ")}.`,
      scene.pressures.length === 0
        ? undefined
        : `Pressure on ${scene.pressures.map((d) => driveName(story, d)).join("; ")}.`,
      ...SCENE_LINK_KINDS.map((how) =>
        scene[how].length === 0
          ? undefined
          : sentence(
              `${SCENE_LINK_WORDS[how]}: ${scene[how].map((ref) => refName(story, ref)).join("; ")}`,
            ),
      ),
    ];
    const summary =
      scene.summary.trim() === "" ? "" : ` ${sentence(scene.summary)}`;
    const more = joined(details);
    return [
      `${i + 1}. **${named(scene.title)}**.${summary}`,
      ...(more === "" ? [] : [`   ${more}`]),
    ];
  });
}

function readerLines(story: Story): string[] {
  return story.readerQuestions.map((q) => {
    const where = [
      q.opensAt === undefined
        ? undefined
        : `raised in "${sceneTitle(story, q.opensAt)}"`,
      q.answeredAt === undefined
        ? undefined
        : `answered in "${sceneTitle(story, q.answeredAt)}"`,
    ].filter((part) => part !== undefined);
    return `- ${q.question}${where.length === 0 ? "" : ` (${where.join("; ")})`}`;
  });
}

/** A question's ruled-out candidates, each with why, a line apiece. */
function ruledOutLines(q: OpenQuestion): string[] {
  return q.candidates.flatMap((c) =>
    c.rejected === undefined || c.id === q.answer
      ? []
      : [
          `  - ${joined([
            sentence(`Ruled out: ${named(c.answer)}`),
            c.rejected.trim() === "" ? undefined : sentence(c.rejected),
          ])}`,
        ],
  );
}

/**
 * Undecided questions, each with its candidates still in the running and
 * those ruled out, a line apiece; what a candidate touches stays in the file.
 */
function openQuestionLines(story: Story): string[] {
  return story.openQuestions
    .filter((q) => questionState(story, q).state === "undecided")
    .flatMap((q) => {
      const marker = q.conflict ? " (a contradiction to resolve)" : "";
      return [
        `- ${q.question}${marker}${concerns(story, q.about)}`,
        ...q.candidates
          .filter((c) => c.rejected === undefined)
          .map((c) => `  - ${sentence(named(c.answer))}`),
        ...ruledOutLines(q),
      ];
    });
}

/**
 * Answered questions with the chosen answer, where it is revealed, and the
 * candidates ruled out. What the question concerns stays in the file.
 */
function decidedLines(story: Story): string[] {
  return story.openQuestions.flatMap((q) => {
    const state = questionState(story, q);
    const chosen = q.candidates.find((c) => c.id === q.answer);
    if (chosen === undefined || state.state === "left_open") return [];
    const where =
      state.state === "revealed"
        ? `Revealed in "${sceneTitle(story, state.scene)}".`
        : "Not revealed yet.";
    return [
      `- ${q.question} ${sentence(named(chosen.answer))} ${where}`,
      ...ruledOutLines(q),
    ];
  });
}

/** Questions the story leaves open for the reader, with why, and any answer. */
function leftOpenLines(story: Story): string[] {
  return story.openQuestions.flatMap((q) => {
    const state = questionState(story, q);
    if (state.state !== "left_open") return [];
    const chosen = q.candidates.find((c) => c.id === q.answer);
    return [
      `- ${joined([
        q.question,
        chosen === undefined
          ? undefined
          : sentence(`The author's answer: ${named(chosen.answer)}`),
        state.reason.trim() === "" ? undefined : sentence(state.reason),
      ])}`,
      ...ruledOutLines(q),
    ];
  });
}

function concerns(story: Story, about: readonly Ref[]): string {
  return about.length === 0
    ? ""
    : ` Concerns ${about.map((ref) => refName(story, ref)).join("; ")}.`;
}

/**
 * Timeline, cause and knowledge problems in words; open conflicts are
 * already marked above.
 */
function contradictionLines(story: Story): string[] {
  return storyContradictions(story).flatMap((c) => {
    if (c.source === "openQuestion") return [];
    if (c.source === "knowledge") {
      const k = story.knowledge.find((x) => x.id === c.ref.id);
      return k?.since === undefined || k.until === undefined
        ? []
        : [
            `- ${refName(story, c.ref)} ends with ${eventLabel(story, k.until)}, which happens before ${eventLabel(story, k.since)}, when it starts.`,
          ];
    }
    if (c.source === "cause") {
      return c.kind === "effect_first"
        ? [
            `- ${eventLabel(story, c.effect)} happens before ${eventLabel(story, c.cause)}, though it happens because of it.`,
          ]
        : [
            `- These events cause each other in a circle: ${c.events.map((e) => eventLabel(story, e)).join("; ")}.`,
          ];
    }
    const { problem } = c;
    switch (problem.kind) {
      case "contradiction":
        return [
          `- These events can't all happen in the order given: ${problem.events.map((e) => eventLabel(story, e)).join("; ")}.`,
        ];
      case "inconsistent_duration":
        return [
          `- The time stated between ${problem.events.map((e) => eventLabel(story, e)).join(" and ")} doesn't match when they happen.`,
        ];
      case "inconsistent_frame":
        return [
          `- The clocks disagree about ${problem.events.map((e) => eventLabel(story, e)).join("; ")}.`,
        ];
      default:
        return [`- ${problem.message}`];
    }
  });
}
