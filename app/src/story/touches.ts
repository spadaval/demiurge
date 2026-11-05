/**
 * What a record in a story is connected to, and what a candidate answer would
 * connect if it were taken (docs/rebuild/story-model.md, Fluidity). It
 * informs and never blocks: how much something touches is for people and
 * agents to weigh, so nothing here scores or ranks.
 *
 * References to records that don't exist are skipped.
 */

import { err, ok, type Result } from "neverthrow";
import {
  describeRef,
  type Ref,
  refExists,
  SCENE_LINK_KINDS,
  type Story,
} from "./story";

export type TouchKind = Ref["kind"];

/** The order groups are listed in. */
export const TOUCH_KINDS: readonly TouchKind[] = [
  "actor",
  "drive",
  "event",
  "scene",
  "fact",
  "readerQuestion",
  "openQuestion",
  "candidate",
  "version",
  "knowledge",
];

/** A record reached, its name for display, and each way it was reached. */
export type Touch = { ref: Ref; label: string; how: string[] };

/** Every kind is present; a kind nothing reached has an empty list. */
export type TouchGroups = Record<TouchKind, Touch[]>;

export type Touches = {
  subject: Ref;
  label: string;
  /** Links to and from the subject. */
  direct: TouchGroups;
  /**
   * One step past `direct`, where a change plainly carries, without the
   * subject or anything already in `direct`.
   */
  further: TouchGroups;
};

export type UnknownRef = { kind: "unknown_ref"; message: string };

type Link = { ref: Ref; how: string };

/**
 * What `ref` touches. For a candidate answer, `direct` holds what it declares
 * in `touches` (and its question), and `further` what each record it touches
 * would report: its direct links and the step past them.
 */
export function whatThisTouches(
  story: Story,
  ref: Ref,
): Result<Touches, UnknownRef> {
  if (!refExists(story, ref)) {
    return err({
      kind: "unknown_ref",
      message: `${describeRef(ref)} does not exist`,
    });
  }
  const direct = directLinks(story, ref);
  const reached = new Set([ref, ...direct.map((link) => link.ref)].map(key));
  const further = carriedLinks(story, ref).filter(
    (link) => !reached.has(key(link.ref)),
  );
  return ok({
    subject: ref,
    label: refLabel(story, ref),
    direct: grouped(story, direct, ref),
    further: grouped(story, further, ref),
  });
}

const key = (ref: Ref) =>
  JSON.stringify([
    ref.kind,
    ref.kind === "candidate" ? ref.questionId : "",
    ref.id,
  ]);

const sameRef = (a: Ref, b: Ref) => key(a) === key(b);

/**
 * The record's name, or its ID if the name is blank. Knowledge has no name of
 * its own: it is named for its actor and what they know, which can itself be
 * knowledge, so `depth` stops a circle.
 */
export function refLabel(story: Story, ref: Ref, depth = 0): string {
  const label = ((): string => {
    switch (ref.kind) {
      case "actor":
        return story.actors.find((a) => a.id === ref.id)?.name ?? "";
      case "drive":
        return story.drives.find((d) => d.id === ref.id)?.want ?? "";
      case "fact":
        return story.facts.find((f) => f.id === ref.id)?.text ?? "";
      case "readerQuestion":
        return (
          story.readerQuestions.find((q) => q.id === ref.id)?.question ?? ""
        );
      case "event":
        return story.timeline.events.find((e) => e.id === ref.id)?.label ?? "";
      case "scene":
        return story.scenes.find((s) => s.id === ref.id)?.title ?? "";
      case "openQuestion":
        return story.openQuestions.find((q) => q.id === ref.id)?.question ?? "";
      case "candidate":
        return (
          story.openQuestions
            .find((q) => q.id === ref.questionId)
            ?.candidates.find((c) => c.id === ref.id)?.answer ?? ""
        );
      case "version":
        return story.versions.find((v) => v.id === ref.id)?.text ?? "";
      case "knowledge": {
        const k = story.knowledge.find((x) => x.id === ref.id);
        if (k === undefined || depth > 2) return "";
        const who = refLabel(story, { kind: "actor", id: k.actor }, depth + 1);
        return `${who} ${k.how}: ${refLabel(story, k.what, depth + 1)}`;
      }
    }
  })();
  return label.trim() === "" ? ref.id : label;
}

const RELATION_HOW = {
  opposes: "a drive opposed to it",
  allies: "an allied drive",
  competes: "a competing drive",
} as const;

/** Links to and from `ref`, dangling ones included: `grouped` drops those. */
function directLinks(story: Story, ref: Ref): Link[] {
  const links: Link[] = [];
  const add = (how: string, ...refs: Ref[]) => {
    for (const to of refs) links.push({ ref: to, how });
  };
  const { id } = ref;

  switch (ref.kind) {
    case "actor":
      for (const drive of story.drives) {
        if (drive.actorId === id) add("its drive", driveRef(drive.id));
      }
      for (const scene of story.scenes) {
        if (scene.actors.includes(id)) add("a scene it's in", sceneRef(scene));
      }
      for (const version of story.versions) {
        if (version.by.includes(id)) {
          add("a version it tells", { kind: "version", id: version.id });
        }
      }
      for (const k of story.knowledge) {
        if (k.actor === id) {
          add(`what it ${k.how}`, { kind: "knowledge", id: k.id });
        }
      }
      break;
    case "drive": {
      const drive = story.drives.find((d) => d.id === id);
      if (drive?.actorId != null) add("its actor", actorRef(drive.actorId));
      for (const origin of drive?.origins ?? []) {
        add("an event that created it", eventRef(origin));
      }
      for (const relation of drive?.relations ?? []) {
        add(RELATION_HOW[relation.type], driveRef(relation.to));
      }
      for (const other of story.drives) {
        for (const relation of other.relations) {
          if (relation.to === id) {
            add(RELATION_HOW[relation.type], driveRef(other.id));
          }
        }
      }
      for (const scene of story.scenes) {
        if (scene.pressures.includes(id)) {
          add("a scene that puts it under pressure", sceneRef(scene));
        }
      }
      break;
    }
    case "event":
      for (const drive of story.drives) {
        if (drive.origins.includes(id)) {
          add("a drive it created", driveRef(drive.id));
        }
      }
      for (const scene of story.scenes) {
        if (scene.depicts.includes(id)) {
          add("a scene that depicts it", sceneRef(scene));
        }
      }
      for (const { cause, effect } of story.causes) {
        if (cause === id) add("an event it caused", eventRef(effect));
        if (effect === id) add("an event that caused it", eventRef(cause));
      }
      for (const version of story.versions) {
        if (version.event === id) {
          add("a version of it", { kind: "version", id: version.id });
        }
      }
      for (const k of story.knowledge) {
        const kRef: Ref = { kind: "knowledge", id: k.id };
        if (k.since === id) add("knowledge held from then", kRef);
        if (k.until === id) add("knowledge held until then", kRef);
      }
      for (const c of story.timeline.constraints) {
        const other = c.a === id ? c.b : c.b === id ? c.a : undefined;
        if (other !== undefined && other !== id) {
          add(
            `constraint ${c.id}: ${c.a} ${c.relation} ${c.b}`,
            eventRef(other),
          );
        }
      }
      break;
    case "scene": {
      const scene = story.scenes.find((s) => s.id === id);
      for (const actor of scene?.actors ?? []) {
        add("an actor in it", actorRef(actor));
      }
      for (const event of scene?.depicts ?? []) {
        add("an event it depicts", eventRef(event));
      }
      for (const drive of scene?.pressures ?? []) {
        add("a drive it puts under pressure", driveRef(drive));
      }
      for (const how of SCENE_LINK_KINDS) {
        add(`what it ${how}`, ...(scene?.[how] ?? []));
      }
      for (const question of story.readerQuestions) {
        const qRef: Ref = { kind: "readerQuestion", id: question.id };
        if (question.opensAt === id) add("a reader question it opens", qRef);
        if (question.answeredAt === id) {
          add("a reader question it answers", qRef);
        }
      }
      break;
    }
    case "fact":
      add(
        "what it's about",
        ...(story.facts.find((f) => f.id === id)?.about ?? []),
      );
      break;
    case "readerQuestion": {
      const question = story.readerQuestions.find((q) => q.id === id);
      if (question?.opensAt !== undefined) {
        add("the scene that opens it", { kind: "scene", id: question.opensAt });
      }
      if (question?.answeredAt !== undefined) {
        add("the scene that answers it", {
          kind: "scene",
          id: question.answeredAt,
        });
      }
      break;
    }
    case "openQuestion": {
      const question = story.openQuestions.find((q) => q.id === id);
      add("what it's about", ...(question?.about ?? []));
      for (const candidate of question?.candidates ?? []) {
        add(
          candidate.id === question?.answer
            ? "its chosen answer"
            : "a candidate answer",
          { kind: "candidate", questionId: id, id: candidate.id },
        );
      }
      break;
    }
    case "version": {
      const version = story.versions.find((v) => v.id === id);
      if (version !== undefined) {
        add("the event it's an account of", eventRef(version.event));
        for (const actor of version.by) add("who tells it", actorRef(actor));
      }
      break;
    }
    case "knowledge": {
      const k = story.knowledge.find((x) => x.id === id);
      if (k !== undefined) {
        add(`who ${k.how} it`, actorRef(k.actor));
        add(`what they ${k.how === "knows" ? "know" : "believe"}`, k.what);
        if (k.since !== undefined) add("when it starts", eventRef(k.since));
        if (k.until !== undefined) add("when it ends", eventRef(k.until));
      }
      break;
    }
    case "candidate": {
      add("the question it answers", {
        kind: "openQuestion",
        id: ref.questionId,
      });
      add("what it would touch", ...candidateTouches(story, ref));
      break;
    }
  }

  // Whatever refers to `ref` by a Ref.
  for (const k of story.knowledge) {
    if (sameRef(k.what, ref)) {
      add(`someone who ${k.how} it`, { kind: "knowledge", id: k.id });
    }
  }
  for (const scene of story.scenes) {
    for (const how of SCENE_LINK_KINDS) {
      if (scene[how].some((linked) => sameRef(linked, ref))) {
        add(`a scene that ${how} it`, sceneRef(scene));
      }
    }
  }
  for (const fact of story.facts) {
    if (fact.about.some((about) => sameRef(about, ref))) {
      add("a fact about it", { kind: "fact", id: fact.id });
    }
  }
  for (const question of story.openQuestions) {
    if (question.about.some((about) => sameRef(about, ref))) {
      add("an open question about it", {
        kind: "openQuestion",
        id: question.id,
      });
    }
    for (const candidate of question.candidates) {
      if (candidate.touches.some((touched) => sameRef(touched, ref))) {
        add("a candidate answer that would touch it", {
          kind: "candidate",
          questionId: question.id,
          id: candidate.id,
        });
      }
    }
  }
  return links.filter((link) => !sameRef(link.ref, ref));
}

/** The step past `directLinks` where a change plainly carries. */
function carriedLinks(story: Story, ref: Ref): Link[] {
  const { id } = ref;
  switch (ref.kind) {
    case "drive": {
      const actorId = story.drives.find((d) => d.id === id)?.actorId;
      if (actorId == null || !refExists(story, actorRef(actorId))) return [];
      const how = `a scene its actor ${refLabel(story, actorRef(actorId))} is in`;
      return story.scenes
        .filter((scene) => scene.actors.includes(actorId))
        .map((scene) => ({ ref: sceneRef(scene), how }));
    }
    case "scene": {
      const actors = story.scenes.find((s) => s.id === id)?.actors ?? [];
      return actors
        .filter((actorId) => refExists(story, actorRef(actorId)))
        .flatMap((actorId) => {
          const how = `a drive of ${refLabel(story, actorRef(actorId))}, who is in it`;
          return story.drives
            .filter((drive) => drive.actorId === actorId)
            .map((drive) => ({ ref: driveRef(drive.id), how }));
        });
    }
    case "event": {
      const pressured = story.drives
        .filter((drive) => drive.origins.includes(id))
        .flatMap((drive) => {
          const how = `a scene that puts ${drive.id}, a drive it created, under pressure`;
          return story.scenes
            .filter((scene) => scene.pressures.includes(drive.id))
            .map((scene) => ({ ref: sceneRef(scene), how }));
        });
      // A change to a cause carries to what its effects reach.
      const effects = story.causes
        .filter(({ cause, effect }) => cause === id && effect !== id)
        .map(({ effect }) => eventRef(effect))
        .filter((effect) => refExists(story, effect));
      const caused = effects.flatMap((effect) =>
        directLinks(story, effect).map((link) => ({
          ref: link.ref,
          how: `${link.how}, of ${describeRef(effect)}, which it caused`,
        })),
      );
      return [...pressured, ...caused];
    }
    case "candidate":
      return candidateTouches(story, ref)
        .filter((touched) => refExists(story, touched))
        .flatMap((touched) =>
          [
            ...directLinks(story, touched),
            // A touched candidate's own step would go two steps out.
            ...(touched.kind === "candidate"
              ? []
              : carriedLinks(story, touched)),
          ].map((link) => ({
            ref: link.ref,
            how: `${link.how}, of ${describeRef(touched)}`,
          })),
        );
    default:
      return [];
  }
}

function candidateTouches(story: Story, ref: Ref): Ref[] {
  if (ref.kind !== "candidate") return [];
  return (
    story.openQuestions
      .find((q) => q.id === ref.questionId)
      ?.candidates.find((c) => c.id === ref.id)?.touches ?? []
  );
}

/** Drops dangling links and `subject`, and merges links to the same record. */
function grouped(story: Story, links: Link[], subject: Ref): TouchGroups {
  const groups: TouchGroups = {
    actor: [],
    drive: [],
    event: [],
    scene: [],
    fact: [],
    readerQuestion: [],
    openQuestion: [],
    candidate: [],
    version: [],
    knowledge: [],
  };
  const seen = new Map<string, Touch>();
  for (const { ref, how } of links) {
    if (sameRef(ref, subject) || !refExists(story, ref)) continue;
    const touch = seen.get(key(ref));
    if (touch === undefined) {
      const added = { ref, label: refLabel(story, ref), how: [how] };
      seen.set(key(ref), added);
      groups[ref.kind].push(added);
    } else if (!touch.how.includes(how)) {
      touch.how.push(how);
    }
  }
  return groups;
}

const actorRef = (id: string): Ref => ({ kind: "actor", id });
const driveRef = (id: string): Ref => ({ kind: "drive", id });
const eventRef = (id: string): Ref => ({ kind: "event", id });
const sceneRef = ({ id }: { id: string }): Ref => ({ kind: "scene", id });
