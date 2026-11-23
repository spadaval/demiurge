/**
 * The agent slip: the context viewer (`./context-viewer.tsx`) for a story
 * agent session's turns (DESIGN.md, Agent Slip). A past or running turn
 * shows what it sent (system prompt, model and sampler, context packet) and
 * what it did (each tool call with its arguments and result, the
 * contradictions its edits kept, and what its edits and traces suspect may
 * now be stale). The next turn's slip lets the writer edit the prompt and
 * sampler, for this session or as the profile's default, and the context
 * packet, for that turn only; its edits wait for the composer's Send
 * (`agent/next-turn.ts`).
 *
 * Nothing in the slip is AI prose, so it carries no vermilion.
 */

import { err, ok, type Result } from "neverthrow";
import type { KeyboardEvent, ReactNode } from "react";
import type { ContextPacket } from "~/agent/context";
import { packetText } from "~/agent/context";
import {
  type AgentTurn,
  argumentsLine,
  callArguments,
  callNamed,
  keptContradictions,
  type Reference,
  referenceKey,
  refusal,
  sentContext,
  type TraceCall,
  traceSuspects,
  turnTrace,
} from "~/agent/inspect";
import type { EditScope, NextTurnEdits } from "~/agent/next-turn";
import type { JsonObject, LlmRequest, Sampler } from "~/llm/types";
import { count, Part, ScopeChoice, SentPart, scopeState } from "./slip-parts";

/** Where a request goes, for the slip's target line. */
export type SlipTarget = {
  profileLabel: string;
  endpoint: string;
  url: string;
};

/** The slip's head: its title, Close, and the target line. */
function SlipHead({
  title,
  target,
  onClose,
  children,
}: {
  title: string;
  target: SlipTarget | null;
  onClose: (() => void) | undefined;
  children?: ReactNode;
}) {
  return (
    <header className="context-viewer-header">
      <div className="request-slip-head">
        <h2 className="request-slip-title">{title}</h2>
        {onClose ? (
          <button
            type="button"
            className="request-slip-close"
            onClick={onClose}
          >
            Close
          </button>
        ) : null}
      </div>
      {target ? (
        <p className="context-viewer-target">
          {target.profileLabel} · {target.endpoint} · <code>{target.url}</code>
        </p>
      ) : null}
      {children}
    </header>
  );
}

/** Escape puts the slip away, unless it comes from a field being edited. */
function closeOnEscape(onClose: (() => void) | undefined) {
  return (event: KeyboardEvent<HTMLElement>) => {
    const inField =
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLInputElement;
    if (event.key === "Escape" && onClose && !inField) {
      event.preventDefault();
      onClose();
    }
  };
}

/** The packet's sections, one line each: the agent's breakdown. */
function PacketSections({ packet }: { packet: ContextPacket }) {
  return (
    <ul className="context-viewer-cards" aria-label="Context sections">
      {packet.sections.map((section) => (
        <li key={section.title}>
          {section.title} · {count(section.lines.length)}{" "}
          {section.lines.length === 1 ? "line" : "lines"}
        </li>
      ))}
    </ul>
  );
}

/** The request body without its conversation and tools: the sampler and model. */
function parametersOf(request: LlmRequest): JsonObject {
  const { messages: _messages, tools: _tools, ...rest } = request.body;
  return rest;
}

/** The system message a request sent, if it sent one first. */
function systemMessageOf(request: LlmRequest): string | undefined {
  const messages = request.body.messages;
  if (!Array.isArray(messages)) return undefined;
  const first: unknown = messages[0];
  if (typeof first !== "object" || first === null) return undefined;
  const { role, content } = first as Record<string, unknown>;
  return role === "system" && typeof content === "string" ? content : undefined;
}

// ---------------------------------------------------------------------------
// A past or running turn.

export type AgentTurnSlipProps = {
  readonly kind: "turn";
  /** "Turn 3". */
  readonly title: string;
  readonly turn: AgentTurn;
  /** What the writer calls the turn's profile; its identifier otherwise. */
  readonly profileLabel?: string;
  /** The turn is running: the first call not yet answered is running. */
  readonly running?: boolean;
  /** A reference was followed: open its record's or scene's sheet. */
  readonly onOpen: (reference: Reference) => void;
  /** How to name a reference; its ref or scene otherwise. */
  readonly describe?: (reference: Reference) => string;
  readonly onClose?: () => void;
};

function defaultDescribe(reference: Reference): string {
  if (reference.kind === "record") return reference.ref;
  const words = reference.text.trim().split(/\s+/);
  const excerpt =
    words.length <= 6
      ? reference.text.trim()
      : `${words.slice(0, 6).join(" ")}…`;
  return excerpt === ""
    ? `scene:${reference.scene}`
    : `scene:${reference.scene} · “${excerpt}”`;
}

function ReferenceLink({
  reference,
  name,
  onOpen,
}: {
  reference: Reference;
  name: string;
  onOpen: (reference: Reference) => void;
}) {
  return (
    <button
      type="button"
      className="slip-reference"
      onClick={() => onOpen(reference)}
    >
      {name}
    </button>
  );
}

/** A call's state at the right of its fold line. */
function callState(call: TraceCall, running: boolean): string {
  const { state } = call;
  if (state.kind === "waiting") return running ? "running" : "waiting";
  if (!state.result.ok) return "failed";
  return state.ms === null ? "done" : `${count(state.ms)} ms`;
}

const pretty = (value: unknown) => JSON.stringify(value, null, 2);

function TraceItem({
  call,
  running,
  describe,
  onOpen,
}: {
  call: TraceCall;
  running: boolean;
  describe: (reference: Reference) => string;
  onOpen: (reference: Reference) => void;
}) {
  const refused = refusal(call);
  const named = callNamed(call);
  const state = callState(call, running);
  return (
    <details
      className="slip-call"
      data-state={state === "failed" ? "failed" : undefined}
    >
      <summary>
        <span className="slip-call-ordinal">{call.ordinal}</span>
        <code className="slip-call-name">{call.call.function.name}</code>
        <span className="slip-call-args">{argumentsLine(call.call)}</span>
        <span className="slip-call-state">{state}</span>
      </summary>
      <div className="slip-call-body">
        {refused ? (
          <p className="context-viewer-problem">{refused.message}</p>
        ) : null}
        {named.length > 0 ? (
          <ul className="slip-refs" aria-label="Named in the result">
            {named.map((item) =>
              item.kind === "record" ? (
                <li key={item.id} className="slip-ref-plain">
                  <code className="context-viewer-code">{item.id}</code>
                  {item.removed ? " (removed)" : ""}
                </li>
              ) : item.removed ? (
                <li
                  key={referenceKey(item.reference)}
                  className="slip-ref-plain"
                >
                  {describe(item.reference)} (removed)
                </li>
              ) : (
                <li key={referenceKey(item.reference)}>
                  <ReferenceLink
                    reference={item.reference}
                    name={describe(item.reference)}
                    onOpen={onOpen}
                  />
                </li>
              ),
            )}
          </ul>
        ) : null}
        <p className="context-viewer-part-label">Arguments</p>
        <pre className="slip-code" data-part="arguments">
          {pretty(callArguments(call.call))}
        </pre>
        {call.state.kind === "answered" ? (
          <>
            <p className="context-viewer-part-label">Result</p>
            <pre className="slip-code" data-part="result">
              {pretty(call.state.result)}
            </pre>
          </>
        ) : null}
      </div>
    </details>
  );
}

/** A past or running agent turn: what it sent, and what it did. A record. */
export function AgentTurnSlip({
  title,
  turn,
  profileLabel,
  running = false,
  onOpen,
  describe = defaultDescribe,
  onClose,
}: AgentTurnSlipProps) {
  const { run, steps } = turn;
  const first = steps[0]?.request;
  const trace = turnTrace(turn);
  const kept = keptContradictions(trace);
  const suspects = traceSuspects(trace);
  const failedSteps = steps.filter((step) => !step.response.ok);
  const context = sentContext(run);
  const firstWaiting = trace.find((call) => call.state.kind === "waiting");
  return (
    <section
      className="context-viewer agent-slip"
      aria-label={`${title}: request and tool calls`}
      onKeyDown={closeOnEscape(onClose)}
    >
      <SlipHead
        title={title}
        target={
          first
            ? {
                profileLabel: profileLabel ?? first.profile,
                endpoint: first.endpoint,
                url: first.url,
              }
            : null
        }
        onClose={onClose}
      >
        {run.editedContext === undefined ? null : (
          <p className="context-viewer-origin">
            The writer edited this turn's context before it was sent.
          </p>
        )}
      </SlipHead>

      <div className="context-viewer-fields">
        {first ? (
          <>
            <SentPart
              label="System prompt"
              kind="system"
              value={systemMessageOf(first) ?? ""}
            />
            <SentPart
              label="Model"
              kind="parameters"
              value={pretty(parametersOf(first))}
              code
            />
          </>
        ) : (
          <p className="context-viewer-note">No model call yet.</p>
        )}
        <SentPart
          label="Context packet"
          kind="context"
          value={context}
          state={
            run.editedContext === undefined ? "as sent" : "edited · as sent"
          }
        >
          <PacketSections packet={run.context} />
        </SentPart>
      </div>

      {failedSteps.map((step) =>
        step.response.ok ? null : (
          <p key={step.index} className="context-viewer-problem">
            Model call {step.index} failed: {step.response.error.message}
          </p>
        ),
      )}

      <h3 className="slip-label">
        Tool calls{" "}
        <span className="slip-label-count">{count(trace.length)}</span>
      </h3>
      {trace.length === 0 ? (
        <p className="context-viewer-note">No tool calls.</p>
      ) : (
        <ol className="slip-trace" aria-label="Tool calls">
          {trace.map((call) => (
            <li key={`${call.step}:${call.ordinal}`}>
              <TraceItem
                call={call}
                running={running && call === firstWaiting}
                describe={describe}
                onOpen={onOpen}
              />
            </li>
          ))}
        </ol>
      )}

      {kept.length > 0 ? (
        <>
          <h3 className="slip-label">
            Kept contradictions{" "}
            <span className="slip-label-count">{count(kept.length)}</span>
          </h3>
          <ul className="slip-rows" aria-label="Kept contradictions">
            {kept.map((contradiction, i) => (
              // A turn's contradictions are listed once, in call order.
              // biome-ignore lint/suspicious/noArrayIndexKey: position is the identity
              <li key={i}>
                <span className="slip-row-kind">{contradiction.label}</span>
                <span className="slip-row-text">{contradiction.message}</span>
                <span className="slip-row-meta">kept</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {suspects.length > 0 ? (
        <>
          <h3 className="slip-label">
            Touched by this change{" "}
            <span className="slip-label-count">{count(suspects.length)}</span>
          </h3>
          <ul className="slip-rows" aria-label="Touched by this change">
            {suspects.map((suspect) => (
              <li key={referenceKey(suspect.target)}>
                <ReferenceLink
                  reference={suspect.target}
                  name={describe(suspect.target)}
                  onOpen={onOpen}
                />
                <span className="slip-row-reason">
                  {suspect.reasons.join("; ")}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// The next turn.

/** What the next turn would send, before the writer's edits. */
export type NextTurnBase = {
  systemPrompt: string;
  /** The model the session asks for in place of its profile's, or null. */
  model: string | null;
  /** The profile's own model, or null when it names none. */
  profileModel: string | null;
  /** What the session lays over the profile's sampler. */
  sampler: Sampler;
  /** The profile's own sampler, which `sampler` is laid over. */
  profileSampler: Sampler;
  /** The packet assembled for the next turn, as it would be sent. */
  packet: ContextPacket;
};

/** The next-turn slip's fields, as the writer left them. */
export type NextTurnDraft = {
  systemPrompt: string;
  promptScope: EditScope;
  /** The model's name; empty for the profile's own. */
  model: string;
  /** The session's sampler as a JSON object. */
  sampler: string;
  /** Who a model or sampler edit is for. */
  modelScope: EditScope;
  context: string;
};

const samplerText = (sampler: Sampler) => pretty(sampler);

/** The draft of a next turn the writer hasn't edited. */
export function nextTurnDraft(base: NextTurnBase): NextTurnDraft {
  return {
    systemPrompt: base.systemPrompt,
    promptScope: "session",
    model: base.model ?? "",
    sampler: samplerText(base.sampler),
    modelScope: "session",
    context: packetText(base.packet),
  };
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Body keys the request builder sets itself, over any sampler key of the
 * same name: a sampler holding one would be saved and never sent.
 */
const BUILT_KEYS = [
  "model",
  "messages",
  "prompt",
  "tools",
  "tool_choice",
  "stream",
];

/**
 * The edits `draft` makes to `base`, for `sendNextTurn`; only what changed.
 * Err with a reason the writer can act on when the sampler isn't a JSON
 * object.
 */
export function nextTurnEdits(
  base: NextTurnBase,
  draft: NextTurnDraft,
): Result<NextTurnEdits, string> {
  const edits: NextTurnEdits = {};
  if (draft.systemPrompt !== base.systemPrompt) {
    edits.systemPrompt = { text: draft.systemPrompt, scope: draft.promptScope };
  }
  const model = draft.model.trim();
  if (model !== (base.model ?? "")) {
    edits.model = {
      name: model === "" ? null : model,
      scope: draft.modelScope,
    };
  }
  if (draft.sampler !== samplerText(base.sampler)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(draft.sampler);
    } catch (cause) {
      return err(
        `The sampler is not valid JSON: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    }
    if (!isObject(parsed)) {
      return err(
        'The sampler must be a JSON object, like { "temperature": 0.8 }.',
      );
    }
    const built = BUILT_KEYS.find((key) => key in parsed);
    if (built === "model") {
      return err("Name the model in its own field, not in the sampler.");
    }
    if (built !== undefined) {
      return err(
        `The sampler can't set "${built}": the app sets it for every request.`,
      );
    }
    // JSON.parse only produces JSON values.
    edits.sampler = { value: parsed as Sampler, scope: draft.modelScope };
  }
  if (draft.context !== packetText(base.packet)) {
    edits.context = { packet: base.packet, text: draft.context };
  }
  return ok(edits);
}

export type NextTurnSlipProps = {
  readonly kind: "next";
  readonly target: SlipTarget;
  readonly base: NextTurnBase;
  readonly draft: NextTurnDraft;
  readonly onDraftChange: (draft: NextTurnDraft) => void;
  /** A turn is running: the slip can be read, not edited. */
  readonly disabled?: boolean;
  readonly onClose?: () => void;
};

/**
 * The next turn's slip: its prompt, model and context, editable. The edits
 * are the caller's (`draft`), since the composer's Send sends them.
 */
export function NextTurnSlip({
  target,
  base,
  draft,
  onDraftChange,
  disabled = false,
  onClose,
}: NextTurnSlipProps) {
  const set = (changes: Partial<NextTurnDraft>) =>
    onDraftChange({ ...draft, ...changes });
  const original = nextTurnDraft(base);
  const edits = nextTurnEdits(base, draft);
  const modelEdited =
    draft.model !== original.model || draft.sampler !== original.sampler;
  const edited =
    draft.systemPrompt !== original.systemPrompt ||
    modelEdited ||
    draft.context !== original.context;
  return (
    <section
      className="context-viewer agent-slip"
      aria-label="Next turn: request"
      onKeyDown={closeOnEscape(onClose)}
    >
      <SlipHead title="Next turn" target={target} onClose={onClose} />

      <fieldset className="context-viewer-fields" disabled={disabled}>
        <Part
          label="System prompt"
          kind="system"
          value={draft.systemPrompt}
          original={original.systemPrompt}
          onChange={(systemPrompt) => set({ systemPrompt })}
          state={scopeState(draft.promptScope)}
        >
          {draft.systemPrompt === original.systemPrompt ? null : (
            <ScopeChoice
              label="Who the prompt edit is for"
              scope={draft.promptScope}
              reach="Changes the prompt for every new session with this profile."
              onChange={(promptScope) => set({ promptScope })}
            />
          )}
        </Part>
        <details className="context-viewer-part" data-role="model">
          <summary>
            <span className="context-viewer-part-label">Model</span>
            <span className="context-viewer-part-size">
              {modelEdited ? `${scopeState(draft.modelScope)} · ` : ""}
              {draft.model.trim() ||
                base.profileModel ||
                "the server's default"}
            </span>
          </summary>
          <label className="slip-field">
            <span className="context-viewer-part-label">Model name</span>
            <input
              type="text"
              className="context-viewer-code"
              value={draft.model}
              placeholder={base.profileModel ?? "the server's default"}
              onChange={(event) => set({ model: event.target.value })}
              spellCheck={false}
            />
          </label>
          <p className="context-viewer-note">
            Empty uses {target.profileLabel}'s own model.
          </p>
          <label className="slip-field">
            <span className="context-viewer-part-label">Sampler (JSON)</span>
            <textarea
              value={draft.sampler}
              onChange={(event) => set({ sampler: event.target.value })}
              rows={Math.min(20, draft.sampler.split("\n").length + 1)}
              spellCheck={false}
              className="context-viewer-code"
            />
          </label>
          <p className="context-viewer-note">
            Laid over {target.profileLabel}'s own sampler:{" "}
            <code className="context-viewer-code">
              {JSON.stringify(base.profileSampler)}
            </code>
          </p>
          {modelEdited ? (
            <ScopeChoice
              label="Who the model edit is for"
              scope={draft.modelScope}
              reach="Changes the model and sampler for every new session with this profile."
              onChange={(modelScope) => set({ modelScope })}
            />
          ) : null}
        </details>
        <PacketSections packet={base.packet} />
        <Part
          label="Context packet"
          kind="context"
          value={draft.context}
          original={original.context}
          onChange={(context) => set({ context })}
        >
          <p className="slip-reach">
            Edits apply to the next turn only and are kept with it as a
            revision.
          </p>
        </Part>
      </fieldset>
      {edits.isErr() ? (
        <p className="context-viewer-problem" role="alert">
          {edits.error}
        </p>
      ) : null}
      <div className="context-viewer-actions">
        <p className="slip-reach">Sent with your next message.</p>
        <button
          type="button"
          className="context-viewer-discard"
          disabled={!edited || disabled}
          onClick={() => onDraftChange(original)}
        >
          Discard edits
        </button>
      </div>
    </section>
  );
}
