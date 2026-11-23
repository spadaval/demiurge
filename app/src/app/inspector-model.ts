/**
 * The World inspector's reading of the story bible (DESIGN.md, World
 * Inspector): where the World tab is, the rail's counts, each ledger's rows
 * and a record's touches split into what it names and what names it. Pure
 * functions of a `Story`; `./inspector.tsx` sets them.
 */

import type { Contradiction } from "~/story/contradictions";
import { eventsInStoryOrder } from "~/story/order";
import { formatRef, parseRef } from "~/story/refs";
import {
  type OpenQuestion,
  questionState,
  type Ref,
  refExists,
  type Scene,
  type Story,
} from "~/story/story";
import { TOUCH_KINDS, type Touch, whatThisTouches } from "~/story/touches";
import type { Position, TimeEvent } from "~/time/timeline";
import { WORLD_FRAME } from "~/time/timeline";

export const INSPECTOR_VIEWS = [
  { id: "cast", title: "Cast & Drives" },
  { id: "questions", title: "Open Questions" },
  { id: "timeline", title: "Timeline & Counts" },
  { id: "reader-order", title: "Reader-Order" },
  { id: "contradictions", title: "Contradictions" },
] as const;

export type InspectorView = (typeof INSPECTOR_VIEWS)[number]["id"];

/** What the World tab shows: a view, a record, or something it can't read. */
export type InspectorAt =
  | { readonly kind: "view"; readonly view: InspectorView }
  | { readonly kind: "record"; readonly ref: Ref }
  | { readonly kind: "unknown"; readonly text: string };

const isView = (text: string): text is InspectorView =>
  INSPECTOR_VIEWS.some(({ id }) => id === text);

/** The World tab's place, from the URL's `at`: a view's ID or a ref. */
export function parseAt(text: string | undefined): InspectorAt {
  if (text === undefined || text === "") return { kind: "view", view: "cast" };
  if (isView(text)) return { kind: "view", view: text };
  const ref = parseRef(text);
  return ref.isOk()
    ? { kind: "record", ref: ref.value }
    : { kind: "unknown", text };
}

export const atText = (at: InspectorAt): string =>
  at.kind === "view"
    ? at.view
    : at.kind === "record"
      ? formatRef(at.ref)
      : at.text;

export const viewTitle = (view: InspectorView): string =>
  INSPECTOR_VIEWS.find(({ id }) => id === view)?.title ?? view;

// ── Time ─────────────────────────────────────────────────────────────────

export const worldPosition = (
  story: Story,
  event: string,
): Position | undefined =>
  story.timeline.positions.find(
    (p) => p.event === event && p.frame === WORLD_FRAME,
  );

/**
 * The scene's place on the world clock: the latest event it depicts that
 * has one, as `sceneNow` takes a scene's now.
 */
export function scenePosition(
  story: Story,
  scene: Scene,
): Position | undefined {
  return scene.depicts
    .flatMap((event) => worldPosition(story, event) ?? [])
    .sort((a, b) => b.start - a.start)[0];
}

/** The whole unit a position starts in: the year, in a year-based story. */
export const positionYear = (position: Position): number =>
  Math.floor(position.start);

// ── Rail ─────────────────────────────────────────────────────────────────

/**
 * The rail's count beside each view: actors, undecided questions, events
 * placed on the world clock, scenes, and contradictions kept.
 */
export function inspectorCounts(
  story: Story,
  contradictions: readonly Contradiction[],
): Record<InspectorView, number> {
  return {
    cast: story.actors.length,
    questions: story.openQuestions.filter(
      (q) => questionState(story, q).state === "undecided",
    ).length,
    timeline: story.timeline.events.filter(
      (e) => worldPosition(story, e.id) !== undefined,
    ).length,
    "reader-order": story.scenes.length,
    contradictions: contradictions.length,
  };
}

// ── Open questions ───────────────────────────────────────────────────────

/** A question's status as the ledger states it. */
export function questionStatus(
  story: Story,
  question: OpenQuestion,
): "open" | "answered" | "left open" {
  const state = questionState(story, question).state;
  return state === "undecided"
    ? "open"
    : state === "left_open"
      ? "left open"
      : "answered";
}

/**
 * How many records `ref` names: the length of its detail's Touches list. A
 * candidate's own question is where it lives, not part of its reach.
 */
export function reach(story: Story, ref: Ref): number {
  const touches = recordTouches(story, ref);
  if (touches === undefined) return 0;
  return touches.touches
    .filter(
      ({ kind }) => !(ref.kind === "candidate" && kind === "openQuestion"),
    )
    .reduce((n, group) => n + group.touches.length, 0);
}

// ── Timeline ─────────────────────────────────────────────────────────────

export type EventRow = {
  readonly event: TimeEvent;
  readonly position: Position | undefined;
  readonly depictedBy: readonly Scene[];
  readonly causes: readonly string[];
  readonly contradictions: number;
};

/**
 * Events in story order, placed ones first: an event with no place on the
 * world clock still has a place in story order, but the ledger groups it
 * last, under "Not placed in time".
 */
export function eventRows(
  story: Story,
  contradictions: readonly Contradiction[],
): { placed: EventRow[]; unplaced: EventRow[] } {
  const rows = eventsInStoryOrder(story).map(
    (event): EventRow => ({
      event,
      position: worldPosition(story, event.id),
      depictedBy: story.scenes.filter((s) => s.depicts.includes(event.id)),
      causes: story.causes
        .filter((c) => c.effect === event.id && c.cause !== event.id)
        .map((c) => c.cause),
      contradictions: contradictions.filter((c) =>
        contradictionRefs(story, c).some(
          (ref) => ref.kind === "event" && ref.id === event.id,
        ),
      ).length,
    }),
  );
  return {
    placed: rows.filter((row) => row.position !== undefined),
    unplaced: rows.filter((row) => row.position === undefined),
  };
}

// ── Reader-order ─────────────────────────────────────────────────────────

export type SceneRowData = {
  readonly scene: Scene;
  /** From 1, in telling order. */
  readonly position: number;
  readonly time: Position | undefined;
  /** Earlier on the world clock than the last placed scene before it. */
  readonly flashback: boolean;
};

export function sceneRows(story: Story): SceneRowData[] {
  let previous: Position | undefined;
  return story.scenes.map((scene, index) => {
    const time = scenePosition(story, scene);
    const flashback =
      time !== undefined &&
      previous !== undefined &&
      time.end <= previous.start;
    if (time !== undefined) previous = time;
    return { scene, position: index + 1, time, flashback };
  });
}

export type ReaderQuestionRow = {
  readonly id: string;
  readonly question: string;
  /** Telling positions, from 1; undefined where the story doesn't say. */
  readonly opens: number | undefined;
  readonly answered: number | undefined;
};

export function readerQuestionRows(story: Story): ReaderQuestionRow[] {
  const at = (scene: string | undefined) => {
    if (scene === undefined) return undefined;
    const index = story.scenes.findIndex((s) => s.id === scene);
    return index === -1 ? undefined : index + 1;
  };
  return story.readerQuestions.map((q) => ({
    id: q.id,
    question: q.question,
    opens: at(q.opensAt),
    answered: at(q.answeredAt),
  }));
}

/** A question answered in an earlier scene than the one that opens it. */
export const breaksOrder = (row: ReaderQuestionRow): boolean =>
  row.opens !== undefined &&
  row.answered !== undefined &&
  row.answered < row.opens;

// ── Contradictions ───────────────────────────────────────────────────────

/** The contradiction's kind, as the ledger's Label names it. */
export function contradictionKind(c: Contradiction): string {
  switch (c.source) {
    case "timeline":
      switch (c.problem.kind) {
        case "contradiction":
          return "Circle in time";
        case "unknown_event":
          return "Missing event";
        case "unknown_frame":
          return "Missing clock";
        case "inconsistent_frame":
          return "Clocks disagree";
        case "inconsistent_duration":
          return "Duration disagrees";
      }
      return "Timeline";
    case "cause":
      return c.kind === "effect_first"
        ? "Cause after effect"
        : "Circle of causes";
    case "openQuestion":
      return "Noted conflict";
    case "knowledge":
      return "Knowledge ends before it starts";
    case "membership":
      return "Membership ends before it starts";
    case "count":
      return "Count";
  }
}

/** The records a contradiction is about, those that exist, without repeats. */
export function contradictionRefs(story: Story, c: Contradiction): Ref[] {
  const events = (ids: readonly string[]): Ref[] =>
    ids.map((id) => ({ kind: "event", id }));
  const refs = ((): Ref[] => {
    switch (c.source) {
      case "timeline":
        switch (c.problem.kind) {
          case "contradiction":
          case "inconsistent_frame":
          case "inconsistent_duration":
            return events(c.problem.events);
          case "unknown_event":
            return events([c.problem.event]);
          case "unknown_frame":
            return [];
        }
        return [];
      case "cause":
        return c.kind === "effect_first"
          ? events([c.cause, c.effect])
          : events(c.events);
      case "openQuestion":
      case "knowledge":
        return [c.ref];
      case "membership": {
        const m = story.memberships.find((x) => x.id === c.id);
        return m === undefined
          ? []
          : [
              { kind: "actor", id: m.member },
              { kind: "actor", id: m.group },
              ...events([m.since, m.until].flatMap((e) => e ?? [])),
            ];
      }
      case "count":
        return [c.ref, ...events([c.at])];
    }
  })();
  const seen = new Set<string>();
  return refs.filter((ref) => {
    if (!refExists(story, ref)) return false;
    const text = formatRef(ref);
    if (seen.has(text)) return false;
    seen.add(text);
    return true;
  });
}

// ── Record touches ───────────────────────────────────────────────────────

/**
 * The records `ref`'s own record names, and the records that belong to it
 * and name others: a cause names its effect from the cause's side, a
 * participant from its event's, a membership from its member's, a count's
 * values from the count's. Dangling refs are kept; the touches drop them.
 */
export function outgoingRefs(story: Story, ref: Ref): Ref[] {
  const { id } = ref;
  const actor = (x: string): Ref => ({ kind: "actor", id: x });
  const event = (x: string): Ref => ({ kind: "event", id: x });
  const drive = (x: string): Ref => ({ kind: "drive", id: x });
  const scene = (x: string): Ref => ({ kind: "scene", id: x });
  switch (ref.kind) {
    case "actor":
      return story.memberships
        .filter((m) => m.member === id)
        .map((m) => actor(m.group));
    case "drive": {
      const d = story.drives.find((x) => x.id === id);
      if (d === undefined) return [];
      return [
        ...(d.actorId === null ? [] : [actor(d.actorId)]),
        ...d.origins.map(event),
        ...d.relations.map((r) => drive(r.to)),
        ...d.turns.flatMap((t) => [
          ...(t.at === undefined ? [] : [event(t.at)]),
          ...(t.into === undefined ? [] : [drive(t.into)]),
        ]),
      ];
    }
    case "event":
      return [
        ...story.causes
          .filter((c) => c.cause === id)
          .map((c) => event(c.effect)),
        ...story.participants.filter((p) => p.event === id).map((p) => p.who),
        ...story.timeline.constraints
          .filter((c) => c.a === id)
          .map((c) => event(c.b)),
      ];
    case "scene": {
      const s = story.scenes.find((x) => x.id === id);
      if (s === undefined) return [];
      return [
        ...s.actors.map(actor),
        ...(s.viewpoint === undefined ? [] : [actor(s.viewpoint)]),
        ...s.depicts.map(event),
        ...s.pressures.map(drive),
        ...s.reveals,
        ...s.implies,
        ...s.withholds,
        ...s.plants,
        ...s.paysOff,
      ];
    }
    case "fact":
      return story.facts.find((f) => f.id === id)?.about ?? [];
    case "readerQuestion": {
      const q = story.readerQuestions.find((x) => x.id === id);
      return [q?.opensAt, q?.answeredAt].flatMap((s) =>
        s === undefined ? [] : [scene(s)],
      );
    }
    case "openQuestion": {
      const q = story.openQuestions.find((x) => x.id === id);
      if (q === undefined) return [];
      return [
        ...q.about,
        ...q.candidates.map(
          (c): Ref => ({ kind: "candidate", questionId: id, id: c.id }),
        ),
      ];
    }
    case "candidate": {
      const c = story.openQuestions
        .find((q) => q.id === ref.questionId)
        ?.candidates.find((x) => x.id === id);
      return [
        { kind: "openQuestion", id: ref.questionId },
        ...(c?.touches ?? []),
      ];
    }
    case "version": {
      const v = story.versions.find((x) => x.id === id);
      return v === undefined ? [] : [event(v.event), ...v.by.map(actor)];
    }
    case "knowledge": {
      const k = story.knowledge.find((x) => x.id === id);
      if (k === undefined) return [];
      return [
        actor(k.actor),
        k.what,
        ...[k.since, k.until].flatMap((e) =>
          e === undefined ? [] : [event(e)],
        ),
      ];
    }
    case "object":
      return [];
    case "count": {
      const c = story.counts.find((x) => x.id === id);
      if (c === undefined) return [];
      return [
        ...c.values.map((v) => event(v.at)),
        ...(c.of === undefined ? [] : [{ kind: "count", id: c.of } as Ref]),
      ];
    }
  }
}

const sameRef = (a: Ref, b: Ref) => formatRef(a) === formatRef(b);

export type TouchList = { kind: Ref["kind"]; touches: Touch[] }[];

export type RecordTouches = {
  /** What the record names: outgoing. */
  readonly touches: TouchList;
  /** What names the record, or links to it through a record of its own. */
  readonly touchedBy: TouchList;
};

/**
 * The record's direct touches (`whatThisTouches`), split by direction. A
 * touch is outgoing when the record names it, and incoming when the other
 * record names this one or the link is held by neither (a membership that
 * starts at an event, say). A link both ways is in both lists. Undefined
 * for a record that doesn't exist.
 */
export function recordTouches(
  story: Story,
  ref: Ref,
): RecordTouches | undefined {
  const found = whatThisTouches(story, ref);
  if (found.isErr()) return undefined;
  const out = outgoingRefs(story, ref);
  const names = (from: Ref, to: Ref) =>
    outgoingRefs(story, from).some((r) => sameRef(r, to));
  const touches: TouchList = [];
  const touchedBy: TouchList = [];
  for (const kind of TOUCH_KINDS) {
    const all = found.value.direct[kind];
    const outgoing = all.filter((t) => out.some((r) => sameRef(r, t.ref)));
    const incoming = all.filter(
      (t) => !outgoing.includes(t) || names(t.ref, ref),
    );
    if (outgoing.length > 0) touches.push({ kind, touches: outgoing });
    if (incoming.length > 0) touchedBy.push({ kind, touches: incoming });
  }
  return { touches, touchedBy };
}
