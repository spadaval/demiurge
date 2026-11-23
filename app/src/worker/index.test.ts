import { describe, expect, test } from "bun:test";
import { handleRequest, parseSyncPath } from "./index";
import { allowAll, inProcessWorker } from "./testing";

const post = (path: string, body: unknown, method = "POST") =>
  new Request(`https://app.test${path}`, {
    method,
    ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
  });

describe("Worker routing", () => {
  test("parses sync paths and nothing else", () => {
    expect(parseSyncPath("/api/sync/default/pull")).toEqual({
      worldId: "default",
      operation: "pull",
    });
    expect(parseSyncPath("/api/sync/default/drop")).toBeNull();
    expect(parseSyncPath("/api/sync/../pull")).toBeNull();
    expect(parseSyncPath("/api/sync/default/pull/x")).toBeNull();
    expect(parseSyncPath("/index.html")).toBeNull();
  });

  test("serves everything outside /api/ from the assets", async () => {
    const { env } = inProcessWorker();
    const response = await handleRequest(
      post("/index.html", null, "GET"),
      env,
      null,
    );
    expect(await response.text()).toBe("asset");
  });

  test("refuses sync until Access is configured", async () => {
    const { env } = inProcessWorker();
    const response = await handleRequest(
      post("/api/sync/default/pull", { since: 0 }),
      env,
      null,
    );
    expect(response.status).toBe(503);
  });

  test("refuses a request Access did not let through", async () => {
    const { env } = inProcessWorker();
    const response = await handleRequest(
      post("/api/sync/default/pull", { since: 0 }),
      env,
      async () => ({ ok: false, reason: "no Access token" }),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "no Access token" });
  });

  test("answers 404, 405 and 400 for bad calls", async () => {
    const { env } = inProcessWorker();
    const call = (request: Request) => handleRequest(request, env, allowAll);
    expect((await call(post("/api/sync/bad%20id/pull", {}))).status).toBe(404);
    expect(
      (await call(post("/api/sync/default/pull", null, "GET"))).status,
    ).toBe(405);
    const bad = await call(post("/api/sync/default/pull", { since: -1 }));
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({
      error: "since: expected a non-negative integer",
    });
    const badPush = await call(
      post("/api/sync/default/push", {
        deviceId: "a",
        changes: [
          {
            collection: "snapshots",
            key: "1",
            baseRev: 0,
            record: null,
            deletedAt: 1,
          },
        ],
      }),
    );
    expect(badPush.status).toBe(400);
    const wrongKey = await call(
      post("/api/sync/default/push", {
        deviceId: "a",
        changes: [
          {
            collection: "documents",
            key: "d1",
            baseRev: 0,
            record: { id: "d2", title: "", content: [], updatedAt: 1 },
            deletedAt: null,
          },
        ],
      }),
    );
    expect(await wrongKey.json()).toEqual({
      error: "changes[0].record.id: expected the key d1",
    });
  });

  test("keeps each world apart", async () => {
    const { env } = inProcessWorker();
    const call = (request: Request) => handleRequest(request, env, allowAll);
    await call(
      post("/api/sync/one/push", {
        deviceId: "a",
        changes: [
          {
            collection: "outlines",
            key: "o",
            baseRev: 0,
            record: { id: "o", books: [], updatedAt: 1 },
            deletedAt: null,
          },
        ],
      }),
    );
    const one = await (
      await call(post("/api/sync/one/pull", { since: 0 }))
    ).json();
    const two = await (
      await call(post("/api/sync/two/pull", { since: 0 }))
    ).json();
    expect(one).toMatchObject({ cursor: 1 });
    expect(two).toEqual({ changes: [], cursor: 0, more: false });
  });
});
