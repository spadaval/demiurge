/**
 * Where a story pulls against itself. Contradictions are material, not
 * errors (docs/rebuild/story-model.md, Fluidity): commands keep them, and
 * this lists them so they can be worked on.
 */

import {
  type Chronology,
  compareEvents,
  compileChronology,
  type TimelineProblem,
} from "../time/chronology";
import { timelineProblems } from "../time/commands";
import type { EventId } from "../time/timeline";
import { describeYears } from "./calendar";
import { questionState, type Ref, type Story } from "./story";
import { refLabel } from "./touches";

export type Contradiction =
  | { source: "timeline"; problem: TimelineProblem; message: string }
  /** An unanswered open question marked as a conflict. */
  | { source: "openQuestion"; ref: Ref; message: string }
  /**
   * An effect that story time puts strictly before its cause. One at the
   * same time as its cause, or not ordered against it, isn't listed.
   */
  | {
      source: "cause";
      kind: "effect_first";
      cause: EventId;
      effect: EventId;
      message: string;
    }
  /** Events that are each other's causes, in a circle, sorted by ID. */
  | { source: "cause"; kind: "cycle"; events: EventId[]; message: string }
  /**
   * Knowledge whose `until` story time puts strictly before its `since`. Two
   * events not ordered against each other aren't listed.
   */
  | { source: "knowledge"; ref: Ref; message: string };

/**
 * A timeline problem's message, with a duration in a year-based story said
 * in units (`2 weeks give or take 84 hours`) rather than fractional years.
 */
export function timelineProblemMessage(
  story: Story,
  problem: TimelineProblem,
): string {
  if (
    problem.kind !== "inconsistent_duration" ||
    problem.unit !== "year" ||
    story.timeline.worldUnit !== "year"
  ) {
    return problem.message;
  }
  const { stated, between, referencedBy, events } = problem;
  const amount =
    stated.tolerance === 0
      ? `exactly ${describeYears(stated.amount)}`
      : `${describeYears(stated.amount)} give or take ${describeYears(stated.tolerance)}`;
  const range =
    between.min === between.max
      ? describeYears(between.min)
      : `${describeYears(between.min)} to ${describeYears(between.max)}`;
  return `${referencedBy} puts ${amount} between ${events.join(" and ")}, but their positions put ${range} between them`;
}

/**
 * The timeline's problems, then the causes', then knowledge that ends before
 * it starts, then the open conflicts.
 */
export function storyContradictions(story: Story): Contradiction[] {
  // Story scenes aren't in the timeline, as in `applyStoryCommand`.
  const chronology = compileChronology(story.timeline, []);
  const timeline = timelineProblems(chronology).map(
    (problem): Contradiction => ({
      source: "timeline",
      problem,
      message: timelineProblemMessage(story, problem),
    }),
  );
  const conflicts = story.openQuestions
    .filter(
      // One left open for the reader is a choice, not a problem.
      (q) => q.conflict && questionState(story, q).state === "undecided",
    )
    .map(
      (q): Contradiction => ({
        source: "openQuestion",
        ref: { kind: "openQuestion", id: q.id },
        message: `Not settled yet: ${q.question}`,
      }),
    );
  const label = (id: string) => `"${refLabel(story, { kind: "event", id })}"`;
  const knowledge = story.knowledge
    .filter(
      ({ since, until }) =>
        since !== undefined &&
        until !== undefined &&
        compareEvents(chronology, until, since) === "before",
    )
    .map(
      (k): Contradiction => ({
        source: "knowledge",
        ref: { kind: "knowledge", id: k.id },
        message: `"${refLabel(story, { kind: "knowledge", id: k.id })}" is held until ${label(k.until ?? "")}, which happens before ${label(k.since ?? "")}, when it starts.`,
      }),
    );
  return [
    ...timeline,
    ...causeContradictions(story, chronology),
    ...knowledge,
    ...conflicts,
  ];
}

function causeContradictions(
  story: Story,
  chronology: Chronology,
): Contradiction[] {
  const events = new Set(story.timeline.events.map(({ id }) => id));
  const causes = story.causes.filter(
    ({ cause, effect }) => events.has(cause) && events.has(effect),
  );
  const label = (id: string) => `"${refLabel(story, { kind: "event", id })}"`;
  const effectFirst = causes
    .filter(
      ({ cause, effect }) =>
        cause !== effect &&
        compareEvents(chronology, effect, cause) === "before",
    )
    .map(
      ({ cause, effect }): Contradiction => ({
        source: "cause",
        kind: "effect_first",
        cause,
        effect,
        message: `${label(effect)} happens before ${label(cause)}, which is recorded as its cause.`,
      }),
    );
  const cycles = causeCycles(causes).map(
    (cycle): Contradiction => ({
      source: "cause",
      kind: "cycle",
      events: cycle,
      message: `These events are recorded as causing each other, in a circle: ${cycle.map(label).join("; ")}.`,
    }),
  );
  return [...effectFirst, ...cycles];
}

/**
 * Each set of events joined in a circle by causes (a strongly connected
 * component, by Tarjan's algorithm), sorted by ID, in order of their first ID.
 */
function causeCycles(
  causes: readonly { cause: EventId; effect: EventId }[],
): EventId[][] {
  const next = new Map<EventId, EventId[]>();
  for (const { cause, effect } of causes) {
    next.set(cause, [...(next.get(cause) ?? []), effect]);
  }
  const index = new Map<EventId, number>();
  const low = new Map<EventId, number>();
  const stack: EventId[] = [];
  const onStack = new Set<EventId>();
  const cycles: EventId[][] = [];
  const visit = (event: EventId) => {
    index.set(event, index.size);
    low.set(event, index.get(event) ?? 0);
    stack.push(event);
    onStack.add(event);
    for (const to of next.get(event) ?? []) {
      if (!index.has(to)) {
        visit(to);
        low.set(event, Math.min(low.get(event) ?? 0, low.get(to) ?? 0));
      } else if (onStack.has(to)) {
        low.set(event, Math.min(low.get(event) ?? 0, index.get(to) ?? 0));
      }
    }
    if (low.get(event) !== index.get(event)) return;
    const component: EventId[] = [];
    let member: EventId | undefined;
    do {
      member = stack.pop();
      if (member === undefined) break;
      onStack.delete(member);
      component.push(member);
    } while (member !== event);
    const selfCause = (next.get(event) ?? []).includes(event);
    if (component.length > 1 || selfCause) cycles.push(component.sort());
  };
  for (const event of [...next.keys()].sort()) {
    if (!index.has(event)) visit(event);
  }
  return cycles.sort((a, b) => ((a[0] ?? "") < (b[0] ?? "") ? -1 : 1));
}
