/**
 * Talk started where the writer is (DESIGN.md, Topics): "Talk about this
 * scene" (or "this passage", while words of one paragraph are selected) on a
 * scene sheet, and "Talk about this record" with the record's open topics on
 * a record's detail in the World inspector. Each opens the target's topic
 * sheet in its tab: the topic already drafted about it, or a new one that
 * takes its scope and waits for a title (`AppTalk.anchor`).
 */

import { Link, useNavigate } from "@tanstack/react-router";
import { RangeApi } from "platejs";
import { useEditorSelector } from "platejs/react";
import type { DocumentEditor } from "~/editor/document-editor";
import { formatRef } from "~/story/refs";
import type { Ref } from "~/story/story";
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

/** The words of one paragraph the writer has selected, if they have. */
export type SelectedPassage = { blockId: string; quote: string };

/**
 * The selection as a passage: words selected within one text block, which
 * has an ID. Null for a caret, or a selection across blocks.
 */
export function selectedPassage(
  editor: DocumentEditor,
): SelectedPassage | null {
  const { selection } = editor;
  if (selection === null || RangeApi.isCollapsed(selection)) return null;
  const start = editor.api.block({ at: selection.anchor });
  const end = editor.api.block({ at: selection.focus });
  if (start === undefined || end === undefined || start[0] !== end[0]) {
    return null;
  }
  const blockId = start[0].id;
  const quote = editor.api.string(selection).trim();
  return typeof blockId === "string" && quote !== ""
    ? { blockId, quote }
    : null;
}

const samePassage = (a: SelectedPassage | null, b: SelectedPassage | null) =>
  a === b || (a?.blockId === b?.blockId && a?.quote === b?.quote);

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
