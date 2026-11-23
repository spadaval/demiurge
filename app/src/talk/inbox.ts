/**
 * The World inbox: everything waiting on the writer. Open topics a model
 * started, newest first, then the contradictions the story keeps, in the
 * order `storyContradictions` lists them.
 */

import type { Contradiction } from "../story/contradictions";
import type { Topic } from "./records";

export type InboxItem =
  | { kind: "topic"; key: string; topic: Topic }
  | { kind: "contradiction"; key: string; contradiction: Contradiction };

/** An open topic the model raised. */
export const isRaised = (topic: Topic) =>
  topic.status === "open" && topic.startedBy.kind === "model";

export function worldInbox(
  topics: readonly Topic[],
  contradictions: readonly Contradiction[],
): InboxItem[] {
  return [
    ...topics
      .filter(isRaised)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((topic): InboxItem => ({ kind: "topic", key: topic.id, topic })),
    ...contradictions.map(
      (contradiction, i): InboxItem => ({
        kind: "contradiction",
        key: `contradiction-${i}`,
        contradiction,
      }),
    ),
  ];
}

/** A contradiction's kind as the inbox labels it. */
export function contradictionKind(contradiction: Contradiction): string {
  switch (contradiction.source) {
    case "timeline":
      return "Timeline";
    case "openQuestion":
      return "Noted conflict";
    case "cause":
      return contradiction.kind === "cycle"
        ? "Circle of causes"
        : "Cause after effect";
    case "knowledge":
      return "Knowledge";
    case "membership":
      return "Membership";
    case "count":
      return "Count";
  }
}
