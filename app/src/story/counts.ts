/**
 * Counts: numbers that change at events, such as the hands left aboard a
 * ship. A value holds from its event until the next value in story
 * order (`eventsInStoryOrder`), so a count reads as a running series.
 *
 * Only two rules are checked, since anything subtler is the writer's to
 * judge:
 * - a value is never above the total in effect at its event (a fixed
 *   `total`, or the latest value of the count it is `of` at or before it);
 * - a count declared to rise never falls, and one declared to fall never
 *   rises, between two values whose events story time orders.
 */

import { compareEvents, compileChronology } from "../time/chronology";
import type { EventId } from "../time/timeline";
import { eventsInStoryOrder } from "./order";
import type { Count, Story } from "./story";

/** One value of a count, with the total and threshold in effect then. */
export type CountStep = {
  at: EventId;
  value: number;
  note: string;
  total?: number;
  /** The value that matters, worked out from "more than half" if need be. */
  threshold?: number;
};

/** Where each event falls in story order, for sorting values. */
function storyIndex(story: Story): (event: EventId) => number {
  const index = new Map(eventsInStoryOrder(story).map((e, i) => [e.id, i]));
  return (event) => index.get(event) ?? Number.POSITIVE_INFINITY;
}

/** The count's values in story order. */
function ordered(count: Count, at: (e: EventId) => number) {
  return [...count.values].sort((a, b) => at(a.at) - at(b.at));
}

/** The smallest whole number above half of `total`. */
export const moreThanHalf = (total: number) => Math.floor(total / 2) + 1;

/** The count's values in story order, each with its total and threshold. */
export function countSeries(story: Story, count: Count): CountStep[] {
  const at = storyIndex(story);
  const of = story.counts.find((c) => c.id === count.of);
  const totals = of === undefined ? [] : ordered(of, at);
  return ordered(count, at).map(({ at: event, value, note }) => {
    const total =
      count.total ?? totals.filter((t) => at(t.at) <= at(event)).at(-1)?.value;
    // More than half of nothing (a total of zero) is no threshold.
    const threshold =
      count.threshold === "more_than_half"
        ? total === undefined || total <= 0
          ? undefined
          : moreThanHalf(total)
        : count.threshold;
    return {
      at: event,
      value,
      note,
      ...(total === undefined ? {} : { total }),
      ...(threshold === undefined ? {} : { threshold }),
    };
  });
}

/** The threshold as said: `more than half (497)` or `50`. */
const thresholdText = (count: Count, threshold: number) =>
  count.threshold === "more_than_half"
    ? `more than half (${threshold})`
    : `${threshold}`;

/** Whether a step is at or past its threshold, if it has one. */
const reaches = (step: CountStep) =>
  step.threshold === undefined ? undefined : step.value >= step.threshold;

/**
 * `488 of 992, 9 short of more than half (497)`: a step's value, with its
 * total and how it stands against the threshold. With `standing` false, the
 * threshold is left out.
 */
export function stepText(
  count: Count,
  step: CountStep,
  standing = true,
): string {
  const of = step.total === undefined ? "" : ` of ${step.total}`;
  if (step.threshold === undefined || !standing) return `${step.value}${of}`;
  const mark = thresholdText(count, step.threshold);
  const short = step.threshold - step.value;
  return short > 0
    ? `${step.value}${of}, ${short} short of ${mark}`
    : `${step.value}${of}, reaching ${mark}`;
}

/**
 * Each step's text in a series, saying how it stands against the threshold
 * only where that changes (it first reaches it, falls back below it, or
 * the threshold itself moves), so a long series doesn't repeat it.
 */
export function seriesTexts(count: Count, series: CountStep[]): string[] {
  return series.map((step, i) => {
    const prev = series[i - 1];
    const changed =
      prev === undefined ||
      prev.threshold !== step.threshold ||
      reaches(prev) !== reaches(step);
    return stepText(count, step, changed);
  });
}

/**
 * The steps below their threshold, to list once beside the series, when
 * the series has some at or past it too (a dip that matters); none when
 * every step is on one side.
 */
export function belowThreshold(series: CountStep[]): CountStep[] {
  const below = series.filter((step) => reaches(step) === false);
  return series.some((step) => reaches(step) === true) ? below : [];
}

/**
 * The step in effect at `event`: the last whose event comes at or before it
 * in story order.
 */
export function stepAt(
  story: Story,
  series: CountStep[],
  event: EventId,
): CountStep | undefined {
  const at = storyIndex(story);
  return series.filter((step) => at(step.at) <= at(event)).at(-1);
}

export type CountProblem = { count: string; at: EventId; message: string };

/** Values above their total, and declared directions broken; see the top. */
export function countProblems(story: Story): CountProblem[] {
  const chronology = compileChronology(story.timeline, []);
  const label = (id: string) =>
    story.timeline.events.find((e) => e.id === id)?.label ?? id;
  return story.counts.flatMap((count) => {
    const series = countSeries(story, count);
    const name = `"${count.label}"`;
    const above = series
      .filter((s) => s.total !== undefined && s.value > s.total)
      .map((s) => ({
        count: count.id,
        at: s.at,
        message: `${name} is ${s.value} at "${label(s.at)}", above its total of ${s.total}.`,
      }));
    const wrongWay = series.flatMap((s, i) => {
      const prev = series[i - 1];
      if (prev === undefined || count.direction === undefined) return [];
      const fell = s.value < prev.value;
      const rose = s.value > prev.value;
      const broken = count.direction === "rises" ? fell : rose;
      if (!broken || compareEvents(chronology, prev.at, s.at) !== "before") {
        return [];
      }
      return [
        {
          count: count.id,
          at: s.at,
          message: `${name} ${fell ? "falls" : "rises"} from ${prev.value} at "${label(prev.at)}" to ${s.value} at "${label(s.at)}", though it only ${count.direction === "rises" ? "rises" : "falls"}.`,
        },
      ];
    });
    return [...above, ...wrongWay];
  });
}
