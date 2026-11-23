import { err, ok, type Result, ResultAsync } from "neverthrow";
import { errorMessage, isRecord, parseLogprobs } from "./parse";
import { SseParser } from "./sse";
import type {
  BackendKind,
  BackendProfile,
  Completion,
  Fetch,
  InvalidRequestError,
  JsonObject,
  LlmError,
  LlmInput,
  LlmRequest,
  ProfileTarget,
  Sampler,
  StreamDelta,
  TokenLogprob,
} from "./types";

/** Later layers win; keys set to `undefined` leave earlier values alone. */
export function mergeSampler(...layers: Sampler[]): Sampler {
  const merged: Sampler = {};
  for (const layer of layers) {
    for (const [key, value] of Object.entries(layer)) {
      if (value !== undefined) merged[key] = value;
    }
  }
  return merged;
}

/**
 * Assembles the exact request for `profile`: the profile's default sampler
 * merged with `options.sampler`, then model, input and `stream`, which always
 * win over same-named sampler keys.
 */
export function buildRequest(
  profile: BackendProfile,
  input: LlmInput,
  options: { stream: boolean; sampler?: Sampler },
): LlmRequest {
  const body: JsonObject = {};
  const sampler = mergeSampler(profile.sampler, options.sampler ?? {});
  for (const [key, value] of Object.entries(sampler)) {
    if (value !== undefined) body[key] = value;
  }
  if (profile.model !== undefined) body.model = profile.model;
  if (input.kind === "chat") body.messages = input.messages;
  else body.prompt = input.prompt;
  body.stream = options.stream;

  const endpoint = input.kind;
  return {
    profile: profile.name,
    endpoint,
    url: endpointUrl(profile, endpoint),
    body,
  };
}

function endpointUrl(
  profile: BackendProfile,
  endpoint: LlmRequest["endpoint"],
): string {
  const base = profile.baseUrl.replace(/\/+$/, "");
  return base + (endpoint === "chat" ? "/chat/completions" : "/completions");
}

/**
 * Body keys only one kind of server reads. Another server may refuse them
 * (OpenAI-compatible APIs answer an unknown parameter with 400) or apply
 * them differently, so a request moved to another kind leaves them out.
 * Keys every kind takes (temperature, top_p, top_k, min_p, max_tokens,
 * stop, seed, the penalties, logprobs) are not listed.
 */
const SERVER_KEYS: Readonly<Record<BackendKind, ReadonlySet<string>>> = {
  llamacpp: new Set([
    "n_probs",
    "post_sampling_probs",
    "n_predict",
    "n_keep",
    "n_indent",
    "cache_prompt",
    "id_slot",
    "return_tokens",
    "timings_per_token",
    "typical_p",
    "repeat_penalty",
    "repeat_last_n",
    "mirostat",
    "mirostat_tau",
    "mirostat_eta",
    "dynatemp_range",
    "dynatemp_exponent",
    "dry_multiplier",
    "dry_base",
    "dry_allowed_length",
    "dry_penalty_last_n",
    "dry_sequence_breakers",
    "xtc_probability",
    "xtc_threshold",
    "samplers",
    "grammar",
    "json_schema",
    "ignore_eos",
  ]),
  openrouter: new Set([
    "provider",
    "transforms",
    "route",
    "models",
    "top_a",
    "repetition_penalty",
    "reasoning",
    "usage",
    "plugins",
  ]),
  generic: new Set(),
};

/**
 * Whether `key` in a request's body is for another kind of server than
 * `profile`'s. A key the profile's own sampler sets is the writer's choice
 * for this server, so it is never foreign.
 */
const foreignKey = (profile: BackendProfile, key: string): boolean =>
  profile.sampler[key] === undefined &&
  Object.entries(SERVER_KEYS).some(
    ([kind, keys]) => kind !== profile.kind && keys.has(key),
  );

/** The settings of `profile` that say where its requests go and what reads them. */
export const targetOf = (profile: BackendProfile): ProfileTarget => ({
  baseUrl: profile.baseUrl.replace(/\/+$/, ""),
  kind: profile.kind,
  model: profile.model ?? null,
});

const sameTarget = (a: ProfileTarget, b: ProfileTarget) =>
  a.baseUrl.replace(/\/+$/, "") === b.baseUrl.replace(/\/+$/, "") &&
  a.kind === b.kind &&
  a.model === b.model;

/**
 * `request`, made when its profile was `madeFor`, addressed to `profile` as
 * it is now. Only what the profile changed changes; the writer's edits stay:
 * - a new server: the profile's endpoint URL, and the profile's model, as
 *   the request's may not exist there;
 * - a new model at the same server: the profile's model, unless the writer
 *   had chosen another in the request;
 * - a new kind of server: without parameters only another kind reads
 *   (llama.cpp's `n_probs` sent to OpenRouter, say), except ones the
 *   profile's own sampler sets.
 *
 * Without `madeFor` (a request stored before it was recorded), what the
 * profile was is guessed from the request: a different URL, model or a
 * parameter for another kind of server all count as changes.
 *
 * `checkRequest` still sends a profile's key only to that profile's URL.
 */
export function retarget(
  profile: BackendProfile,
  request: LlmRequest,
  madeFor?: ProfileTarget,
): LlmRequest {
  const now = targetOf(profile);
  const url = endpointUrl(profile, request.endpoint);
  const moved = madeFor
    ? madeFor.baseUrl.replace(/\/+$/, "") !== now.baseUrl
    : request.url !== url;
  const writerModel =
    madeFor !== undefined && (request.body.model ?? null) !== madeFor.model;
  const newModel = madeFor ? madeFor.model !== now.model : true;
  const newKind = madeFor ? madeFor.kind !== now.kind : true;
  const body: JsonObject = {};
  for (const [key, value] of Object.entries(request.body)) {
    if (key === "model" || (newKind && foreignKey(profile, key))) continue;
    body[key] = value;
  }
  const keepModel = !moved && (writerModel || !newModel);
  const model = keepModel ? request.body.model : profile.model;
  if (model !== undefined) body.model = model;
  return { ...request, profile: profile.name, url, body };
}

/**
 * Whether `request`, made when its profile was `madeFor`, is addressed to
 * `profile` as it is now, so it needs no `retarget`. With `madeFor`, that is
 * whether the profile's server, kind and model are unchanged; without it,
 * guessed from the request as `retarget` does.
 */
export function addressedTo(
  profile: BackendProfile,
  request: LlmRequest,
  madeFor?: ProfileTarget,
): boolean {
  if (request.profile !== profile.name) return false;
  if (madeFor) return sameTarget(madeFor, targetOf(profile));
  return (
    request.url === endpointUrl(profile, request.endpoint) &&
    request.body.model === profile.model &&
    !Object.keys(request.body).some((key) => foreignKey(profile, key))
  );
}

const ROLES = new Set(["system", "user", "assistant"]);

/**
 * Checks that `request` can be sent with `profile`: it names the profile, its
 * URL is the profile's endpoint (so an edited URL can't carry the profile's
 * key to another host), and its body has the input its endpoint reads
 * (`messages` for chat, `prompt` for completions) and not the other one.
 */
export function checkRequest(
  profile: BackendProfile,
  request: LlmRequest,
): Result<void, InvalidRequestError> {
  const { url, body, endpoint } = request;
  const invalid = (message: string) =>
    err<void, InvalidRequestError>({ kind: "invalid_request", url, message });
  if (request.profile !== profile.name) {
    return invalid(
      `The request is for profile "${request.profile}", not "${profile.name}"`,
    );
  }
  const expected = endpointUrl(profile, endpoint);
  if (url !== expected) {
    return invalid(
      `The request URL ${url} is not profile "${profile.name}"'s ${endpoint} endpoint ${expected}`,
    );
  }
  if (endpoint === "chat") {
    const { messages } = body;
    const valid =
      Array.isArray(messages) &&
      messages.every(
        (m) =>
          isRecord(m) &&
          typeof m.role === "string" &&
          ROLES.has(m.role) &&
          typeof m.content === "string",
      );
    if (!valid) {
      return invalid(
        "A chat request needs messages, each with a role (system, user or assistant) and text content",
      );
    }
    if (body.prompt !== undefined) {
      return invalid("A chat request can't have a prompt; use messages");
    }
  } else {
    if (typeof body.prompt !== "string") {
      return invalid("A completion request needs a text prompt");
    }
    if (body.messages !== undefined) {
      return invalid("A completion request can't have messages; use prompt");
    }
  }
  if (body.stream !== undefined && typeof body.stream !== "boolean") {
    return invalid("stream must be true or false");
  }
  return ok(undefined);
}

export type SendOptions = {
  signal?: AbortSignal;
  /**
   * Called for each streamed delta, in order. If it throws, the stream is
   * cancelled and `send` returns a `callback` error. Must be synchronous:
   * the rejection of an async callback is not observed.
   */
  onDelta?: (delta: StreamDelta) => void;
  /** Defaults to the global `fetch`. */
  fetch?: Fetch;
};

/**
 * Sends `request` with `profile`'s credentials. Streams when
 * `request.body.stream` is true. A request that fails `checkRequest` is not
 * sent. Every failure, including aborts, resolves as an `Err`; the returned
 * promise never rejects.
 */
export function send(
  profile: BackendProfile,
  request: LlmRequest,
  options: SendOptions = {},
): ResultAsync<Completion, LlmError> {
  return new ResultAsync(sendAsync(profile, request, options));
}

function headers(profile: BackendProfile): Record<string, string> {
  const out: Record<string, string> = { "Content-Type": "application/json" };
  if (profile.apiKey) out.Authorization = `Bearer ${profile.apiKey}`;
  if (profile.kind === "openrouter") out["X-Title"] = "Demiurge";
  return out;
}

async function sendAsync(
  profile: BackendProfile,
  request: LlmRequest,
  options: SendOptions,
): Promise<Result<Completion, LlmError>> {
  const checked = checkRequest(profile, request);
  if (checked.isErr()) return err(checked.error);
  const { url } = request;
  const { signal } = options;
  const aborted: LlmError = {
    kind: "aborted",
    url,
    message: `Request to ${url} was cancelled`,
  };
  const failure = (cause: unknown, doing: string): LlmError =>
    signal?.aborted
      ? aborted
      : {
          kind: "network",
          url,
          message: `${doing} ${url} failed: ${describe(cause)}`,
          cause,
        };

  let response: Response;
  try {
    response = await (options.fetch ?? fetch)(url, {
      method: "POST",
      headers: headers(profile),
      body: JSON.stringify(request.body),
      ...(signal ? { signal } : {}),
    });
  } catch (cause) {
    return err(failure(cause, "Request to"));
  }

  if (!response.ok) {
    let text = "";
    try {
      text = await response.text();
    } catch {
      // The status alone still identifies the failure.
    }
    let detail: string | undefined;
    try {
      detail = errorMessage(JSON.parse(text));
    } catch {
      // Not JSON; the raw text below is the best detail available.
    }
    const reason = detail ?? (text.trim().slice(0, 500) || response.statusText);
    return err({
      kind: "http",
      url,
      status: response.status,
      message: `${url} returned ${response.status}: ${reason}`,
    });
  }

  const assembly = new Assembly(request);
  if (request.body.stream !== true) {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch (cause) {
      if (signal?.aborted) return err(failure(cause, "Reading"));
      return err({
        kind: "malformed",
        url,
        message: `${url} returned a body that is not JSON`,
      });
    }
    return assembly.add(payload).map(() => assembly.result());
  }

  if (!response.body) {
    return err({ kind: "malformed", url, message: `${url} sent no body` });
  }
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    return await readStream(reader, assembly, aborted, failure, options);
  } finally {
    // Stops generation server-side on every early exit; a no-op once done.
    await reader.cancel().catch(() => undefined);
  }
}

async function readStream(
  reader: ReadableStreamDefaultReader<string>,
  assembly: Assembly,
  aborted: LlmError,
  failure: (cause: unknown, doing: string) => LlmError,
  { signal, onDelta }: SendOptions,
): Promise<Result<Completion, LlmError>> {
  const { url } = aborted;
  const parser = new SseParser();
  while (true) {
    let chunk: Awaited<ReturnType<typeof reader.read>>;
    try {
      chunk = await reader.read();
    } catch (cause) {
      return err(failure(cause, "Reading stream from"));
    }
    const events = chunk.done ? parser.end() : parser.push(chunk.value);
    for (const data of events) {
      if (signal?.aborted) return err(aborted);
      if (data === "[DONE]") return ok(assembly.result());
      let payload: unknown;
      try {
        payload = JSON.parse(data);
      } catch {
        return err({
          kind: "malformed",
          url,
          message: `${url} sent an SSE event that is not JSON: ${data.slice(0, 200)}`,
        });
      }
      const delta = assembly.add(payload);
      if (delta.isErr()) return err(delta.error);
      if (onDelta && (delta.value.text || delta.value.logprobs.length)) {
        try {
          onDelta(delta.value);
        } catch (cause) {
          return err({
            kind: "callback",
            url,
            message: `onDelta threw while streaming from ${url}: ${describe(cause)}`,
            cause,
          });
        }
      }
    }
    if (chunk.done) break;
  }
  if (signal?.aborted) return err(aborted);
  if (assembly.finishReason === null) {
    return err({
      kind: "malformed",
      url,
      message: `${url} ended the stream before it finished`,
    });
  }
  return ok(assembly.result());
}

function describe(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  try {
    return String(cause);
  } catch {
    // e.g. Object.create(null) has no toString; send() must still resolve.
    return "<unprintable value>";
  }
}

/** Accumulates choice 0 from a response or from successive stream chunks. */
class Assembly {
  private text: string[] = [];
  private logprobs: TokenLogprob[] | null = null;
  finishReason: string | null = null;
  private model: string | null = null;

  constructor(private readonly request: LlmRequest) {}

  add(payload: unknown): Result<StreamDelta, LlmError> {
    const { url } = this.request;
    if (!isRecord(payload)) {
      return err({ kind: "malformed", url, message: `${url} sent non-object` });
    }
    if (payload.error !== undefined) {
      const message = errorMessage(payload) ?? JSON.stringify(payload.error);
      return err({ kind: "server", url, message: `${url}: ${message}` });
    }
    if (typeof payload.model === "string") this.model = payload.model;
    if (!Array.isArray(payload.choices)) {
      return err({
        kind: "malformed",
        url,
        message: `${url} sent a response without choices`,
      });
    }

    const choice: unknown = payload.choices.find(
      (c: unknown) => isRecord(c) && (c.index ?? 0) === 0,
    );
    const delta: StreamDelta = { text: "", logprobs: [] };
    if (!isRecord(choice)) return ok(delta);

    const holder =
      this.request.endpoint === "chat"
        ? (choice.delta ?? choice.message)
        : choice;
    const field = this.request.endpoint === "chat" ? "content" : "text";
    if (isRecord(holder) && typeof holder[field] === "string") {
      delta.text = holder[field];
      this.text.push(delta.text);
    }
    const logprobs = parseLogprobs(choice.logprobs);
    if (logprobs) {
      delta.logprobs = logprobs;
      this.logprobs ??= [];
      this.logprobs.push(...logprobs);
    }
    if (typeof choice.finish_reason === "string") {
      this.finishReason = choice.finish_reason;
    }
    return ok(delta);
  }

  result(): Completion {
    return {
      text: this.text.join(""),
      logprobs: this.logprobs,
      finishReason: this.finishReason,
      model: this.model,
    };
  }
}
