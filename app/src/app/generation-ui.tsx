import { ElementApi, NodeApi } from "platejs";
import { useEditorSelector } from "platejs/react";
import type { CSSProperties, Ref } from "react";
import type { AiSegmentStatus } from "~/content/schema";
import type { SectionSelection } from "~/context/builder";
import { ContextViewer } from "~/generate/context-viewer";
import { labelOf } from "~/generate/profile";
import { SegmentControls } from "~/generate/segment-controls";
import type { Slip } from "./generation";
import { useServices, useStore } from "./hooks";

/** An AI segment's actions, in its caption. */
export function SegmentActions({
  documentId,
  id,
  status,
}: {
  documentId: string;
  id: string;
  status: AiSegmentStatus;
}) {
  const { generation, workspace } = useServices();
  const active = useStore(generation.active(documentId));
  return (
    <SegmentControls
      disabledReason={
        workspace.readOnly
          ? "This tab is read-only."
          : "Another generation is running in this document."
      }
      status={status}
      // One generation at a time: the others wait for it.
      disabled={active !== null || workspace.readOnly}
      onAccept={() => void generation.accept(documentId, id)}
      onRegenerate={() => void generation.regenerate(documentId, id)}
      onStop={() => void generation.stop(documentId)}
      onShowRequest={() => void generation.showSegmentRequest(documentId, id)}
    />
  );
}

/**
 * The request slip, in the gloss column beside the place its output goes:
 * the exact request, how it was assembled, and Send. It is the context
 * viewer attached to the text, not a panel; Escape or Close puts it away.
 */
export function RequestSlip({
  slip,
  style,
  ref,
  onClose,
}: {
  slip: Slip;
  style: CSSProperties | undefined;
  ref: Ref<HTMLElement>;
  onClose: () => void;
}) {
  const { generation } = useServices();
  const active = useStore(generation.active(slip.documentId));
  const profile = useStore(generation.profile);
  // The text of the block the request continues from: null for the end,
  // undefined once the block is gone (deleted, or a segment accepted).
  const after = useEditorSelector(
    (editor) => {
      const id = slip.record.after;
      if (id === null) return null;
      const block = editor.children.find(
        (node) => ElementApi.isElement(node) && node.id === id,
      );
      return block ? NodeApi.string(block) : undefined;
    },
    [slip.record.after],
  );
  // Sending in place of a segment doesn't need the block.
  const placeGone = after === undefined && slip.replaces === null;
  // The editor's tree is immutable: a new one means the text changed.
  const stale = useEditorSelector(
    (editor) =>
      slip.assembledOver !== null && editor.children !== slip.assembledOver,
    [slip.assembledOver],
  );
  return (
    <section
      ref={ref}
      tabIndex={-1}
      className="request-slip"
      style={style}
      aria-labelledby="request-slip-title"
      onKeyDown={(event) => {
        // Not from a field: Escape there mustn't throw away an edit.
        const inField =
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLInputElement;
        if (event.key === "Escape" && !slip.sending && !inField) {
          // Closing is what Escape did here; it stops nothing else.
          event.preventDefault();
          onClose();
        }
      }}
    >
      <header className="request-slip-head">
        <h2 id="request-slip-title" className="request-slip-title">
          Request
        </h2>
        {!slip.sending && (
          <button
            type="button"
            className="request-slip-close"
            onClick={onClose}
          >
            Close
          </button>
        )}
      </header>
      <p className="request-slip-where">
        {slip.replaces
          ? "This made the AI text beside it. Sending it again replaces that text."
          : placeGone
            ? "The text this request continues from is no longer in the document."
            : after === null
              ? "Sending it continues the text at the end."
              : after?.trim()
                ? `Sending it continues the text after “${excerpt(after)}”.`
                : "Sending it continues the text after an empty paragraph."}
      </p>
      {placeGone && !slip.sending && (
        <p className="request-slip-stale">
          <button
            type="button"
            onClick={() => void generation.openRequest(slip.documentId)}
          >
            Put it together at the caret
          </button>
        </p>
      )}
      {slip.retargeted && (
        <p className="request-slip-stale">
          The model settings have changed since this request was made, so it now
          goes to the server and model set there, without parameters only
          another kind of server reads.
        </p>
      )}
      {stale && !slip.sending && !placeGone && (
        <p className="request-slip-stale">
          The text has changed since this request was put together; it is sent
          as shown.{" "}
          <button
            type="button"
            onClick={() =>
              void generation.openRequest(slip.documentId, slip.record.after)
            }
          >
            Put it together again
          </button>
        </p>
      )}
      <ContextViewer
        record={slip.record}
        breakdown={slip.breakdown}
        onSend={(edited) => void generation.sendSlip(edited)}
        disabled={(active !== null && !slip.sending) || placeGone}
        sending={slip.sending}
        onStop={() => void generation.stop(slip.documentId)}
        {...(slip.replaces === null
          ? {
              onSelectSections: (selection: SectionSelection) =>
                void generation.selectSections(selection),
            }
          : {})}
        {...(profile?.name === slip.record.request.profile
          ? { profileLabel: labelOf(profile) }
          : {})}
      />
    </section>
  );
}

/** The first words of a block, to name it. */
function excerpt(text: string): string {
  const words = text.trim().split(/\s+/);
  return words.length <= 6 ? text.trim() : `${words.slice(0, 6).join(" ")}…`;
}
