/**
 * The scenes that touch a record, in telling order: the scenes it is in,
 * that depict it or put it under pressure, that open or answer it, and that
 * reveal, imply or withhold it, or a version of an event or what an actor
 * knows or believes. A scene's prose isn't read: only what its
 * record declares counts.
 */

import { err, ok, type Result } from "neverthrow";
import {
  describeRef,
  type Ref,
  refExists,
  SCENE_LINK_KINDS,
  type Scene,
  type Story,
} from "./story";
import type { UnknownRef } from "./touches";

/** A scene that touches the record, its place in the telling, and each way. */
export type SceneTouch = { scene: Scene; index: number; how: string[] };

const sameRef = (a: Ref, b: Ref) =>
  a.kind === b.kind &&
  a.id === b.id &&
  (a.kind !== "candidate" ||
    (b.kind === "candidate" && a.questionId === b.questionId));

/** Every scene that touches `ref`, in telling order; one with none is left out. */
export function scenesTouching(
  story: Story,
  ref: Ref,
): Result<SceneTouch[], UnknownRef> {
  if (!refExists(story, ref)) {
    return err({
      kind: "unknown_ref",
      message: `${describeRef(ref)} does not exist`,
    });
  }
  return ok(
    story.scenes.flatMap((scene, index) => {
      const how = sceneHow(story, scene, ref);
      return how.length === 0 ? [] : [{ scene, index, how }];
    }),
  );
}

function sceneHow(story: Story, scene: Scene, ref: Ref): string[] {
  const how: string[] = [];
  const { id } = ref;
  if (ref.kind === "actor" && scene.actors.includes(id)) how.push("is in it");
  if (ref.kind === "event" && scene.depicts.includes(id)) {
    how.push("depicts it");
  }
  if (ref.kind === "drive" && scene.pressures.includes(id)) {
    how.push("puts it under pressure");
  }
  if (ref.kind === "readerQuestion") {
    const question = story.readerQuestions.find((q) => q.id === id);
    if (question?.opensAt === scene.id) how.push("opens it");
    if (question?.answeredAt === scene.id) how.push("answers it");
  }
  for (const kind of SCENE_LINK_KINDS) {
    for (const linked of scene[kind]) {
      if (sameRef(linked, ref)) how.push(`${kind} it`);
      // What a scene does with an answer, it does with that answer's question.
      else if (
        ref.kind === "openQuestion" &&
        linked.kind === "candidate" &&
        linked.questionId === id
      ) {
        how.push(`${kind} its candidate ${linked.id}`);
      }
      // A version or knowledge stands for its event and its actors.
      if (linked.kind === "version") {
        const version = story.versions.find((v) => v.id === linked.id);
        if (ref.kind === "event" && version?.event === id) {
          how.push(`${kind} its version ${linked.id}`);
        }
        if (ref.kind === "actor" && version?.by.includes(id)) {
          how.push(`${kind} the version ${linked.id} they tell`);
        }
      }
      if (linked.kind === "knowledge") {
        const k = story.knowledge.find((x) => x.id === linked.id);
        if (ref.kind === "actor" && k?.actor === id) {
          how.push(
            `${kind} what they ${k.how === "knows" ? "know" : "believe"} (${linked.id})`,
          );
        }
      }
    }
  }
  return how;
}
