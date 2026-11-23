import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import type { Result } from "neverthrow";
import {
  buildRequest,
  checkRequest,
  send,
  toolCallMessage,
  toolResult,
} from "./client";
import { parseToolArguments } from "./parse";
import type {
  BackendProfile,
  ChatMessage,
  Completion,
  JsonObject,
  LlmError,
  LlmRequest,
  StreamDelta,
  ToolCall,
  ToolDefinition,
} from "./types";

type Handler = (body: JsonObject) => Response | Promise<Response>;

let handler: Handler = () => new Response("no handler", { status: 500 });
const received: JsonObject[] = [];

const server = Bun.serve({
  port: 0,
  async fetch(req) {
    const body = (await req.json()) as JsonObject;
    received.push(body);
    return handler(body);
  },
});
afterAll(() => server.stop(true));
beforeEach(() => {
  received.length = 0;
});

const profile: BackendProfile = {
  name: "router",
  kind: "openrouter",
  baseUrl: `http://localhost:${server.port}/v1`,
  model: "some/model",
  sampler: { temperature: 0.7, top_p: 0.9 },
};

const tools: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "show",
      description: "Show a story record",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: { name: "gaps", parameters: { type: "object" } },
  },
];

const encoder = new TextEncoder();

/** Streams `pieces` verbatim, so tests control where chunk boundaries fall. */
function sse(pieces: string[]): Response {
  return new Response(
    new ReadableStream<Uint8Array>({
      async start(controller) {
        for (const piece of pieces) {
          controller.enqueue(encoder.encode(piece));
          await Bun.sleep(2);
        }
        controller.close();
      },
    }),
    { headers: { "Content-Type": "text/event-stream" } },
  );
}

const event = (delta: object, finish: string | null = null) =>
  `data: ${JSON.stringify({ choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;

const message = (msg: object, finish = "tool_calls") =>
  Response.json({
    model: "some/model",
    choices: [{ index: 0, message: msg, finish_reason: finish }],
  });

const call = (id: string, name: string, args: string): ToolCall => ({
  id,
  type: "function",
  function: { name, arguments: args },
});

function chat(messages: ChatMessage[], stream: boolean): LlmRequest {
  return buildRequest(profile, { kind: "chat", messages, tools }, { stream });
}

function expectErr(
  result: Result<Completion, LlmError>,
  kind: LlmError["kind"],
): LlmError {
  expect(result.isErr()).toBe(true);
  const error = result._unsafeUnwrapErr();
  expect(error.kind).toBe(kind);
  return error;
}

describe("sending tools", () => {
  test("tools and tool_choice reach the body beside the sampler", async () => {
    handler = () => message({ content: "ok" }, "stop");
    const request = buildRequest(
      profile,
      {
        kind: "chat",
        messages: [
          { role: "system", content: "You keep the bible." },
          { role: "user", content: "Who is Mara?" },
        ],
        tools,
        toolChoice: { type: "function", function: { name: "show" } },
      },
      {
        stream: false,
        sampler: { parallel_tool_calls: true, tools: "ignored", min_p: 0.1 },
      },
    );
    expect((await send(profile, request)).isOk()).toBe(true);
    expect(received[0]).toEqual({
      temperature: 0.7,
      top_p: 0.9,
      min_p: 0.1,
      parallel_tool_calls: true,
      model: "some/model",
      messages: [
        { role: "system", content: "You keep the bible." },
        { role: "user", content: "Who is Mara?" },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "show" } },
      stream: false,
    });
  });

  test("an empty tool list is left out of the request", () => {
    const request = buildRequest(
      profile,
      { kind: "chat", messages: [], tools: [] },
      { stream: false },
    );
    expect(request.body.tools).toBeUndefined();
    expect(request.body.tool_choice).toBeUndefined();
  });
});

describe("receiving tool calls", () => {
  test("a message's parallel calls come back in order", async () => {
    handler = () =>
      message({
        role: "assistant",
        content: null,
        tool_calls: [
          call("call_a", "show", '{"id":"mara"}'),
          call("call_b", "gaps", "{}"),
        ],
      });
    const completion = (
      await send(profile, chat([{ role: "user", content: "go" }], false))
    )._unsafeUnwrap();
    expect(completion).toEqual({
      text: "",
      logprobs: null,
      toolCalls: [
        call("call_a", "show", '{"id":"mara"}'),
        call("call_b", "gaps", "{}"),
      ],
      finishReason: "tool_calls",
      model: "some/model",
    });
  });

  test("streamed pieces of parallel calls are joined by index", async () => {
    const body = [
      event({ role: "assistant", content: "Checking." }),
      event({
        tool_calls: [
          {
            index: 0,
            id: "call_a",
            type: "function",
            function: { name: "show", arguments: "" },
          },
        ],
      }),
      event({ tool_calls: [{ index: 0, function: { arguments: '{"id"' } }] }),
      event({
        tool_calls: [
          {
            index: 1,
            id: "call_b",
            type: "function",
            function: { name: "show", arguments: '{"id":' },
          },
        ],
      }),
      event({
        tool_calls: [{ index: 0, function: { arguments: ':"mara"}' } }],
      }),
      event({
        tool_calls: [{ index: 1, function: { arguments: '"tobin"}' } }],
      }),
      event({}, "tool_calls"),
      "data: [DONE]\n\n",
    ].join("");
    // Split mid-event so pieces of one call straddle reads.
    const pieces: string[] = [];
    for (let i = 0; i < body.length; i += 11)
      pieces.push(body.slice(i, i + 11));
    handler = () => sse(pieces);

    const deltas: StreamDelta[] = [];
    const completion = (
      await send(profile, chat([{ role: "user", content: "go" }], true), {
        onDelta: (d) => deltas.push(d),
      })
    )._unsafeUnwrap();
    expect(completion.text).toBe("Checking.");
    expect(completion.finishReason).toBe("tool_calls");
    expect(completion.toolCalls).toEqual([
      call("call_a", "show", '{"id":"mara"}'),
      call("call_b", "show", '{"id":"tobin"}'),
    ]);
    expect(deltas.flatMap((d) => d.toolCalls)).toEqual([
      { index: 0, id: "call_a", name: "show", arguments: "" },
      { index: 0, arguments: '{"id"' },
      { index: 1, id: "call_b", name: "show", arguments: '{"id":' },
      { index: 0, arguments: ':"mara"}' },
      { index: 1, arguments: '"tobin"}' },
    ]);
  });

  test("parallel calls that all claim index 0 are told apart by id", async () => {
    // Gemini behind OpenRouter sends each parallel call whole at index 0.
    handler = () =>
      sse([
        event({
          tool_calls: [
            {
              index: 0,
              id: "g1",
              type: "function",
              function: { name: "show", arguments: '{"id":"mara"}' },
            },
          ],
        }),
        event({
          tool_calls: [
            {
              index: 0,
              id: "g2",
              type: "function",
              function: { name: "gaps", arguments: "{}" },
            },
          ],
        }),
        event({}, "tool_calls"),
      ]);
    const completion = (
      await send(profile, chat([{ role: "user", content: "go" }], true))
    )._unsafeUnwrap();
    expect(completion.toolCalls).toEqual([
      call("g1", "show", '{"id":"mara"}'),
      call("g2", "gaps", "{}"),
    ]);
  });

  test("calls without index or id, or with object arguments, are normalised", async () => {
    handler = () =>
      message({
        content: "",
        tool_calls: [
          { function: { name: "show", arguments: { id: "mara" } } },
          { id: "x", function: { name: "gaps", arguments: "" } },
        ],
      });
    const completion = (
      await send(profile, chat([{ role: "user", content: "go" }], false))
    )._unsafeUnwrap();
    expect(completion.toolCalls).toEqual([
      call("call_0", "show", '{"id":"mara"}'),
      call("x", "gaps", "{}"),
    ]);
  });

  test("tool calls arriving with no text still reach onDelta", async () => {
    handler = () =>
      sse([
        event({
          tool_calls: [
            { index: 0, id: "c", function: { name: "gaps", arguments: "{}" } },
          ],
        }),
        event({}, "tool_calls"),
      ]);
    const deltas: StreamDelta[] = [];
    await send(profile, chat([{ role: "user", content: "go" }], true), {
      onDelta: (d) => deltas.push(d),
    });
    expect(deltas).toEqual([
      {
        text: "",
        logprobs: [],
        toolCalls: [{ index: 0, id: "c", name: "gaps", arguments: "{}" }],
      },
    ]);
  });

  test.each<[string, object[], string]>([
    [
      "tool_calls that is not a list",
      [{ tool_calls: { index: 0 } }],
      "not a list",
    ],
    [
      "a tool call that is not an object",
      [{ tool_calls: ["show"] }],
      "not an object",
    ],
    [
      "arguments that are a number",
      [
        {
          tool_calls: [{ index: 0, function: { name: "show", arguments: 3 } }],
        },
      ],
      "neither text nor an object",
    ],
    [
      "a call that never names its function",
      [{ tool_calls: [{ index: 0, id: "c", function: { arguments: "{}" } }] }],
      "without a function name",
    ],
  ])("a stream with %s is malformed", async (_, deltas, reason) => {
    handler = () =>
      sse([...deltas.map((d) => event(d)), event({}, "tool_calls")]);
    const error = expectErr(
      await send(profile, chat([{ role: "user", content: "go" }], true)),
      "malformed",
    );
    expect(error.message).toContain(reason);
  });

  test("aborting while a call streams is aborted and cancels the server", async () => {
    let serverSawCancel = false;
    handler = () =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                event({
                  tool_calls: [
                    {
                      index: 0,
                      id: "c",
                      function: { name: "show", arguments: '{"id":' },
                    },
                  ],
                }),
              ),
            );
          },
          cancel() {
            serverSawCancel = true;
          },
        }),
        { headers: { "Content-Type": "text/event-stream" } },
      );
    const controller = new AbortController();
    const result = await send(
      profile,
      chat([{ role: "user", content: "go" }], true),
      {
        signal: controller.signal,
        onDelta: (d) => {
          if (d.toolCalls.length) controller.abort();
        },
      },
    );
    expectErr(result, "aborted");
    await Bun.sleep(20);
    expect(serverSawCancel).toBe(true);
  });
});

describe("a multi-turn tool conversation", () => {
  test("calls, results and the final answer round-trip through the server", async () => {
    let turn = 0;
    handler = () => {
      turn += 1;
      if (turn === 1) {
        return sse([
          event({
            tool_calls: [
              {
                index: 0,
                id: "call_1",
                type: "function",
                function: { name: "show", arguments: '{"id":"mara"}' },
              },
              {
                index: 1,
                id: "call_2",
                type: "function",
                function: { name: "show", arguments: '{"id":"tobin"' },
              },
            ],
          }),
          event({}, "tool_calls"),
          "data: [DONE]\n\n",
        ]);
      }
      return sse([
        event({ content: "Mara is Tobin's sister." }, "stop"),
        "data: [DONE]\n\n",
      ]);
    };

    const messages: ChatMessage[] = [
      { role: "system", content: "Answer from the bible." },
      { role: "user", content: "How are Mara and Tobin related?" },
    ];
    const first = (await send(profile, chat(messages, true)))._unsafeUnwrap();
    const assistant = toolCallMessage(first);
    expect(assistant).toEqual({
      role: "assistant",
      content: null,
      tool_calls: first.toolCalls,
    });
    if (assistant === null) throw new Error("expected tool calls");
    messages.push(assistant);
    for (const made of first.toolCalls) {
      const args = parseToolArguments(made);
      messages.push(
        toolResult(
          made.id,
          args.match(
            (a) => `${a.id} is a person`,
            (e) => `Error: ${e.message}`,
          ),
        ),
      );
    }

    const second = (await send(profile, chat(messages, true)))._unsafeUnwrap();
    expect(second.text).toBe("Mara is Tobin's sister.");
    expect(second.toolCalls).toEqual([]);
    expect(toolCallMessage(second)).toBeNull();

    expect(received[1]?.messages).toEqual([
      { role: "system", content: "Answer from the bible." },
      { role: "user", content: "How are Mara and Tobin related?" },
      {
        role: "assistant",
        content: null,
        tool_calls: [
          call("call_1", "show", '{"id":"mara"}'),
          // Sent back exactly as the model wrote it, so it can see its slip.
          call("call_2", "show", '{"id":"tobin"'),
        ],
      },
      { role: "tool", tool_call_id: "call_1", content: "mara is a person" },
      {
        role: "tool",
        tool_call_id: "call_2",
        content: expect.stringContaining(
          "Error: The arguments for show are not valid JSON",
        ),
      },
    ]);
    expect(received[1]?.tools).toEqual(tools);
  });
});

describe("parsing tool arguments", () => {
  test("an object parses", () => {
    expect(
      parseToolArguments(
        call("c", "show", '{"id":"mara","n":[1]}'),
      )._unsafeUnwrap(),
    ).toEqual({ id: "mara", n: [1] });
  });

  test.each([
    ['{"id": "ma', "not valid JSON"],
    ["[1, 2]", "not a list"],
    ['"mara"', "not a string"],
    ["null", "not null"],
  ])("%s is refused with a message for the model", (args, reason) => {
    const made = call("c", "show", args);
    const error = parseToolArguments(made)._unsafeUnwrapErr();
    expect(error).toMatchObject({ kind: "invalid_arguments", call: made });
    expect(error.message).toContain("The arguments for show");
    expect(error.message).toContain(reason);
  });
});

describe("checking a tool conversation before sending", () => {
  const asked: ChatMessage = { role: "user", content: "go" };
  const calls: ChatMessage = {
    role: "assistant",
    content: null,
    tool_calls: [call("a", "show", "{}"), call("b", "gaps", "{}")],
  };
  const answered: ChatMessage[] = [
    asked,
    calls,
    toolResult("a", "x"),
    toolResult("b", "y"),
  ];
  const withBody = (body: JsonObject): LlmRequest => ({
    ...chat([], false),
    body: { ...chat([], false).body, ...body },
  });

  test("a well-formed conversation passes", () => {
    expect(checkRequest(profile, chat(answered, true)).isOk()).toBe(true);
    expect(
      checkRequest(
        profile,
        chat([...answered, { role: "user", content: "and?" }], true),
      ).isOk(),
    ).toBe(true);
  });

  test.each<[string, () => LlmRequest, string]>([
    [
      "a result for a call nobody made",
      () => chat([asked, toolResult("a", "x")], false),
      "did not make",
    ],
    [
      "a call answered twice",
      () => chat([...answered, toolResult("a", "again")], false),
      "already answered",
    ],
    [
      "a call left unanswered before the next turn",
      () => chat([asked, calls, toolResult("a", "x"), asked], false),
      "Before message 3, the calls b have no tool result",
    ],
    [
      "calls left unanswered at the end",
      () => chat([asked, calls], false),
      "At the end of the messages, the calls a, b",
    ],
    [
      "a tool result without an id",
      () => withBody({ messages: [asked, { role: "tool", content: "x" }] }),
      "needs a tool_call_id",
    ],
    [
      "an empty list of calls",
      () =>
        withBody({
          messages: [{ role: "assistant", content: null, tool_calls: [] }],
        }),
      "at least one call",
    ],
    [
      "a call without arguments text",
      () =>
        withBody({
          messages: [
            {
              role: "assistant",
              content: null,
              tool_calls: [
                { id: "a", type: "function", function: { name: "show" } },
              ],
            },
          ],
        }),
      "arguments text",
    ],
    [
      "the same call id twice in one turn",
      () =>
        chat(
          [
            {
              role: "assistant",
              content: null,
              tool_calls: [call("a", "show", "{}"), call("a", "gaps", "{}")],
            },
          ],
          false,
        ),
      "makes tool call a twice",
    ],
    [
      "null content without tool calls",
      () => withBody({ messages: [{ role: "assistant", content: null }] }),
      "needs text content",
    ],
    [
      "a tool without a name",
      () => withBody({ tools: [{ type: "function", function: {} }] }),
      "Tool 0 needs",
    ],
    [
      "two tools with one name",
      () => withBody({ tools: [tools[0] ?? null, tools[0] ?? null] }),
      "Two tools are named show",
    ],
    [
      "parameters that aren't a schema object",
      () =>
        withBody({
          tools: [
            { type: "function", function: { name: "show", parameters: "id" } },
          ],
        }),
      "must be a JSON Schema object",
    ],
    [
      "a tool_choice naming a tool not offered",
      () =>
        withBody({
          tool_choice: { type: "function", function: { name: "trace" } },
        }),
      "names trace, which is not a tool",
    ],
    [
      "a required tool_choice with no tools",
      () => withBody({ tools: [], tool_choice: "required" }),
      '"required" needs tools',
    ],
    [
      "a tool_choice of the wrong shape",
      () => withBody({ tool_choice: "always" }),
      "tool_choice must be",
    ],
    [
      "tools on a completion request",
      () => ({
        ...buildRequest(
          profile,
          { kind: "completion", prompt: "x" },
          { stream: false },
        ),
        body: { prompt: "x", tools: [] },
      }),
      "can't have tools",
    ],
  ])("refuses %s without sending it", async (_, make, reason) => {
    const error = expectErr(await send(profile, make()), "invalid_request");
    expect(error.message).toContain(reason);
    expect(received).toHaveLength(0);
  });
});
