/**
 * Replaying a recorded session: a model that answers each request with what
 * the recorded step got, in order, and refuses a request that differs from
 * the one recorded. A runner given it (`complete: replayModel(steps)`), on a
 * copy of the world as it was when the session started, sends the same
 * writer messages and so makes the same tool calls and the same edits; the
 * first request that comes out different is where the replay diverged. A run
 * whose context the writer edited is sent with that edit (`replayOptions`).
 */

import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import type { Completion, LlmError, LlmRequest } from "../llm/types";
import type { AgentRun, AgentStep, StepError } from "./records";
import type { Complete, MessageOptions } from "./runner";

/** JSON with object keys sorted, so equal values give equal text. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  return `{${Object.entries(value)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
    .join(",")}}`;
}

/** Whether two requests would send the same thing to the same place. */
export const sameRequest = (a: LlmRequest, b: LlmRequest) =>
  canonical(a) === canonical(b);

function llmError(error: StepError, url: string): LlmError {
  const { message } = error;
  switch (error.kind) {
    case "http":
      return { kind: "http", url, status: error.status ?? 0, message };
    case "network":
    case "callback":
      return { kind: error.kind, url, message, cause: undefined };
    default:
      return { kind: error.kind, url, message };
  }
}

/** A model that answers with `steps`' recorded responses, in order. */
export function replayModel(steps: readonly AgentStep[]): Complete {
  let next = 0;
  return (_profile, request): ResultAsync<Completion, LlmError> => {
    const step = steps[next];
    if (step === undefined) {
      return errAsync({
        kind: "malformed",
        url: request.url,
        message: `The recording has ${steps.length} steps and the replay asked for one more`,
      });
    }
    if (!sameRequest(step.request, request)) {
      return errAsync({
        kind: "malformed",
        url: request.url,
        message: `The replay's request for step ${step.index} differs from the one recorded`,
      });
    }
    next += 1;
    return step.response.ok
      ? okAsync(step.response.completion)
      : errAsync(llmError(step.response.error, request.url));
  };
}

/**
 * What to send a recorded run's message with in a replay: the writer's edit
 * of its context packet, when they made one. An unedited run gets a fresh
 * packet from the replay's world, as it did when it was recorded.
 */
export function replayOptions(run: AgentRun): MessageOptions {
  return run.editedContext === undefined
    ? {}
    : { context: { packet: run.context, text: run.editedContext } };
}
