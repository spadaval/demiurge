/**
 * Test helper: an OpenAI-compatible chat server on a free local port that
 * answers each request with the next scripted reply and keeps every request
 * body it got. Used by the agent runner's scenario tests; nothing in the app
 * imports it.
 */

import type { JsonObject } from "../llm/types";

export type Reply = (body: JsonObject) => Response | Promise<Response>;

export type StubCall = { name: string; args: unknown; id?: string | null };

export interface StubLlm {
  /** Base URL including `/v1`. */
  readonly url: string;
  /** Every request body, in order. */
  readonly received: JsonObject[];
  /** Queues replies for the next requests. */
  script(...replies: Reply[]): void;
  /** Replies queued and not used yet. */
  pending(): number;
  reset(): void;
  stop(): void;
}

export function startStubLlm(): StubLlm {
  const replies: Reply[] = [];
  const received: JsonObject[] = [];
  const server = Bun.serve({
    port: 0,
    async fetch(request) {
      // A test server: the runner always sends a JSON object.
      const body = (await request.json()) as JsonObject;
      received.push(body);
      const reply = replies.shift();
      return reply === undefined
        ? Response.json(
            { error: { message: "the stub has no reply scripted" } },
            { status: 500 },
          )
        : reply(body);
    },
  });
  return {
    url: `http://localhost:${server.port}/v1`,
    received,
    script: (...more) => {
      replies.push(...more);
    },
    pending: () => replies.length,
    reset: () => {
      replies.length = 0;
      received.length = 0;
    },
    stop: () => {
      server.stop(true);
    },
  };
}

/** A whole (unstreamed) answer: text, tool calls, or both. */
export function reply(text: string, calls: StubCall[] = []): Reply {
  return () =>
    Response.json({
      id: "chatcmpl-stub",
      object: "chat.completion",
      model: "stub-model",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: text === "" ? null : text,
            ...(calls.length === 0
              ? {}
              : {
                  tool_calls: calls.map((call, i) => ({
                    ...(call.id === null
                      ? {}
                      : { id: call.id ?? `call-${i + 1}` }),
                    type: "function",
                    function: {
                      name: call.name,
                      arguments:
                        typeof call.args === "string"
                          ? call.args
                          : JSON.stringify(call.args),
                    },
                  })),
                }),
          },
          finish_reason: calls.length === 0 ? "stop" : "tool_calls",
        },
      ],
    });
}

export const toolCalls = (...calls: StubCall[]) => reply("", calls);

const encoder = new TextEncoder();

const event = (delta: JsonObject, finish: string | null = null) =>
  `data: ${JSON.stringify({
    id: "chatcmpl-stub",
    object: "chat.completion.chunk",
    model: "stub-model",
    choices: [{ index: 0, delta, finish_reason: finish }],
  })}\n\n`;

/** Streams `pieces` of text as SSE deltas, then `[DONE]`. */
export function streamed(pieces: readonly string[]): Reply {
  return () =>
    new Response(
      new ReadableStream<Uint8Array>({
        async start(controller) {
          for (const piece of pieces) {
            controller.enqueue(encoder.encode(event({ content: piece })));
            await Bun.sleep(1);
          }
          controller.enqueue(encoder.encode(event({}, "stop")));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      }),
      { headers: { "Content-Type": "text/event-stream" } },
    );
}

/**
 * Streams `first`, then nothing until the client goes away. `started`
 * resolves once the first piece is sent.
 */
export function hanging(first: string): {
  reply: Reply;
  started: Promise<void>;
} {
  let begin = () => {};
  const started = new Promise<void>((resolve) => {
    begin = resolve;
  });
  return {
    started,
    reply: () =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder.encode(event({ content: first })));
            begin();
          },
        }),
        { headers: { "Content-Type": "text/event-stream" } },
      ),
  };
}

/** An HTTP error, as a provider sends one. */
export const failure =
  (status: number, message: string): Reply =>
  () =>
    Response.json({ error: { message } }, { status });
