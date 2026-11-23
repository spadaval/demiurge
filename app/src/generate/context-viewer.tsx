import { useEffect, useState } from "react";
import type {
  BibleBreakdown,
  ContextBreakdown,
  SectionSelection,
} from "~/context/builder";
import type { ContextRequest } from "~/context/requests";
import type { LlmRequest } from "~/llm/types";
import {
  AgentTurnSlip,
  type AgentTurnSlipProps,
  NextTurnSlip,
  type NextTurnSlipProps,
} from "./agent-slip";
import { draftOf, type RequestDraft, requestFromDraft } from "./draft";
import { ARIA_SHORTCUTS, shortcutLabel } from "./shortcuts";
import { count, Part } from "./slip-parts";

/**
 * The context viewer: one component for every request the app sends, set in
 * a slip beside what it explains (DESIGN.md, Request Slip and Agent Slip).
 * - `request` (the default): a prose generation's stored request, editable
 *   before Send.
 * - `turn`: a past or running story agent turn, read-only: what it sent and
 *   each tool call it made (`./agent-slip.tsx`).
 * - `next`: a story agent session's next turn, its prompt, model and
 *   context editable, the edits sent with the composer's Send.
 */
export type ContextViewerProps =
  | RequestViewerProps
  | AgentTurnSlipProps
  | NextTurnSlipProps;

export function ContextViewer(props: ContextViewerProps) {
  switch (props.kind) {
    case "turn":
      return <AgentTurnSlip {...props} />;
    case "next":
      return <NextTurnSlip {...props} />;
    default:
      return <RequestViewer {...props} />;
  }
}

export interface RequestViewerProps {
  readonly kind?: "request";
  /** The stored request to show: assembled, or a revision. */
  readonly record: ContextRequest;
  /**
   * How the request was put together. Defaults to an assembled record's own
   * breakdown; for a revision, pass its `assembledFrom` record's (it
   * describes the original, before the writer's edits), or null.
   */
  readonly breakdown?: ContextBreakdown | null;
  /**
   * Send was pressed. `edited` is the request as shown when the writer
   * changed it, else null. The caller stores an edit as a revision
   * (`Generator.revise`) and sends that revision, so what is sent is
   * exactly what is shown.
   */
  readonly onSend: (edited: LlmRequest | null) => void;
  /** Disables sending, e.g. while a generation runs. */
  readonly disabled?: boolean;
  /**
   * Sent and not yet answered: the request can't be edited, and Stop
   * (`onStop`) takes Send's place.
   */
  readonly sending?: boolean;
  readonly onStop?: () => void;
  /** What the writer calls the request's profile; its identifier otherwise. */
  readonly profileLabel?: string;
  /**
   * Pins or excludes story bible sections; the host puts the request
   * together again with them, which gives a new `record`. Without it the
   * sections are shown and can't be changed (a segment's past request).
   */
  readonly onSelectSections?: (selection: SectionSelection) => void;
}

/**
 * Shows the exact request a generation will send, and how it was put
 * together, and lets the writer edit the model input and parameters before
 * sending. Profile, endpoint and URL are shown, not editable. Edits are kept
 * here until Send; a new `record` discards them.
 */
function RequestViewer({
  record,
  breakdown = record.origin === "assembled" ? record.breakdown : null,
  onSend,
  disabled = false,
  sending = false,
  onStop,
  profileLabel,
  onSelectSections,
}: RequestViewerProps) {
  const [draft, setDraft] = useState<RequestDraft>(() =>
    draftOf(record.request),
  );
  useEffect(() => setDraft(draftOf(record.request)), [record]);

  const { request } = record;
  const original = JSON.stringify(draftOf(request));
  const edited = JSON.stringify(draft) !== original;
  const built = requestFromDraft(request, draft);
  const problem = built.isErr() ? built.error : null;

  const setMessage = (index: number, content: string) =>
    setDraft((current) =>
      current.input?.kind === "chat"
        ? {
            ...current,
            input: {
              kind: "chat",
              messages: current.input.messages.map((m, i) =>
                i === index ? { ...m, content } : m,
              ),
            },
          }
        : current,
    );

  return (
    <section className="context-viewer" aria-label="Request to the model">
      <header className="context-viewer-header">
        <p className="context-viewer-target">
          {profileLabel ?? request.profile} · {request.endpoint} ·{" "}
          <code>{request.url}</code>
        </p>
        {record.origin === "revision" ? (
          <p className="context-viewer-origin">
            Edited from request {record.parentId}
          </p>
        ) : null}
      </header>

      {breakdown ? <Breakdown breakdown={breakdown} /> : null}
      {breakdown?.bible ? (
        <BibleSections
          bible={breakdown.bible}
          unit={breakdown.budget.unit}
          {...(onSelectSections && !sending && record.origin === "assembled"
            ? { onSelect: onSelectSections }
            : {})}
        />
      ) : null}

      <form
        className="context-viewer-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (disabled || sending || built.isErr()) return;
          onSend(edited ? built.value : null);
        }}
      >
        <fieldset className="context-viewer-fields" disabled={sending}>
          {draft.input?.kind === "chat"
            ? draft.input.messages.map((message, index) => (
                <Part
                  // Messages are edited in place, never reordered.
                  // biome-ignore lint/suspicious/noArrayIndexKey: position is the identity
                  key={index}
                  label={`${ROLE_LABELS[message.role]} message`}
                  kind={message.role}
                  value={message.content}
                  original={originalMessage(request, index)}
                  onChange={(content) => setMessage(index, content)}
                />
              ))
            : null}
          {draft.input?.kind === "completion" ? (
            <Part
              label="Prompt"
              kind="prompt"
              value={draft.input.prompt}
              original={originalPrompt(request)}
              onChange={(prompt) =>
                setDraft({ ...draft, input: { kind: "completion", prompt } })
              }
            />
          ) : null}
          {draft.input === null ? (
            <p className="context-viewer-note">
              The input isn't in the shape the {request.endpoint} endpoint
              reads; it is shown with the parameters below.
            </p>
          ) : null}
          <Part
            label="Parameters (JSON)"
            kind="parameters"
            value={draft.parameters}
            original={draftOf(request).parameters}
            onChange={(parameters) => setDraft({ ...draft, parameters })}
            code
          />
        </fieldset>
        {problem ? (
          <p className="context-viewer-problem" role="alert">
            {problem}
          </p>
        ) : null}
        <div className="context-viewer-actions">
          <button
            type="button"
            className="context-viewer-discard"
            disabled={!edited || sending}
            onClick={() => setDraft(draftOf(request))}
          >
            Discard edits
          </button>
          {sending ? (
            <>
              <output className="context-viewer-sending">Sending…</output>
              <button
                type="button"
                className="context-viewer-stop"
                onClick={onStop}
                aria-keyshortcuts={ARIA_SHORTCUTS.stop}
                title={shortcutLabel("stop")}
              >
                Stop
              </button>
            </>
          ) : (
            <button
              type="submit"
              className="context-viewer-send"
              disabled={disabled || problem !== null}
              aria-keyshortcuts={ARIA_SHORTCUTS.generate}
              title={shortcutLabel("generate")}
            >
              {edited ? "Send edited request" : "Send"}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

const ROLE_LABELS = {
  system: "System",
  user: "User",
  assistant: "Assistant",
} as const;

const originalMessage = (request: LlmRequest, index: number) => {
  const input = draftOf(request).input;
  return input?.kind === "chat" ? (input.messages[index]?.content ?? "") : "";
};

const originalPrompt = (request: LlmRequest) => {
  const input = draftOf(request).input;
  return input?.kind === "completion" ? input.prompt : "";
};

function Breakdown({ breakdown }: { breakdown: ContextBreakdown }) {
  const { window, cards, budget, instruction } = breakdown;
  return (
    <div className="context-viewer-breakdown">
      <p className="context-viewer-window">
        Story window: {count(window.text.length)} of {count(window.available)}{" "}
        characters before the cursor
        {window.truncated
          ? ` (earlier text left out: ${limitReason(window.limitedBy)})`
          : ""}
        .
        {window.excludedSegments.length > 0
          ? ` ${window.excludedSegments.length} AI segment(s) still generating left out.`
          : ""}
      </p>
      <p className="context-viewer-budget">
        Budget: {count(budget.used)} of {count(budget.limit)} {budget.unit}.
        {breakdown.position.kind === "scene"
          ? " Facts as of this scene."
          : " Not a scene: facts as at the start of the story."}
      </p>
      {instruction.writer ? (
        <p className="context-viewer-instruction">
          Your instruction: {instruction.writer}
        </p>
      ) : null}
      {cards.length > 0 ? (
        <ul className="context-viewer-cards" aria-label="World cards">
          {cards.map((card) => (
            <li
              key={card.entry}
              data-included={String(card.included)}
              title={card.text}
            >
              {card.title} · {card.reasons.join(", ")} · {count(card.size)}{" "}
              {budget.unit}
              {card.included ? "" : " · left out to fit the budget"}
            </li>
          ))}
        </ul>
      ) : (
        <p className="context-viewer-cards">No world cards.</p>
      )}
    </div>
  );
}

function limitReason(limit: ContextBreakdown["window"]["limitedBy"]): string {
  switch (limit) {
    case "preferred":
      return "the window's preferred length";
    case "budget":
      return "the budget";
    case "document":
      return "the start of the document";
  }
}

/**
 * The story bible sections the request was put together with, each with
 * what became of it, and Pin and Leave out when `onSelect` is given.
 */
function BibleSections({
  bible,
  unit,
  onSelect,
}: {
  bible: BibleBreakdown;
  unit: string;
  onSelect?: (selection: SectionSelection) => void;
}) {
  const selection: SectionSelection = {
    pinned: bible.sections.filter((s) => s.pinned).map((s) => s.title),
    excluded: bible.sections.filter((s) => s.excluded).map((s) => s.title),
  };
  const without = (titles: readonly string[], title: string) =>
    titles.filter((t) => t !== title);
  // A section is pinned or left out, not both.
  const pin = (title: string, on: boolean) =>
    onSelect?.({
      pinned: on
        ? [...selection.pinned, title]
        : without(selection.pinned, title),
      excluded: without(selection.excluded, title),
    });
  const exclude = (title: string, on: boolean) =>
    onSelect?.({
      pinned: without(selection.pinned, title),
      excluded: on
        ? [...selection.excluded, title]
        : without(selection.excluded, title),
    });
  return (
    <div className="context-viewer-bible">
      <p className="context-viewer-bible-head">
        Story bible for <code>scene:{bible.scene}</code>
      </p>
      {bible.cleared.length > 0 ? (
        <p className="context-viewer-note">
          No longer in the bible, so cleared: {bible.cleared.join(", ")}.
        </p>
      ) : null}
      <ul className="context-viewer-cards" aria-label="Story bible sections">
        {bible.sections.map((section) => (
          <li
            key={section.title}
            data-included={String(section.included)}
            title={section.text}
          >
            <span>
              {section.title} · {count(section.size)} {unit}
              {section.pinned ? " · pinned" : ""}
              {section.excluded
                ? " · left out"
                : section.included
                  ? ""
                  : " · left out to fit the budget"}
            </span>
            {onSelect ? (
              <span className="context-viewer-section-actions">
                <button
                  type="button"
                  aria-pressed={section.pinned}
                  aria-label={`${section.pinned ? "Unpin" : "Pin"} ${section.title}`}
                  onClick={() => pin(section.title, !section.pinned)}
                >
                  {section.pinned ? "Unpin" : "Pin"}
                </button>
                <button
                  type="button"
                  aria-pressed={section.excluded}
                  aria-label={`${section.excluded ? "Include" : "Leave out"} ${section.title}`}
                  onClick={() => exclude(section.title, !section.excluded)}
                >
                  {section.excluded ? "Include" : "Leave out"}
                </button>
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
