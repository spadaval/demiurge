/**
 * Scene prose generation fed by the story bible (worldcrafter-aq1r), against
 * a stub OpenAI-compatible server: the request a scene's document assembles
 * carries the story agent's scene context packet (`agent/context.ts`) as its
 * bible sections, exactly; what is stored is what is sent; an edited
 * request is sent as edited; pinned and excluded sections hold; and no
 * `[[ ... ]]` writer note reaches the server.
 */
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { errAsync, type ResultAsync } from "neverthrow";
import {
  buildContextPacket,
  packetText,
  SCENE_PROSE_SECTION,
} from "~/agent/context";
import { startStubLlm, streamed } from "~/agent/stub-llm";
import { BIBLE_NOTES, type SectionSelection } from "~/context/builder";
import { gatherBibleContext, gatherWorldContext } from "~/context/gather";
import { createRequestStore, type RequestStore } from "~/context/requests";
import type { BackendProfile, JsonObject } from "~/llm/types";
import { createMemoryStorage } from "~/storage/memory";
import type { StorageAdapter, StoredDocument } from "~/storage/types";
import documentsFile from "~/story/fixtures/lighthouse.documents.json";
import { executeStoryCommand, saveStory } from "~/story/store";
import { parseStory, type Story } from "~/story/story";
import { createTimelineStore } from "~/time/store";
import { createStorageConnection } from "~/workspace/connection";
import {
  type DocumentSession,
  openDocumentSession,
} from "~/workspace/document-session";
import { createWorldStore, directRenameDocument } from "~/world/store";
import { draftOf, requestFromDraft } from "./draft";
import { createGenerator, type Generator } from "./generator";

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

const drafter: BackendProfile = {
  name: "drafter",
  kind: "llamacpp",
  baseUrl: stub.url,
  model: "prose-finetune",
  sampler: { temperature: 0.9 },
};

/** The arrival scene's document, with a writer note in its last paragraph. */
const NOTE = "[[make the keeper colder here]]";
const documents: StoredDocument[] = documentsFile.map((record) =>
  record.id === "doc-arrival"
    ? {
        ...record,
        content: [
          ...record.content.filter((block) => block.type !== "placeholder"),
          {
            type: "p",
            id: "b_note",
            children: [{ text: `Mara let him in. ${NOTE} The lamp hissed.` }],
          },
        ],
      }
    : record,
);

let storage: StorageAdapter;
let session: DocumentSession;
let generator: Generator;
let requests: RequestStore;
let clock: number;

beforeEach(async () => {
  stub.reset();
  clock = 1000;
  const now = () => clock++;
  storage = createMemoryStorage();
  await value(saveStory(storage, fixture, 1000));
  await value(
    storage.batch(
      documents.map((record) => ({ kind: "saveDocument" as const, record })),
    ),
  );
  const world = createWorldStore(storage, {
    now,
    renameDocument: directRenameDocument(storage, now),
  });
  const time = createTimelineStore(storage, world, { now });
  const connection = createStorageConnection(storage, () =>
    errAsync({
      kind: "failure",
      operation: "open",
      message: "no reopen in this test",
      cause: null,
    }),
  );
  session = await value(
    openDocumentSession("doc-arrival", {
      connection,
      readOnly: false,
      now,
      saveDelayMs: 60_000,
      retryDelayMs: 60_000,
    }),
  );
  requests = createRequestStore(storage, { now });
  generator = createGenerator({
    session,
    storage,
    requests,
    gather: () => gatherWorldContext(world, time, "doc-arrival"),
    bible: () => gatherBibleContext(storage, "doc-arrival"),
    profile: (name) => (name === drafter.name ? drafter : undefined),
    now,
  });
});

afterEach(() => {
  session.dispose();
  storage.close();
});

const prepare = (sections?: SectionSelection) =>
  value(
    generator.prepare({
      after: null,
      profile: drafter.name,
      instruction: null,
      pins: [],
      layout: "chat",
      budget: { limit: 16_000 },
      ...(sections ? { sections } : {}),
    }),
  );

type Message = { role: string; content: string };
const messagesOf = (body: unknown) =>
  (body as { messages: Message[] }).messages;
const systemOf = (body: unknown) => messagesOf(body)[0]?.content ?? "";

/**
 * The arrival scene's packet as the story agent would read it, less its prose
 * and what it touches.
 */
const arrivalPacket = () =>
  value(
    buildContextPacket(
      storage,
      { kind: "scene", scene: "arrival" },
      { prose: false, touches: false },
    ),
  );

describe("a scene's prose request carries its story bible sections", () => {
  test("stored as assembled, sent as stored, with no writer notes", async () => {
    const assembled = await prepare();
    const packet = await arrivalPacket();

    // The same builder as the story agent's, minus the stored prose, which
    // the window from the open editor replaces, and what the scene touches.
    expect(packet.sections.map((s) => s.title)).toEqual([
      "The scene",
      "What the reader has been told before it",
      "Events it depicts",
      "People in it",
    ]);
    const full = await value(
      buildContextPacket(storage, { kind: "scene", scene: "arrival" }),
    );
    expect(full.sections.at(-1)?.title).toBe(SCENE_PROSE_SECTION);

    // The stored request holds those sections exactly, in the system message.
    const system = systemOf(assembled.request.body);
    expect(system).toContain(`${BIBLE_NOTES}\n\n${packetText(packet)}`);
    const bible = assembled.breakdown.bible;
    expect(bible?.scene).toBe("arrival");
    expect(bible?.cleared).toEqual([]);
    expect(bible?.sections.map((s) => [s.title, s.included])).toEqual(
      packet.sections.map((s) => [s.title, true]),
    );

    // Stored and loaded back, the breakdown and request are unchanged.
    const loaded = await value(requests.load(assembled.id));
    expect(loaded).toEqual(assembled);

    // The window is the open document's prose, with the note cut.
    const user = messagesOf(assembled.request.body)[1]?.content ?? "";
    expect(user).toContain("Mara let him in. The lamp hissed.");

    // Sent: the stub receives the stored request's body, exactly.
    stub.script(streamed(["The keeper ", "said nothing."]));
    const result = await value(generator.send(assembled.id));
    expect(result.outcome).toBe("complete");
    expect(stub.received).toHaveLength(1);
    expect(stub.received[0]).toEqual(assembled.request.body as JsonObject);

    // No writer note reaches the server.
    expect(JSON.stringify(stub.received)).not.toContain("[[");
    expect(JSON.stringify(stub.received)).not.toContain("colder");
  });

  test("an edited request is sent as edited, its bible text included", async () => {
    const assembled = await prepare();
    const draft = draftOf(assembled.request);
    if (draft.input?.kind !== "chat") throw new Error("expected chat");
    const system = draft.input.messages[0];
    if (!system) throw new Error("expected a system message");
    system.content = system.content.replace(
      "## People in it",
      "## People in it\n\nIvo is soaked through.",
    );
    const edited = requestFromDraft(assembled.request, draft)._unsafeUnwrap();

    stub.script(streamed(["Rain."]));
    const result = await value(generator.sendEdited(assembled.id, edited));
    expect(result.outcome).toBe("complete");
    expect(result.requestId).not.toBe(assembled.id);
    expect(stub.received[0]).toEqual(edited.body as JsonObject);
    expect(systemOf(stub.received[0])).toContain("Ivo is soaked through.");

    // The revision is stored as sent, and keeps to its root's breakdown.
    const revision = await value(requests.load(result.requestId));
    expect(revision.request).toEqual(edited);
    expect(revision).toMatchObject({
      origin: "revision",
      parentId: assembled.id,
    });
  });

  test("an excluded section is left out; a pinned one survives a tight budget", async () => {
    const without = await prepare({ pinned: [], excluded: ["People in it"] });
    const system = systemOf(without.request.body);
    expect(system).toContain("## The scene");
    expect(system).not.toContain("## People in it");
    expect(
      without.breakdown.bible?.sections.find((s) => s.title === "People in it"),
    ).toMatchObject({ excluded: true, included: false });

    // A budget with room for little more than the window's minimum: the
    // pinned section claims it first, ahead of the others.
    const loose = await prepare();
    const people = loose.breakdown.bible?.sections.find(
      (s) => s.title === "People in it",
    );
    if (!people) throw new Error("expected the people section");
    const base = await value(
      generator.prepare({
        after: null,
        profile: drafter.name,
        instruction: null,
        pins: [],
        layout: "chat",
        budget: { limit: 16_000 },
        sections: {
          pinned: [],
          excluded: loose.breakdown.bible?.sections.map((s) => s.title) ?? [],
        },
      }),
    );
    const limit =
      base.breakdown.budget.used + BIBLE_NOTES.length + people.size + 200;
    const tight = await value(
      generator.prepare({
        after: null,
        profile: drafter.name,
        instruction: null,
        pins: [],
        layout: "chat",
        budget: { limit },
        sections: { pinned: ["People in it"], excluded: [] },
      }),
    );
    const included = tight.breakdown.bible?.sections
      .filter((s) => s.included)
      .map((s) => s.title);
    expect(included).toEqual(["People in it"]);
    expect(systemOf(tight.request.body)).toContain("## People in it");
    expect(tight.breakdown.budget.used).toBeLessThanOrEqual(limit);

    // Unpinned, the same budget goes to the sections in packet order.
    const unpinned = await value(
      generator.prepare({
        after: null,
        profile: drafter.name,
        instruction: null,
        pins: [],
        layout: "chat",
        budget: { limit },
      }),
    );
    expect(
      unpinned.breakdown.bible?.sections.find((s) => s.title === "People in it")
        ?.included,
    ).toBe(false);
    expect(unpinned.breakdown.bible?.sections[0]?.included).toBe(true);

    stub.script(streamed(["Ok."]));
    await value(generator.send(tight.id));
    expect(stub.received[0]).toEqual(tight.request.body as JsonObject);
  });

  test("a pin for a section the bible no longer has is cleared, not an error", async () => {
    const assembled = await prepare({
      pinned: ["Old section", "The scene"],
      excluded: ["Gone too"],
    });
    expect(assembled.breakdown.bible?.cleared).toEqual([
      "Old section",
      "Gone too",
    ]);
    expect(
      assembled.breakdown.bible?.sections.find((s) => s.title === "The scene"),
    ).toMatchObject({ pinned: true, included: true });
  });

  test("the bible is read as it is now, and a document no scene holds has none", async () => {
    await value(
      executeStoryCommand(
        storage,
        { type: "setSceneDocument", id: "arrival", documentId: null },
        2000,
      ),
    );
    const assembled = await prepare({ pinned: ["The scene"], excluded: [] });
    expect(assembled.breakdown.bible).toBeUndefined();
    expect(systemOf(assembled.request.body)).not.toContain(BIBLE_NOTES);
  });
});
