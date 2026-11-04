/**
 * A whole story as text a person can read, with no IDs: names, wants and
 * questions stand in for the records they belong to. It's how a sketch is
 * read and how its length is judged, so it says only what the story holds,
 * in the order a reader would want it.
 */

import { compareEvents, compileChronology } from "../time/chronology";
import type { Constraint, Position } from "../time/timeline";
import { storyContradictions } from "./contradictions";
import { isAnswered, type Ref, type Story } from "./story";

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
    section("Scenes, in telling order", sceneLines(story)),
    section("What the reader is waiting to find out", readerLines(story)),
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

/** "Joel's want to leave the tribe", or the want alone if nobody holds it. */
function driveName(story: Story, id: string): string {
  const drive = story.drives.find((d) => d.id === id);
  if (drive === undefined) return UNNAMED;
  const owner = actorName(story, drive.actorId);
  const want = named(drive.want);
  return owner === undefined ? `the want "${want}"` : `${owner}: "${want}"`;
}

function sceneTitle(story: Story, id: string): string {
  return named(story.scenes.find((scene) => scene.id === id)?.title);
}

/** What a reference names, in words. */
function refName(story: Story, ref: Ref): string {
  switch (ref.kind) {
    case "actor":
      return named(actorName(story, ref.id));
    case "drive":
      return driveName(story, ref.id);
    case "fact":
      return named(story.facts.find((f) => f.id === ref.id)?.text);
    case "readerQuestion":
      return named(
        story.readerQuestions.find((q) => q.id === ref.id)?.question,
      );
    case "event":
      return eventLabel(story, ref.id);
    case "scene":
      return `the scene "${sceneTitle(story, ref.id)}"`;
    case "openQuestion":
      return named(story.openQuestions.find((q) => q.id === ref.id)?.question);
    case "candidate":
      return named(
        story.openQuestions
          .find((q) => q.id === ref.questionId)
          ?.candidates.find((c) => c.id === ref.id)?.answer,
      );
  }
}

const RELATION_WORDS = {
  opposes: ["Opposes", "Opposed by"],
  allies: ["Allied with", "Allied with"],
  competes: ["Competes with", "Competes with"],
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
  for (const relation of drive.relations) {
    lines.push(
      `${sub}${RELATION_WORDS[relation.type][0]} ${driveName(story, relation.to)}.`,
    );
  }
  for (const other of story.drives) {
    for (const relation of other.relations) {
      if (relation.to === id) {
        lines.push(
          `${sub}${RELATION_WORDS[relation.type][1]} ${driveName(story, other.id)}.`,
        );
      }
    }
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
 * come before each, then by position, then by label. Unordered events fall
 * where that puts them.
 */
function eventLines(story: Story): string[] {
  const { events, positions, constraints } = story.timeline;
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
  const ordered = [...events].sort(
    (a, b) =>
      (earlier.get(a.id) ?? 0) - (earlier.get(b.id) ?? 0) ||
      (worldPosition(a.id)?.start ?? Number.POSITIVE_INFINITY) -
        (worldPosition(b.id)?.start ?? Number.POSITIVE_INFINITY) ||
      named(a.label).localeCompare(named(b.label)),
  );
  return ordered.map((event) => {
    const stated = constraints
      .filter((c) => c.a === event.id && c.b !== event.id)
      .map((c) => constraintText(story, c));
    const when = stated.length === 0 ? "" : ` [${stated.join("; ")}]`;
    const summary =
      event.summary.trim() === "" ? "" : `: ${sentence(event.summary)}`;
    return `- **${named(event.label)}**${positionText(story, worldPosition(event.id))}${when}${summary}`;
  });
}

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
        : `Puts pressure on ${scene.pressures.map((d) => driveName(story, d)).join("; ")}.`,
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

function openQuestionLines(story: Story): string[] {
  return story.openQuestions.flatMap((q) => {
    const settled = isAnswered(q);
    const marker =
      q.conflict && !settled ? " (a contradiction to resolve)" : "";
    const about =
      q.about.length === 0
        ? ""
        : ` Concerns ${q.about.map((ref) => refName(story, ref)).join("; ")}.`;
    return [
      `- ${q.question}${marker}${about}`,
      ...q.candidates.map((c) => {
        const chosen = c.id === q.answer ? " (chosen)" : "";
        const touches =
          c.touches.length === 0
            ? ""
            : ` Would touch ${c.touches.map((ref) => refName(story, ref)).join("; ")}.`;
        return `  - ${sentence(named(c.answer))}${chosen}${touches}`;
      }),
    ];
  });
}

/** Timeline problems in words; open conflicts are already marked above. */
function contradictionLines(story: Story): string[] {
  return storyContradictions(story).flatMap((c) => {
    if (c.source !== "timeline") return [];
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
