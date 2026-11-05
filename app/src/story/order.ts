/**
 * The order of events in story time, as the bible prints them and as a
 * count's values follow each other.
 */

import { compareEvents, compileChronology } from "../time/chronology";
import type { TimeEvent } from "../time/timeline";
import type { Story } from "./story";

/** As render names a blank label, so blank labels sort the same. */
const named = (label: string) => (label.trim() === "" ? "(unnamed)" : label);

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
