import { err, ok, type Result } from "neverthrow";
import type {
  JsonObject,
  TokenAlternative,
  TokenLogprob,
  ToolArgumentsError,
  ToolCall,
  ToolCallDelta,
} from "./types";

type Obj = Record<string, unknown>;

export function isRecord(value: unknown): value is Obj {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function num(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function alternative(token: string, entry: Obj): TokenAlternative {
  const out: TokenAlternative = { token };
  const logprob = num(entry.logprob);
  const prob = num(entry.prob);
  const { bytes } = entry;
  if (
    Array.isArray(bytes) &&
    bytes.every((b) => Number.isInteger(b) && b >= 0 && b <= 255)
  ) {
    out.bytes = bytes;
  }
  if (logprob !== undefined) out.logprob = logprob;
  if (prob !== undefined) out.prob = prob;
  return out;
}

function alternatives(value: unknown): TokenAlternative[] {
  if (!Array.isArray(value)) return [];
  const out: TokenAlternative[] = [];
  for (const entry of value) {
    if (isRecord(entry) && typeof entry.token === "string") {
      out.push(alternative(entry.token, entry));
    }
  }
  return out;
}

/**
 * Per-token entries in the chat shape: `{ token, logprob, top_logprobs }`.
 * Used by OpenAI chat and by llama.cpp on both `/v1` endpoints; llama.cpp's
 * `post_sampling_probs` swaps in `prob` and `top_probs`.
 */
function contentLogprobs(entries: unknown[]): TokenLogprob[] {
  const out: TokenLogprob[] = [];
  for (const entry of entries) {
    if (!isRecord(entry) || typeof entry.token !== "string") continue;
    out.push({
      ...alternative(entry.token, entry),
      top: alternatives(entry.top_logprobs ?? entry.top_probs),
    });
  }
  return out;
}

/** Legacy OpenAI completions shape: parallel `tokens` / `token_logprobs` arrays. */
function legacyLogprobs(value: Obj): TokenLogprob[] {
  const tokens = Array.isArray(value.tokens) ? value.tokens : [];
  const logprobs = Array.isArray(value.token_logprobs)
    ? value.token_logprobs
    : [];
  const tops = Array.isArray(value.top_logprobs) ? value.top_logprobs : [];
  const out: TokenLogprob[] = [];
  tokens.forEach((token, i) => {
    if (typeof token !== "string") return;
    const entry: TokenLogprob = { token, top: [] };
    const logprob = num(logprobs[i]);
    if (logprob !== undefined) entry.logprob = logprob;
    const top = tops[i];
    if (isRecord(top)) {
      for (const [alt, lp] of Object.entries(top)) {
        if (typeof lp === "number") entry.top.push({ token: alt, logprob: lp });
      }
    }
    out.push(entry);
  });
  return out;
}

/** Normalises a choice's `logprobs` field; `null` when absent. */
export function parseLogprobs(value: unknown): TokenLogprob[] | null {
  if (Array.isArray(value)) return contentLogprobs(value);
  if (!isRecord(value)) return null;
  if (Array.isArray(value.content)) return contentLogprobs(value.content);
  if (Array.isArray(value.tokens)) return legacyLogprobs(value);
  return null;
}

/** Best human-readable message from an error payload, if it has one. */
export function errorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  const error = value.error;
  if (typeof error === "string") return error;
  if (isRecord(error) && typeof error.message === "string") {
    return error.message;
  }
  if (typeof value.message === "string") return value.message;
  return undefined;
}

type Slot = { id: string | null; name: string | null; arguments: string };

/**
 * Accumulates choice 0's tool calls from a message's `tool_calls` or from
 * successive stream deltas. Servers differ in small ways, all absorbed here:
 *
 * - OpenAI, OpenRouter and llama.cpp stream a call as pieces sharing an
 *   `index`, the id and name on the first piece only.
 * - Some providers behind OpenRouter (Gemini) give every parallel call
 *   index 0; a new id at a known index starts a new call.
 * - Some omit `index` when each call arrives whole; its position stands in.
 * - Some send `arguments` as a JSON object rather than text.
 * - Some omit the id; the call gets `call_<n>` so a result can answer it.
 * - Some send empty arguments for a call without parameters; they become
 *   `{}`, which every server accepts back in the assistant turn.
 */
export class ToolCallAssembly {
  private slots: Slot[] = [];
  private byIndex = new Map<number, number>();

  /** Adds one `tool_calls` array; Err with what was wrong with it. */
  add(value: unknown): Result<ToolCallDelta[], string> {
    if (value === undefined || value === null) return ok([]);
    if (!Array.isArray(value)) return err("tool_calls that is not a list");
    const deltas: ToolCallDelta[] = [];
    for (const [position, entry] of value.entries()) {
      if (!isRecord(entry)) return err("a tool call that is not an object");
      const fn = entry.function ?? {};
      if (!isRecord(fn))
        return err("a tool call whose function is not an object");
      let text: string;
      let whole = false;
      if (fn.arguments === undefined || fn.arguments === null) text = "";
      else if (typeof fn.arguments === "string") text = fn.arguments;
      else if (isRecord(fn.arguments)) {
        text = JSON.stringify(fn.arguments);
        whole = true;
      } else {
        return err("tool call arguments that are neither text nor an object");
      }
      const id = nonEmpty(entry.id);
      const name = nonEmpty(fn.name);

      const key = typeof entry.index === "number" ? entry.index : position;
      let index = this.byIndex.get(key);
      const known = index === undefined ? undefined : this.slots[index];
      if (
        index === undefined ||
        known === undefined ||
        (id !== undefined && known.id !== null && known.id !== id)
      ) {
        index = this.slots.push({ id: null, name: null, arguments: "" }) - 1;
        this.byIndex.set(key, index);
      }
      const slot = this.slots[index] as Slot;
      slot.id ??= id ?? null;
      slot.name ??= name ?? null;
      slot.arguments = whole ? text : slot.arguments + text;

      const delta: ToolCallDelta = { index, arguments: text };
      if (id !== undefined) delta.id = id;
      if (name !== undefined) delta.name = name;
      deltas.push(delta);
    }
    return ok(deltas);
  }

  /** The finished calls; Err when one never got a function name. */
  result(): Result<ToolCall[], string> {
    const calls: ToolCall[] = [];
    for (const [i, slot] of this.slots.entries()) {
      if (slot.name === null)
        return err(`tool call ${i} without a function name`);
      calls.push({
        id: slot.id ?? `call_${i}`,
        type: "function",
        function: {
          name: slot.name,
          arguments: slot.arguments.trim() === "" ? "{}" : slot.arguments,
        },
      });
    }
    return ok(calls);
  }
}

function nonEmpty(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

/** `call`'s arguments as an object, or why they aren't one. */
export function parseToolArguments(
  call: ToolCall,
): Result<JsonObject, ToolArgumentsError> {
  const { name, arguments: text } = call.function;
  const invalid = (message: string) =>
    err<JsonObject, ToolArgumentsError>({
      kind: "invalid_arguments",
      call,
      message,
    });
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    return invalid(
      `The arguments for ${name} are not valid JSON (${reason}): ${text.slice(0, 200)}`,
    );
  }
  if (!isRecord(parsed)) {
    const what = Array.isArray(parsed)
      ? "a list"
      : parsed === null
        ? "null"
        : `a ${typeof parsed}`;
    return invalid(
      `The arguments for ${name} must be a JSON object, not ${what}`,
    );
  }
  // JSON.parse yields only JSON values, so an object it returns is a JsonObject.
  return ok(parsed as JsonObject);
}
