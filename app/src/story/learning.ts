/**
 * The order the reader learns things in, set beside the order they happen.
 * The telling order is the scenes' order and what each shows, reveals,
 * implies or withholds; the true order is story time. A scene that reveals a
 * version of an event, or someone's knowledge of it, tells the reader about
 * the event too, though perhaps not the truth of it.
 */

import { type TimeEvent, WORLD_FRAME } from "../time/timeline";
import { eventsInStoryOrder } from "./order";
import {
  type Knowledge,
  type KnowledgeHow,
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

/** One way a scene told the reader of a record: `revealed in 24`. */
export type Telling = { how: TellingHow; index: number };

/**
 * A record the reader has been told before a scene: the first scene that
 * told it each way, in telling order (`planted in 10, revealed in 24`).
 */
export type ToldSoFar = { ref: Ref; tellings: Telling[] };

/**
 * What the scenes before the one at `index`, in telling order, have put
 * before the reader: each record once, with the first scene that showed,
 * revealed, implied, planted or paid it off, each way it was told.
 * `withheld` is what those scenes held back and none of them has told yet;
 * a question counts as told once a scene reveals its chosen answer, and the
 * chosen answer once a scene reveals the question.
 */
export function toldBefore(
  story: Story,
  index: number,
): { told: ToldSoFar[]; withheld: Ref[] } {
  const told: ToldSoFar[] = [];
  const withheld: Ref[] = [];
  for (const step of tellingOrder(story).slice(0, Math.max(0, index))) {
    for (const { how, ref } of step.told) {
      if (LEARNING.includes(how)) {
        const known = told.find((x) => sameRef(x.ref, ref));
        if (known === undefined) {
          told.push({ ref, tellings: [{ how, index: step.index }] });
        } else if (!known.tellings.some((t) => t.how === how)) {
          known.tellings.push({ how, index: step.index });
        }
      } else if (!withheld.some((r) => sameRef(r, ref))) {
        withheld.push(ref);
      }
    }
  }
  const revealed = (ref: Ref) =>
    told.some(
      (x) => sameRef(x.ref, ref) && x.tellings.some((t) => t.how === "reveals"),
    );
  const answerRevealed = (ref: Ref) => {
    const id = ref.kind === "candidate" ? ref.questionId : ref.id;
    const answer = story.openQuestions.find((q) => q.id === id)?.answer;
    if (answer === undefined) return false;
    const chosen: Ref = { kind: "candidate", questionId: id, id: answer };
    return ref.kind === "openQuestion"
      ? revealed(chosen)
      : ref.kind === "candidate" &&
          sameRef(ref, chosen) &&
          revealed({ kind: "openQuestion", id });
  };
  return {
    told,
    withheld: withheld.filter(
      (ref) => !told.some((x) => sameRef(x.ref, ref)) && !answerRevealed(ref),
    ),
  };
}

/**
 * The scene's now: the latest placed event it shows, by its start. Earlier
 * ones it shows are flashbacks.
 */
export function sceneNow(story: Story, scene: Scene): string | undefined {
  const start = (id: string) =>
    story.timeline.positions.find(
      (p) => p.event === id && p.frame === WORLD_FRAME,
    )?.start;
  return scene.depicts
    .filter((id) => start(id) !== undefined)
    .sort((a, b) => (start(b) ?? 0) - (start(a) ?? 0))[0];
}

/**
 * How the viewpoint actor stands to a record the reader has been told: they
 * don't hold it now but will (`later`), held it once (`ended`, by how they
 * last held it), or never do; `believes` are the versions of it, for an
 * event, they hold instead.
 */
export type ViewpointGap = {
  later: boolean;
  ended?: KnowledgeHow;
  believes: Ref[];
};

/**
 * Whether `actor` doesn't know `ref` at event `at`, in the scene at
 * `scene` in telling order. A record counts only when the story says who
 * knows it (someone holds knowledge of it or, for an event, of one of its
 * versions), so a story that tracks no knowledge of a thing marks nothing.
 *
 * The actor's own knowledge records of it decide, where there are any:
 * knowing and believing both count as holding it, from after the `since`
 * event until the `until` event, in story order. For an event, holding one
 * of its versions at `at` is such a record too: they don't know it, and
 * believe that instead. Without them, the actor
 * holds it from what the story shows them doing: an event from the time
 * they take part in it, and an object in it; a version they tell, from its
 * event; what a scene told through their eyes shows, reveals, pays off or
 * implies; and what a scene through other eyes reveals or pays off when
 * they are in it or take part in what it shows. A scene tells them from its now (its
 * latest event) on, the scene being written aside. With `at` undefined (a
 * scene that shows no placed event) time is left out: any knowledge of it
 * counts, and any such scene told before this one. Undefined when the actor holds it, or it isn't tracked.
 */
export function viewpointGap(
  story: Story,
  actor: string,
  ref: Ref,
  at: string | undefined,
  scene: number = story.scenes.length,
): ViewpointGap | undefined {
  if (ref.kind === "knowledge") {
    const own = story.knowledge.find((k) => k.id === ref.id);
    if (own?.actor === actor) return undefined;
  }
  const versions =
    ref.kind === "event"
      ? story.versions
          .filter((v) => v.event === ref.id)
          .map((v): Ref => ({ kind: "version", id: v.id }))
      : [];
  const tracked = story.knowledge.some(
    (k) =>
      sameRef(k.what, ref) ||
      versions.some((version) => sameRef(k.what, version)),
  );
  if (!tracked) return undefined;
  const index = new Map(eventsInStoryOrder(story).map((e, i) => [e.id, i]));
  const place = (id: string) => index.get(id) ?? Number.POSITIVE_INFINITY;
  const starts = (k: Knowledge) =>
    at === undefined || k.since === undefined || place(k.since) < place(at);
  const lasts = (k: Knowledge) =>
    at === undefined || k.until === undefined || place(k.until) > place(at);
  const holds = (k: Knowledge) => starts(k) && lasts(k);
  const theirs = story.knowledge.filter((k) => k.actor === actor);
  const of = theirs.filter((k) => sameRef(k.what, ref));
  const believes = versions.filter((version) =>
    theirs.some((k) => sameRef(k.what, version) && holds(k)),
  );
  if (of.length > 0) {
    if (of.some(holds)) return undefined;
    const ended = of.filter((k) => starts(k) && !lasts(k));
    return {
      later: of.some((k) => !starts(k)),
      ...(ended.length === 0
        ? {}
        : {
            ended: ended.some((k) => k.how === "knows") ? "knows" : "believes",
          }),
      believes,
    };
  }
  // Holding a version of the event instead is their own record about it
  // too: what they are shown doesn't override a recorded belief.
  if (believes.length > 0) return { later: false, believes };
  // Story-order places from which the actor holds it, by what they do or see.
  const from = shownFrom(story, actor, ref, scene, place, at);
  if (from.some((p) => at === undefined || p <= place(at))) return undefined;
  return { later: from.length > 0, believes };
}

/**
 * Where in story order `actor` comes to hold `ref` by what the story shows:
 * taking part, telling, or being told it in a scene they see or are in.
 * A scene's place is just after its now, so the scene at its own time
 * hasn't yet told it; with no time, a scene told before `scene` comes first.
 */
function shownFrom(
  story: Story,
  actor: string,
  ref: Ref,
  scene: number,
  place: (id: string) => number,
  at: string | undefined,
): number[] {
  const takesPart = (event: string) =>
    story.participants.some(
      (p) => p.event === event && p.who.kind === "actor" && p.who.id === actor,
    );
  const parts =
    ref.kind === "event"
      ? takesPart(ref.id)
        ? [place(ref.id)]
        : []
      : ref.kind === "object"
        ? story.participants
            .filter((p) => sameRef(p.who, ref) && takesPart(p.event))
            .map((p) => place(p.event))
        : [];
  const tells =
    ref.kind === "version"
      ? story.versions
          .filter((v) => v.id === ref.id && v.by.includes(actor))
          .map((v) => place(v.event))
      : [];
  // Paying something off brings it back before the people in the scene.
  const reveals = (s: Scene) =>
    s.reveals.some((r) => sameRef(r, ref)) ||
    s.paysOff.some((r) => sameRef(r, ref));
  const implies = (s: Scene) => s.implies.some((r) => sameRef(r, ref));
  const seen = story.scenes.flatMap((s, i) => {
    if (i === scene) return [];
    // Through their eyes: what the scene shows, reveals, pays off or
    // implies. In it or in what it shows, through other eyes: what it
    // reveals or pays off, but not
    // what it implies, which the reader may infer from the viewpoint's
    // own thoughts.
    const own = s.viewpoint === actor;
    const present =
      s.actors.includes(actor) || s.depicts.some((e) => takesPart(e));
    const shown = own
      ? (ref.kind === "event" && s.depicts.includes(ref.id)) ||
        reveals(s) ||
        implies(s)
      : present && reveals(s);
    if (!shown) return [];
    const now = sceneNow(story, s);
    if (at === undefined || now === undefined) {
      return i < scene ? [Number.NEGATIVE_INFINITY] : [];
    }
    return [place(now) + 0.5];
  });
  return [...parts, ...tells, ...seen];
}
