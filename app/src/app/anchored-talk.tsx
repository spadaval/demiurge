/**
 * Talk started where the writer is (DESIGN.md, Topics): "Talk about this
 * scene" (or "this passage", while words are selected) on a scene sheet,
 * and "Talk about this record" with the record's open topics on a record's
 * detail in the World inspector. Each opens the target's topic
 * sheet in its tab: the topic already drafted about it, or a new one that
 * takes its scope and waits for a title (`AppTalk.anchor`).
 */

import { Link, useNavigate } from "@tanstack/react-router";
import { type Point, RangeApi } from "platejs";
import { useEditorSelector } from "platejs/react";
import type { DocumentEditor } from "~/editor/document-editor";
import { textBlocks } from "~/editor/layer-plugin";
import { formatRef } from "~/story/refs";
import type { Ref } from "~/story/story";
import { type PassageAnchor, passageAt, type TextPoint } from "~/talk/passage";
import type { TopicScope } from "~/talk/records";
import { openTopicsOn, recordTopicScope, type TopicTarget } from "~/talk/scope";
import { useServices, useStore } from "./hooks";
import { topicTab } from "./tab-routes";

/** Shows a topic's sheet in its tab, opening the tab if it is closed. */
export function useShowTopic() {
  const { workspace } = useServices();
  const navigate = useNavigate();
  return async (id: string) => {
    workspace.commands.openSheet(topicTab(id));
    await navigate({ to: "/topic/$topicId", params: { topicId: id } });
  };
}

/** Opens the topic about `scope`: the one drafted about it, or a new one. */
export function useTalkAbout() {
  const { talk } = useServices();
  const show = useShowTopic();
  return (scope: TopicScope) => show(talk.anchor(scope));
}

/**
 * The selection as a passage: the words selected, in one block or over
 * several, and which occurrence of them in their first block. Null for a
 * caret, or a selection of nothing but white space.
 */
export function selectedPassage(editor: DocumentEditor): PassageAnchor | null {
  const { selection } = editor;
  if (selection === null || RangeApi.isCollapsed(selection)) return null;
  const point = (at: Point): TextPoint | null => {
    const entry = editor.api.block({ at });
    const start = entry && editor.api.start(entry[1]);
    if (entry === undefined || start === undefined) return null;
    const blockId = entry[0].id;
    if (typeof blockId !== "string") return null;
    const offset = editor.api.string({ anchor: start, focus: at }).length;
    return { blockId, offset };
  };
  const a = point(selection.anchor);
  const b = point(selection.focus);
  return a === null || b === null
    ? null
    : passageAt(textBlocks(editor.children), a, b);
}

const samePassage = (a: PassageAnchor | null, b: PassageAnchor | null) =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.blockId === b.blockId &&
    a.quote === b.quote &&
    a.occurrence === b.occurrence &&
    a.through === b.through);

/**
 * The scene sheet's talk action, under the title: about the passage while
 * one is selected, else about the scene. Inside the document's Plate.
 */
export function SceneTalkAction({
  scene,
  documentId,
}: {
  scene: string;
  documentId: string;
}) {
  const { talk } = useServices();
  const talkAbout = useTalkAbout();
  const passage = useEditorSelector(
    (editor) => selectedPassage(editor as DocumentEditor),
    [],
    { equalityFn: samePassage },
  );
  if (talk.readOnly) return null;
  const scope: TopicScope =
    passage === null
      ? { kind: "scene", scene }
      : { kind: "passage", scene, documentId, ...passage };
  return (
    <p className="scene-talk">
      <button
        type="button"
        className="text-action"
        // Keep the selection the action is about where it is.
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => void talkAbout(scope)}
      >
        {passage === null ? "Talk about this scene" : "Talk about this passage"}
      </button>
    </p>
  );
}

/**
 * A record's open topics on its detail sheet, each a reference to its topic
 * sheet, then "Talk about this record". A scene record lists the scene's
 * topics, its passages' included.
 */
export function RecordTalk({ subject }: { subject: Ref }) {
  const { talk } = useServices();
  const topics = useStore(talk.topics);
  const talkAbout = useTalkAbout();
  const target: TopicTarget =
    subject.kind === "scene"
      ? { kind: "scene", scene: subject.id }
      : { kind: "record", ref: formatRef(subject) };
  const open = openTopicsOn(topics, target);
  if (talk.readOnly && open.length === 0) return null;
  return (
    <dl className="record-group record-talk">
      <div className="record-field" data-wide>
        <dt>Talk</dt>
        <dd>
          {open.length > 0 && (
            <ul className="record-list">
              {open.map((topic) => (
                <li key={topic.id}>
                  <Link
                    to="/topic/$topicId"
                    params={{ topicId: topic.id }}
                    className="ref"
                  >
                    {topic.title}
                  </Link>
                  {topic.scope.kind === "passage" && (
                    <span className="touch-how">a passage</span>
                  )}
                  {topic.startedBy.kind === "model" && (
                    <span className="touch-how">raised by model</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!talk.readOnly && (
            <button
              type="button"
              className="text-action"
              onClick={() => void talkAbout(recordTopicScope(subject))}
            >
              {subject.kind === "scene"
                ? "Talk about this scene"
                : "Talk about this record"}
            </button>
          )}
        </dd>
      </div>
    </dl>
  );
}
