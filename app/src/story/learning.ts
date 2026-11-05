/**
 * The order the reader learns things in, set beside the order they happen.
 * The telling order is the scenes' order and what each shows, reveals,
 * implies or withholds; the true order is story time. A scene that reveals a
 * version of an event, or someone's knowledge of it, tells the reader about
 * the event too, though perhaps not the truth of it.
 */

import type { TimeEvent } from "../time/timeline";
import { eventsInStoryOrder } from "./order";
import {
  type Knowledge,
  type Ref,
  SCENE_LINK_KINDS,
  SCENE_LINK_WORDS,
  type Scene,
  type SceneLinkKind,
  type Story,
} from "./story";

/** How a scene puts something before the reader: depicting it, or a link. */
export type TellingHow = "shows" | SceneLinkKind;

export type Told = { how: TellingHow; ref: Ref };

/** One scene in telling order, with what it puts before the reader. */
export type TellingStep = { scene: Scene; index: number; told: Told[] };

/** Each scene in telling order, with what it shows, reveals, implies or withholds. */
export function tellingOrder(story: Story): TellingStep[] {
  return story.scenes.map((scene, index) => ({
    scene,
    index,
    told: [
      ...scene.depicts.map(
        (id): Told => ({
          how: "shows",
          ref: { kind: "event", id },
        }),
      ),
      ...SCENE_LINK_KINDS.flatMap((how) =>
        scene[how].map((ref): Told => ({ how, ref })),
      ),
    ],
  }));
}

/** The first scene that tells the reader of something, and how. */
export type FirstTold = {
  scene: Scene;
  index: number;
  how: TellingHow;
  /** The record the scene names: the event itself, a version or knowledge. */
  via: Ref;
};

/**
 * An event in story order, where the reader first learns of it, and the
 * knowledge that starts then with where the reader first learns that.
 */
export type TrueStep = {
  event: TimeEvent;
  /** Absent if no scene shows, reveals or implies it. */
  first?: FirstTold;
  knowledgeFrom: { knowledge: Knowledge; first?: FirstTold }[];
};

/** Planting a thing or paying it off puts it before the reader too. */
const LEARNING: readonly TellingHow[] = [
  "shows",
  "reveals",
  "implies",
  "plants",
  "paysOff",
];

/** `shows`, `reveals`, `pays off`. */
export const tellingWords = (how: TellingHow): string =>
  how === "shows" ? "shows" : SCENE_LINK_WORDS[how];

const sameRef = (a: Ref, b: Ref) =>
  a.kind === b.kind &&
  a.id === b.id &&
  (a.kind !== "candidate" ||
    (b.kind === "candidate" && a.questionId === b.questionId));

/** The first scene that shows, reveals or implies any of `refs`. */
function firstTold(story: Story, refs: readonly Ref[]): FirstTold | undefined {
  for (const step of tellingOrder(story)) {
    const told = step.told.find(
      ({ how, ref }) =>
        LEARNING.includes(how) && refs.some((r) => sameRef(r, ref)),
    );
    if (told !== undefined) {
      return {
        scene: step.scene,
        index: step.index,
        how: told.how,
        via: told.ref,
      };
    }
  }
  return undefined;
}

/** What tells the reader of an event: itself, its versions, and knowledge of either. */
function aboutEvent(story: Story, id: string): Ref[] {
  const direct: Ref[] = [
    { kind: "event", id },
    ...story.versions
      .filter((v) => v.event === id)
      .map((v): Ref => ({ kind: "version", id: v.id })),
  ];
  return [
    ...direct,
    ...story.knowledge
      .filter((k) => direct.some((ref) => sameRef(ref, k.what)))
      .map((k): Ref => ({ kind: "knowledge", id: k.id })),
  ];
}

/** Events in story order, each with where the reader first learns of it. */
export function trueOrder(story: Story): TrueStep[] {
  return eventsInStoryOrder(story).map((event) => {
    const first = firstTold(story, aboutEvent(story, event.id));
    return {
      event,
      ...(first === undefined ? {} : { first }),
      knowledgeFrom: story.knowledge
        .filter((k) => k.since === event.id)
        .map((knowledge) => {
          const told = firstTold(story, [
            { kind: "knowledge", id: knowledge.id },
          ]);
          return { knowledge, ...(told === undefined ? {} : { first: told }) };
        }),
    };
  });
}

/** Knowledge with no `since`, held from the start, with where the reader learns it. */
export function knowledgeAlways(
  story: Story,
): { knowledge: Knowledge; first?: FirstTold }[] {
  return story.knowledge
    .filter((k) => k.since === undefined)
    .map((knowledge) => {
      const told = firstTold(story, [{ kind: "knowledge", id: knowledge.id }]);
      return { knowledge, ...(told === undefined ? {} : { first: told }) };
    });
}

/** A record the reader has been told before a scene, and where first. */
export type ToldSoFar = { ref: Ref; how: TellingHow; index: number };

/**
 * What the scenes before the one at `index`, in telling order, have put
 * before the reader: each record once, with the first scene that showed,
 * revealed, implied, planted or paid it off. `withheld` is what those scenes
 * held back and none of them has told yet.
 */
export function toldBefore(
  story: Story,
  index: number,
): { told: ToldSoFar[]; withheld: Ref[] } {
  const told: ToldSoFar[] = [];
  const withheld: Ref[] = [];
  const seen = (list: readonly { ref: Ref }[], ref: Ref) =>
    list.some((x) => sameRef(x.ref, ref));
  for (const step of tellingOrder(story).slice(0, Math.max(0, index))) {
    for (const { how, ref } of step.told) {
      if (LEARNING.includes(how)) {
        if (!seen(told, ref)) told.push({ ref, how, index: step.index });
      } else if (!withheld.some((r) => sameRef(r, ref))) {
        withheld.push(ref);
      }
    }
  }
  return {
    told,
    withheld: withheld.filter((ref) => !seen(told, ref)),
  };
}
