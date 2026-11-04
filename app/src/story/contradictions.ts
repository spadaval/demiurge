/**
 * Where a story pulls against itself. Contradictions are material, not
 * errors (docs/rebuild/story-model.md, Fluidity): commands keep them, and
 * this lists them so they can be worked on.
 */

import { compileChronology, type TimelineProblem } from "../time/chronology";
import { timelineProblems } from "../time/commands";
import { isAnswered, type Ref, type Story } from "./story";

export type Contradiction =
  | { source: "timeline"; problem: TimelineProblem; message: string }
  /** An unanswered open question marked as a conflict. */
  | { source: "openQuestion"; ref: Ref; message: string };

/** The timeline's problems, then the open conflicts. */
export function storyContradictions(story: Story): Contradiction[] {
  // Story scenes aren't in the timeline, as in `applyStoryCommand`.
  const timeline = timelineProblems(compileChronology(story.timeline, [])).map(
    (problem): Contradiction => ({
      source: "timeline",
      problem,
      message: problem.message,
    }),
  );
  const conflicts = story.openQuestions
    .filter((q) => q.conflict && !isAnswered(q))
    .map(
      (q): Contradiction => ({
        source: "openQuestion",
        ref: { kind: "openQuestion", id: q.id },
        message: `Not settled yet: ${q.question}`,
      }),
    );
  return [...timeline, ...conflicts];
}
