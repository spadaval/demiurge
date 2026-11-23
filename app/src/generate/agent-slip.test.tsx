/**
 * The agent slip against a real runner, memory storage and a stub
 * OpenAI-compatible server: the next turn's prompt, sampler and context
 * edits reach the session, the profile's defaults or the turn as they say,
 * and a past turn shows its tool calls, kept contradictions and trace
 * suspects as recorded.
 */

import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import type { ResultAsync } from "neverthrow";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { buildContextPacket, packetText } from "~/agent/context";
import {
  type AgentDefaultsStore,
  createAgentDefaultsStore,
} from "~/agent/defaults";
import {
  type Reference,
  sessionTurns,
  traceSuspects,
  turnTrace,
} from "~/agent/inspect";
import { sendNextTurn } from "~/agent/next-turn";
import { defaultSystemPrompt } from "~/agent/prompt";
import { type AgentSession, loadSessionLog } from "~/agent/records";
import { type AgentRunner, createAgentRunner } from "~/agent/runner";
import { reply, startStubLlm, toolCalls } from "~/agent/stub-llm";
import type { BackendProfile, ChatMessage, JsonObject } from "~/llm/types";
import { createMemoryStorage } from "~/storage/memory";
import type { StorageAdapter } from "~/storage/types";
import { saveStory } from "~/story/store";
import { parseStory, type Story } from "~/story/story";
import type { KeyValueStore } from "~/workspace/tabs";
import {
  type NextTurnBase,
  type NextTurnDraft,
  nextTurnDraft,
  nextTurnEdits,
} from "./agent-slip";
import { ContextViewer } from "./context-viewer";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const fixture: Story = parseStory(
  await Bun.file(
    new URL("../story/fixtures/lighthouse.story.json", import.meta.url),
  ).text(),
)._unsafeUnwrap();

async function value<T, E>(result: ResultAsync<T, E>): Promise<T> {
  return (await result)._unsafeUnwrap();
}

const stub = startStubLlm();
afterAll(() => stub.stop());

const profile: BackendProfile = {
  name: "stub",
  kind: "generic",
  baseUrl: stub.url,
  model: "m",
  sampler: { temperature: 0.7 },
};
const target = {
  profileLabel: "Stub model",
  endpoint: "chat",
  url: `${stub.url}/chat/completions`,
};
const world = { kind: "world" } as const;

let storage: StorageAdapter;
let defaults: AgentDefaultsStore;
let runner: AgentRunner;
let clock: number;

function memoryKeyValue(): KeyValueStore {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, item) => {
      items.set(key, item);
    },
  };
}

beforeEach(async () => {
  stub.reset();
  clock = 5000;
  storage = createMemoryStorage();
  await value(saveStory(storage, fixture, 1000));
  defaults = createAgentDefaultsStore(memoryKeyValue(), "w");
  runner = createAgentRunner({
    storage,
    bindings: { plan: { profile }, prose: { profile } },
    now: () => {
      clock += 7;
      return clock;
    },
  });
});

let root: Root | undefined;
let container: HTMLElement | undefined;
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
});

function render(element: React.ReactNode): HTMLElement {
  if (root === undefined) {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  }
  const target = root;
  act(() => target.render(element));
  return container as HTMLElement;
}

/** Sets a textarea's value the way React notices. */
function type(textarea: Element | null, text: string) {
  const area = textarea as HTMLTextAreaElement;
  const setter = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(area),
    "value",
  )?.set;
  act(() => {
    setter?.call(area, text);
    area.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

const click = (element: Element | null | undefined) =>
  act(() => (element as HTMLElement).click());

const field = (view: HTMLElement, label: string) =>
  view.querySelector(`textarea[aria-label="${label}"]`);

const samplerField = (view: HTMLElement) =>
  view.querySelector('[data-role="model"] textarea');
const modelField = (view: HTMLElement) =>
  view.querySelector('[data-role="model"] input[type="text"]');

const foldLine = (view: HTMLElement, role: string) =>
  view.querySelector(`[data-role="${role}"] .context-viewer-part-size`)
    ?.textContent;

/** A new session of the plan role, started from the profile's defaults. */
async function startSession(id: string): Promise<AgentSession> {
  return value(
    runner.start({
      id,
      role: "plan",
      scope: world,
      ...defaults.get(profile.name, "plan"),
    }),
  );
}

async function baseFor(session: AgentSession): Promise<NextTurnBase> {
  return {
    systemPrompt: session.systemPrompt,
    model: session.model ?? null,
    profileModel: profile.model ?? null,
    sampler: session.sampler ?? {},
    profileSampler: profile.sampler,
    packet: await value(buildContextPacket(storage, session.scope)),
  };
}

/**
 * The next-turn slip as a topic sheet holds it: the draft lives beside the
 * composer, whose Send sends the message with the slip's edits.
 */
function Composer({
  base,
  onSend,
}: {
  base: NextTurnBase;
  onSend: (draft: NextTurnDraft) => void;
}) {
  const [draft, setDraft] = useState(() => nextTurnDraft(base));
  return (
    <>
      <ContextViewer
        kind="next"
        target={target}
        base={base}
        draft={draft}
        onDraftChange={setDraft}
      />
      <button
        type="button"
        className="composer-send"
        onClick={() => onSend(draft)}
      >
        Send
      </button>
    </>
  );
}

/** Renders the composer for `session`'s next turn; Send sends `message`. */
async function composeNext(session: AgentSession, message: string) {
  const base = await baseFor(session);
  let sent: Promise<unknown> = Promise.resolve();
  const view = render(
    <Composer
      key={session.updatedAt}
      base={base}
      onSend={(draft) => {
        const edits = nextTurnEdits(base, draft)._unsafeUnwrap();
        sent = value(
          sendNextTurn(
            { runner, defaults, profile: profile.name },
            session,
            message,
            edits,
          ),
        );
      }}
    />,
  );
  return {
    view,
    base,
    send: async () => {
      click(view.querySelector(".composer-send"));
      await act(() => sent);
    },
  };
}

const messages = (body: JsonObject | undefined) =>
  (body?.messages ?? []) as ChatMessage[];

describe("the next turn's prompt and model", () => {
  test("a prompt edit for this session changes this session only", async () => {
    const session = await startSession("s");
    const next = await composeNext(session, "Hello.");
    const { view } = next;
    expect(view.textContent).toContain("Sent with your next message.");
    // No scope choice until there is an edit.
    expect(view.querySelector("input[type=radio]")).toBeNull();

    type(field(view, "System prompt"), "Be terse.");
    expect(foldLine(view, "system")).toContain("edited · this session");
    const scopes = [
      ...view.querySelectorAll<HTMLInputElement>("input[type=radio]"),
    ];
    expect(
      scopes.map((s) => [s.parentElement?.textContent, s.checked]),
    ).toEqual([
      ["This session", true],
      ["Profile default", false],
    ]);
    expect(view.textContent).not.toContain("every new session");

    expect(foldLine(view, "model")).toBe("m");
    type(modelField(view), "other-model");
    type(samplerField(view), '{ "temperature": 0.1 }');
    expect(foldLine(view, "model")).toBe("edited · this session · other-model");

    stub.script(reply("Fine."));
    await next.send();
    expect(messages(stub.received[0])[0]).toEqual({
      role: "system",
      content: "Be terse.",
    });
    expect(stub.received[0]?.temperature).toBe(0.1);
    expect(stub.received[0]?.model).toBe("other-model");
    const { session: stored } = await value(loadSessionLog(storage, "s"));
    expect(stored).toMatchObject({
      systemPrompt: "Be terse.",
      model: "other-model",
      sampler: { temperature: 0.1 },
    });
    // The profile's defaults are untouched: a new session starts as before.
    expect(defaults.get(profile.name, "plan")).toEqual({
      systemPrompt: defaultSystemPrompt("plan"),
    });
    const fresh = await startSession("t");
    expect(fresh.systemPrompt).toBe(defaultSystemPrompt("plan"));
    expect(fresh.model).toBeUndefined();
  });

  test("a prompt edit as the profile default reaches new sessions too", async () => {
    const session = await startSession("s");
    const next = await composeNext(session, "Hello.");
    const { view } = next;
    type(field(view, "System prompt"), "Plan in lists.");
    click(
      [...view.querySelectorAll("input[type=radio]")].find(
        (input) => input.parentElement?.textContent === "Profile default",
      ),
    );
    expect(foldLine(view, "system")).toContain("edited · profile default");
    expect(view.textContent).toContain(
      "Changes the prompt for every new session with this profile.",
    );

    stub.script(reply("Fine."));
    await next.send();
    // This session sends it, and new sessions start with it.
    expect(messages(stub.received[0])[0]?.content).toBe("Plan in lists.");
    expect(defaults.get(profile.name, "plan").systemPrompt).toBe(
      "Plan in lists.",
    );
    const fresh = await startSession("t");
    expect(fresh.systemPrompt).toBe("Plan in lists.");
    // The prose role's default is its own.
    expect(defaults.get(profile.name, "prose").systemPrompt).toBe(
      defaultSystemPrompt("prose"),
    );
  });

  test("a model edit as the profile default is sent, and new sessions ask for it", async () => {
    const session = await startSession("s");
    const next = await composeNext(session, "Hello.");
    const { view } = next;
    type(modelField(view), "big-model");
    click(
      [...view.querySelectorAll("input[type=radio]")].find(
        (input) => input.parentElement?.textContent === "Profile default",
      ),
    );
    expect(view.textContent).toContain(
      "Changes the model and sampler for every new session with this profile.",
    );
    stub.script(reply("Fine."), reply("Also fine."));
    await next.send();
    expect(stub.received[0]?.model).toBe("big-model");
    const fresh = await startSession("t");
    expect(fresh.model).toBe("big-model");
    await value(runner.send("t", "Hi."));
    expect(stub.received[1]?.model).toBe("big-model");

    // Emptied, the field goes back to the profile's model, here and as default.
    const back = await composeNext(fresh, "Again.");
    expect((modelField(back.view) as HTMLInputElement).value).toBe("big-model");
    type(modelField(back.view), "");
    click(
      [...back.view.querySelectorAll("input[type=radio]")].find(
        (input) => input.parentElement?.textContent === "Profile default",
      ),
    );
    stub.script(reply("Back."));
    await back.send();
    expect(stub.received[2]?.model).toBe("m");
    expect(defaults.get(profile.name, "plan").model).toBeUndefined();
  });

  test("a sampler that isn't a JSON object, or that sets the model, can't be sent; discarding restores it", async () => {
    const session = await startSession("s");
    const { view, base } = await composeNext(session, "Hello.");
    type(samplerField(view), "{ nope");
    expect(view.querySelector("[role=alert]")?.textContent).toContain(
      "not valid JSON",
    );
    type(samplerField(view), '{ "model": "x" }');
    expect(view.querySelector("[role=alert]")?.textContent).toBe(
      "Name the model in its own field, not in the sampler.",
    );
    type(samplerField(view), '{ "stream": true }');
    expect(view.querySelector("[role=alert]")?.textContent).toContain(
      'can\'t set "stream"',
    );
    click(view.querySelector(".context-viewer-discard"));
    expect(view.querySelector("[role=alert]")).toBeNull();
    expect((samplerField(view) as HTMLTextAreaElement).value).toBe(
      nextTurnDraft(base).sampler,
    );
  });
});

describe("the next turn's context", () => {
  test("an edit is sent for that turn only, and kept with it as a revision", async () => {
    const session = await startSession("s");
    const first = await composeNext(session, "Look.");
    const { view, base } = first;
    const assembled = packetText(base.packet);
    expect((field(view, "Context packet") as HTMLTextAreaElement).value).toBe(
      assembled,
    );
    expect(view.textContent).toContain(
      "Edits apply to the next turn only and are kept with it as a revision.",
    );
    const sections = [
      ...view.querySelectorAll('[aria-label="Context sections"] li'),
    ].map((li) => li.textContent);
    expect(sections[0]).toMatch(/^Premise · 1 line$/);

    const edited = `${assembled}\n\n## The writer adds\n\nThe lamp is out.`;
    type(field(view, "Context packet"), edited);
    expect(foldLine(view, "context")).toContain("edited");
    stub.script(reply("Noted."), reply("Again."));
    await first.send();
    expect(messages(stub.received[0])[1]?.content).toBe(
      `${edited}\n\n# The writer says\n\nLook.`,
    );

    // The next turn starts from a fresh packet, unedited.
    const after = (await value(loadSessionLog(storage, "s"))).session;
    const second = await composeNext(after, "And now?");
    expect(
      (field(second.view, "Context packet") as HTMLTextAreaElement).value,
    ).toBe(assembled);
    await second.send();
    expect(messages(stub.received[1])[3]?.content).toBe(
      `${assembled}\n\n# The writer says\n\nAnd now?`,
    );

    // The log keeps the edit on its turn, beside the packet it came from.
    const log = await value(loadSessionLog(storage, "s"));
    expect(log.session.runs[0]).toMatchObject({
      context: base.packet,
      editedContext: edited,
    });
    expect(log.session.runs[1]?.editedContext).toBeUndefined();

    // The first turn's slip shows the edit as sent.
    const [turn] = sessionTurns(log);
    if (turn === undefined) throw new Error("no turn");
    const past = render(
      <ContextViewer
        kind="turn"
        title="Turn 1"
        turn={turn}
        onOpen={() => {}}
      />,
    );
    expect(past.textContent).toContain(
      "The writer edited this turn's context before it was sent.",
    );
    expect(foldLine(past, "context")).toContain("edited · as sent");
    expect(
      past.querySelector('[data-role="context"] [role="document"]')
        ?.textContent,
    ).toBe(edited);
    // A record: nothing in it can be edited.
    expect(past.querySelector("textarea")).toBeNull();
  });
});

/** Runs one turn that shows, orders events against the story, and traces. */
async function multiToolTurn() {
  await startSession("s");
  stub.script(
    toolCalls(
      { name: "show", args: { ref: "actor:mara" } },
      {
        name: "constrain",
        args: { id: "tide-first", a: "tide", relation: "before", b: "storm" },
      },
      { name: "trace", args: { ref: "event:storm" } },
    ),
    reply("The tide now comes first; the storm's scenes may need a look."),
  );
  await value(runner.send("s", "Put the tide before the storm."));
  const log = await value(loadSessionLog(storage, "s"));
  const [turn] = sessionTurns(log);
  if (turn === undefined) throw new Error("no turn");
  return turn;
}

describe("a past turn", () => {
  test("lists each tool call with its arguments and result", async () => {
    const turn = await multiToolTurn();
    const view = render(
      <ContextViewer
        kind="turn"
        title="Turn 1"
        turn={turn}
        profileLabel="Stub model"
        onOpen={() => {}}
      />,
    );
    expect(view.querySelector(".request-slip-title")?.textContent).toBe(
      "Turn 1",
    );
    expect(view.textContent).toContain(`Stub model · chat · ${target.url}`);
    expect(foldLine(view, "system")).toContain("as sent");
    expect(foldLine(view, "parameters")).toContain("as sent");

    const calls = [...view.querySelectorAll(".slip-trace > li")];
    expect(
      calls.map((c) => c.querySelector(".slip-call-ordinal")?.textContent),
    ).toEqual(["1", "2", "3"]);
    expect(
      calls.map((c) => c.querySelector(".slip-call-name")?.textContent),
    ).toEqual(["show", "constrain", "trace"]);
    expect(calls[0]?.querySelector(".slip-call-args")?.textContent).toBe(
      "ref: actor:mara",
    );
    for (const call of calls) {
      expect(call.querySelector(".slip-call-state")?.textContent).toMatch(
        /^\d+ ms$/,
      );
    }

    // Opened: the arguments, what the result names, then the result.
    const constrain = calls[1];
    click(constrain?.querySelector("summary"));
    expect(constrain?.querySelector("details")?.open).toBe(true);
    expect(
      JSON.parse(
        constrain?.querySelector('[data-part="arguments"]')?.textContent ?? "",
      ),
    ).toEqual({ id: "tide-first", a: "tide", relation: "before", b: "storm" });
    const result = JSON.parse(
      constrain?.querySelector('[data-part="result"]')?.textContent ?? "",
    );
    expect(result).toMatchObject({ ok: true, kind: "mutation" });
    // It wrote a constraint, which no ref names: listed, not a link.
    expect(
      [...(constrain?.querySelectorAll(".slip-refs li") ?? [])].map(
        (r) => r.textContent,
      ),
    ).toEqual(["constraint/tide-first"]);
    // The trace names what it suspects, as references.
    const trace = calls[2];
    click(trace?.querySelector("summary"));
    expect(
      trace?.querySelectorAll(".slip-refs .slip-reference").length,
    ).toBeGreaterThan(0);

    // The contradiction the edit kept, as story material.
    const kept = [
      ...view.querySelectorAll('[aria-label="Kept contradictions"] li'),
    ];
    expect(kept).toHaveLength(1);
    expect(kept[0]?.querySelector(".slip-row-kind")?.textContent).toBe(
      "Timeline",
    );
    expect(kept[0]?.textContent).toContain("tide-first");
    expect(kept[0]?.querySelector(".slip-row-meta")?.textContent).toBe("kept");

    // Nothing in the slip is AI prose.
    expect(view.innerHTML).not.toContain("ai-segment");
  });

  test("a query's result names its records as references to follow", async () => {
    const turn = await multiToolTurn();
    const opened: Reference[] = [];
    const view = render(
      <ContextViewer
        kind="turn"
        title="Turn 1"
        turn={turn}
        onOpen={(reference) => opened.push(reference)}
      />,
    );
    const show = view.querySelectorAll(".slip-trace > li")[0];
    click(show?.querySelector("summary"));
    const links = [
      ...(show?.querySelectorAll(".slip-refs .slip-reference") ?? []),
    ];
    expect(links.map((link) => link.textContent)).toEqual(["actor:mara"]);
    click(links[0]);
    expect(opened).toEqual([{ kind: "record", ref: "actor:mara" }]);
  });

  test("following a trace suspect opens it, and the slip stays", async () => {
    const turn = await multiToolTurn();
    const opened: Reference[] = [];
    const view = render(
      <ContextViewer
        kind="turn"
        title="Turn 1"
        turn={turn}
        onOpen={(reference) => opened.push(reference)}
        describe={(reference) =>
          reference.kind === "record"
            ? `Record ${reference.ref}`
            : reference.scene
        }
      />,
    );
    const expected = traceSuspects(turnTrace(turn));
    expect(expected.length).toBeGreaterThan(0);
    const rows = [
      ...view.querySelectorAll('[aria-label="Touched by this change"] li'),
    ];
    expect(rows).toHaveLength(expected.length);
    const first = expected[0];
    if (first === undefined) throw new Error("no suspect");
    expect(rows[0]?.querySelector(".slip-row-reason")?.textContent).toBe(
      first.reasons.join("; "),
    );
    click(rows[0]?.querySelector(".slip-reference"));
    expect(opened).toEqual([first.target]);
    expect(view.querySelector(".agent-slip")).not.toBeNull();
  });

  test("a refused call reads failed, and a call awaiting approval reads waiting", async () => {
    await value(
      runner.start({
        id: "s",
        role: "plan",
        scope: world,
        approveMutations: true,
      }),
    );
    stub.script(
      toolCalls({ name: "nonsense", args: {} }),
      toolCalls({
        name: "constrain",
        args: { id: "c", a: "tide", relation: "after", b: "storm" },
      }),
    );
    await value(runner.send("s", "Try."));
    const [turn] = sessionTurns(await value(loadSessionLog(storage, "s")));
    if (turn === undefined) throw new Error("no turn");
    const view = render(
      <ContextViewer
        kind="turn"
        title="Turn 1"
        turn={turn}
        onOpen={() => {}}
      />,
    );
    const states = [...view.querySelectorAll(".slip-call-state")].map(
      (s) => s.textContent,
    );
    expect(states).toEqual(["failed", "waiting"]);
    const failed = view.querySelector(".slip-call[data-state=failed]");
    expect(
      failed?.querySelector(".context-viewer-problem")?.textContent,
    ).toContain("nonsense is not a tool of this session");

    // While the run goes on, the call it is on reads running.
    render(
      <ContextViewer
        kind="turn"
        title="Turn 1"
        turn={turn}
        running
        onOpen={() => {}}
      />,
    );
    expect(
      [...view.querySelectorAll(".slip-call-state")].map((s) => s.textContent),
    ).toEqual(["failed", "running"]);
  });
});
