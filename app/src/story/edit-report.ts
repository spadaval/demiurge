/**
 * What an edit did besides what it was told, so it can be reported and never
 * silently kept: timeline problems and other contradictions it added (kept,
 * as `./commands.ts` keeps them), records that went with the one it removed,
 * scene links a replaced list dropped, links that now cancel out, and the
 * text that may still state what it changed (`traceDependents`).
 *
 * `editReport` finds it as data; `editReportLines` writes the lines the CLI
 * prints after an edit. The story tools return the data whole.
 */

import { compileChronology, type TimelineProblem } from "../time/chronology";
import { timelineProblems } from "../time/commands";
import { WORLD_FRAME } from "../time/timeline";
import type { StoryCommand } from "./commands";
import { storyContradictions, timelineProblemMessage } from "./contradictions";
import { noteCountingAcross } from "./counts";
import { storyTexts } from "./mentions";
import { type ProseSource, storyRecord, suspectLines } from "./queries";
import { describe, excerpt, formatRef } from "./refs";
import {
  PARTICIPANT_KEY,
  type Participant,
  type Ref,
  type RefKind,
  refExists,
  type SceneLinkKind,
  type Story,
} from "./story";
import {
  contentStems,
  type Prose,
  type Suspect,
  traceDependents,
} from "./trace";

/**
 * What an edit's inline trace leaves out because the writer already has it
 * in hand, as refs (`scene:storm`): the scenes being written, records an
 * earlier edit in the same batch added, and records an earlier edit
 * rewrote, with the word stems it added.
 */
export type EditBatch = {
  writing: ReadonlySet<string>;
  created: ReadonlySet<string>;
  rewritten: ReadonlyMap<string, ReadonlySet<string>>;
};

/** A batch of one edit: nothing is left out. */
export const NO_BATCH: EditBatch = {
  writing: new Set(),
  created: new Set(),
  rewritten: new Map(),
};

/** The record as stored, with an event's position, to see whether an edit changed it. */
function recordState(story: Story, ref: Ref): string {
  return JSON.stringify(storyRecord(story, ref));
}

/** The record an edit changes the content of, if it changed it. */
export function changedRef(
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

/**
 * The story before the edit, as the trace should see it. A count's change
 * is only its value at one event, so only that value is looked for, and a
 * change of note alone (the same value), or one that leaves the old value
 * standing at another event, traces nothing: undefined.
 */
function countWas(
  before: Story,
  after: Story,
  command: StoryCommand,
): Story | undefined {
  if (command.type !== "setCount") return before;
  const old = before.counts
    .find((c) => c.id === command.id)
    ?.values.find((v) => v.at === command.at);
  if (old === undefined || old.value === command.value) return undefined;
  const standing = after.counts
    .find((c) => c.id === command.id)
    ?.values.some((v) => v.value === old.value);
  if (standing === true) return undefined;
  return {
    ...before,
    counts: before.counts.map((c) =>
      c.id === command.id ? { ...c, values: [old] } : c,
    ),
  };
}

/** Every record and candidate in the story, as refs. */
export function allRefs(story: Story): string[] {
  const ids = (kind: RefKind, items: readonly { id: string }[]) =>
    items.map((item) => formatRef({ kind, id: item.id }));
  return [
    ...ids("actor", story.actors),
    ...ids("drive", story.drives),
    ...ids("fact", story.facts),
    ...ids("readerQuestion", story.readerQuestions),
    ...ids("event", story.timeline.events),
    ...ids("scene", story.scenes),
    ...ids("openQuestion", story.openQuestions),
    ...ids("version", story.versions),
    ...ids("knowledge", story.knowledge),
    ...ids("object", story.objects),
    ...ids("count", story.counts),
    ...story.openQuestions.flatMap((q) =>
      q.candidates.map((c) =>
        formatRef({ kind: "candidate", questionId: q.id, id: c.id }),
      ),
    ),
  ];
}

/** The free text a record states, as one string. */
export const recordText = (story: Story, ref: Ref) =>
  storyTexts(story)
    .filter((t) => formatRef(t.ref) === formatRef(ref))
    .map((t) => t.value)
    .join(" ");

/**
 * The messages of the timeline problems an edit added, each once, leaving
 * out any that reads the same as a problem already there: a contradiction
 * an edit grows counts as added, but says nothing new when its message is
 * unchanged.
 */
function newTimelineMessages(
  before: Story,
  after: Story,
  problems: readonly TimelineProblem[],
): string[] {
  if (problems.length === 0) return [];
  const known = new Set(
    timelineProblems(compileChronology(before.timeline, [])).map((p) =>
      timelineProblemMessage(before, p),
    ),
  );
  return [
    ...new Set(problems.map((p) => timelineProblemMessage(after, p))),
  ].filter((message) => !known.has(message));
}

/**
 * The versions and knowledge an edit removed besides the record it named,
 * since removing one record can take them with it.
 */
function alsoRemoved(
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
  // A membership removed on its own isn't news either.
  const memberships =
    command.type === "removeMembership"
      ? []
      : before.memberships
          .filter((m) => !after.memberships.some((n) => n.id === m.id))
          .map(
            (m) =>
              `the membership ${m.id} of ${formatRef({ kind: "actor", id: m.member })} in ${formatRef({ kind: "actor", id: m.group })}`,
          );
  return [
    ...gone("version", before.versions, after.versions),
    ...gone("knowledge", before.knowledge, after.knowledge),
    ...participants.map((p) => `the part of ${p}`),
    ...memberships,
    ...values,
  ];
}

/**
 * The refs a scene-links set took off the list, since replacing a list can
 * drop one by accident.
 */
function droppedLinks(
  before: Story,
  after: Story,
  command: StoryCommand,
): DroppedLinks | null {
  if (command.type !== "setSceneLinks") return null;
  const links = (story: Story) =>
    (story.scenes.find((s) => s.id === command.id)?.[command.how] ?? []).map(
      formatRef,
    );
  const now = new Set(links(after));
  const dropped = links(before).filter((ref) => !now.has(ref));
  return dropped.length === 0
    ? null
    : { scene: command.id, how: command.how, refs: dropped };
}

/**
 * Refs a scene now both tells (reveals or implies) and withholds, which
 * cancel out; only those the edit made are listed.
 */
function crossedLinks(before: Story, after: Story): EditReport["crossedLinks"] {
  const crossed = (story: Story) =>
    story.scenes.flatMap((scene) =>
      (["reveals", "implies"] as const).flatMap((how) =>
        scene[how]
          .map(formatRef)
          .filter((ref) => scene.withholds.map(formatRef).includes(ref))
          .map((ref) => ({ scene: scene.id, how, ref })),
      ),
    );
  const key = (c: { scene: string; how: string; ref: string }) =>
    JSON.stringify([c.scene, c.how, c.ref]);
  const old = new Set(crossed(before).map(key));
  return crossed(after).filter((c) => !old.has(key(c)));
}

/**
 * Cause, count, knowledge and membership contradictions in `after` that
 * weren't in `before`.
 */
function addedProblems(
  before: Story,
  after: Story,
): { source: AddedSource; message: string }[] {
  type Found = { source: AddedSource; key: string; message: string };
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
        : c.source === "count" ||
            c.source === "knowledge" ||
            c.source === "membership"
          ? [{ source: c.source, key: c.message, message: c.message }]
          : [],
    );
  const old = new Set(found(before).map(({ key }) => key));
  return found(after)
    .filter(({ key }) => !old.has(key))
    .map(({ source, message }) => ({ source, message }));
}

/** Text that may still state what an edit changed. */
export type StaleText =
  /**
   * The suspects with a reason in their text, likeliest first, none left
   * out; `traced` is how many `trace` would list in all.
   */
  | { kind: "suspects"; ref: Ref; suspects: Suspect[]; traced: number }
  /**
   * A count value added between two others: the next value's note states
   * the change from the value before, which now runs from the added one.
   */
  | {
      kind: "countNote";
      count: string;
      at: string;
      value: number;
      next: { at: string; note: string };
      stated: string;
      was: number;
      from: { at: string; value: number };
      now: number;
    };

/**
 * What may still state what the edit changed: suspects with a reason in
 * their text, leaving out what the batch has in hand.
 */
export function staleText(
  before: Story,
  after: Story,
  command: StoryCommand,
  prose: readonly Prose[],
  batch: EditBatch = NO_BATCH,
): StaleText | null {
  const ref = changedRef(before, after, command);
  // Nothing can state where an event was before it had a place.
  const firstPlacement =
    command.type === "setPosition" &&
    !before.timeline.positions.some(
      (p) => p.event === command.event && p.frame === WORLD_FRAME,
    );
  if (command.type === "setCount") {
    // Nor what a count was at an event before it had a value there.
    const firstValue = !before.counts.some(
      (c) => c.id === command.id && c.values.some((v) => v.at === command.at),
    );
    if (firstValue) {
      // A value added between two others: the next one's note may count
      // the change from the value before it.
      const across = noteCountingAcross(after, command.id, command.at);
      return across === undefined || command.value === null
        ? null
        : {
            kind: "countNote",
            count: command.id,
            at: command.at,
            value: command.value,
            next: { at: across.next.at, note: across.next.note },
            stated: across.stated,
            was: across.was,
            from: { at: across.from.at, value: across.from.value },
            now: across.now,
          };
    }
  }
  if (ref === undefined || firstPlacement) return null;
  const was = countWas(before, after, command);
  if (was === undefined) return null;
  const all = traceDependents(after, ref, { was, prose }).unwrapOr([]);
  // The scene being written, record and prose, is what the writer has in
  // hand, and a record this batch added was written with the change known.
  // So, likely, was one an earlier edit in it rewrote with words of the
  // changed record's new text, when shared words are all that suspect it;
  // one rewritten for another reason can still state the old version
  // (finding worldcrafter-gu8c).
  const newWords = contentStems(recordText(after, ref));
  const rewrittenToMatch = (target: Ref, reasons: readonly string[]) =>
    [...(batch.rewritten.get(formatRef(target)) ?? [])].some((s) =>
      newWords.has(s),
    ) && !reasons.some((r) => /"[^"]*" /.test(r));
  const found = all.filter(
    ({ inText, target, reasons }) =>
      inText &&
      !(target.kind === "record"
        ? batch.writing.has(formatRef(target.ref)) ||
          batch.created.has(formatRef(target.ref)) ||
          rewrittenToMatch(target.ref, reasons)
        : batch.writing.has(formatRef({ kind: "scene", id: target.scene }))),
  );
  if (found.length === 0) return null;
  return { kind: "suspects", ref, suspects: found, traced: all.length };
}

/** The kinds of contradiction, besides timeline problems, an edit reports adding. */
export type AddedSource = "cause" | "count" | "knowledge" | "membership";

/** The links a scene-links set took off the list. */
export type DroppedLinks = {
  scene: string;
  how: SceneLinkKind;
  refs: string[];
};

/** What an edit did besides what it was told. Empty lists when nothing. */
export type EditReport = {
  /** Timeline problems it added, kept: their messages. */
  timelineProblems: string[];
  /** Other contradictions it added, kept. */
  contradictions: { source: AddedSource; message: string }[];
  /** Records that went with the one it removed, described. */
  alsoRemoved: string[];
  /** Links a scene-links set dropped, or null. */
  droppedLinks: DroppedLinks | null;
  /** A scene that now both tells and withholds a ref: one is probably meant. */
  crossedLinks: { scene: string; how: "reveals" | "implies"; ref: string }[];
  /** Text that may still state what it changed, or null. */
  stale: StaleText | null;
};

/**
 * What `command`, which turned `before` into `after`, did besides what it
 * was told. `problems` are the timeline problems `applyStoryCommand`
 * returned; `prose` is the scene prose to trace through.
 */
export function editReport(
  before: Story,
  after: Story,
  command: StoryCommand,
  {
    problems,
    prose,
    batch = NO_BATCH,
  }: {
    problems: readonly TimelineProblem[];
    prose: readonly Prose[];
    batch?: EditBatch;
  },
): EditReport {
  return {
    timelineProblems: newTimelineMessages(before, after, problems),
    contradictions: addedProblems(before, after),
    alsoRemoved: alsoRemoved(before, after, command),
    droppedLinks: droppedLinks(before, after, command),
    crossedLinks: crossedLinks(before, after),
    stale: staleText(before, after, command, prose, batch),
  };
}

const ADDED_HEADS: Record<AddedSource, string> = {
  cause: "Cause",
  count: "Count",
  knowledge: "Knowledge",
  membership: "Membership",
};

/**
 * The lines the CLI prints after an edit. `maxSuspects` cuts the stale text
 * to its top suspects, pointing at `trace` for the rest; `linkName` and
 * `droppedHint` say scene links and how to keep a list the CLI's way.
 */
export function editReportLines(
  after: Story,
  report: EditReport,
  {
    source,
    maxSuspects = Number.POSITIVE_INFINITY,
    linkName = (how) => how,
    droppedHint = "",
  }: {
    source: Pick<ProseSource, "locate">;
    maxSuspects?: number;
    linkName?: (how: SceneLinkKind) => string;
    droppedHint?: string;
  },
): string[] {
  const { droppedLinks: dropped, stale } = report;
  return [
    ...report.timelineProblems.map(
      (message) => `Timeline problem (kept; see contradictions): ${message}`,
    ),
    ...report.contradictions.map(
      ({ source: from, message }) =>
        `${ADDED_HEADS[from]} problem (kept; see contradictions): ${message}`,
    ),
    ...(report.alsoRemoved.length === 0
      ? []
      : [`Also removed: ${report.alsoRemoved.join(", ")}`]),
    ...(dropped === null
      ? []
      : [
          `Dropped from ${dropped.scene} ${linkName(dropped.how)}: ${dropped.refs.join(", ")}${droppedHint === "" ? "" : ` ${droppedHint}`}`,
        ]),
    ...report.crossedLinks.map(
      ({ scene, how, ref }) =>
        `Note: scene ${scene} now both ${how} and withholds ${ref}; one of the two is probably meant.`,
    ),
    ...staleLines(after, stale, source, maxSuspects),
  ];
}

function staleLines(
  after: Story,
  stale: StaleText | null,
  source: Pick<ProseSource, "locate">,
  maxSuspects: number,
): string[] {
  if (stale === null) return [];
  if (stale.kind === "countNote") {
    const count = formatRef({ kind: "count", id: stale.count });
    return [
      `What may still state the old ${count}, likeliest first (nothing was rewritten):`,
      `- ${count} note at ${stale.next.at} "${excerpt(stale.next.note)}": "${stale.stated}" states the change of ${stale.was} from ${stale.from.value} at ${stale.from.at}; from the new ${stale.value} at ${stale.at} it is ${stale.now}`,
    ];
  }
  const shown = stale.suspects.slice(0, maxSuspects);
  const more = stale.traced - shown.length;
  return [
    `What may still state the old ${formatRef(stale.ref)}, likeliest first (nothing was rewritten):`,
    ...suspectLines(after, source, shown),
    ...(more === 0
      ? []
      : [`...run trace ${formatRef(stale.ref)} for all ${stale.traced}.`]),
  ];
}
