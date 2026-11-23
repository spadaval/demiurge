import { describe, expect, test } from "bun:test";
import { createFetchTransport, type FetchLike } from "./transport";

const transport = (fetch: FetchLike) =>
  createFetchTransport({ worldId: "default", fetch });

describe("fetch transport", () => {
  test("posts to the world's route with the Access cookie", async () => {
    const calls: [string, RequestInit][] = [];
    const result = await transport(async (url, init) => {
      calls.push([url, init]);
      return Response.json({ changes: [], cursor: 0, more: false });
    }).pull({ since: 0 });
    expect(result._unsafeUnwrap()).toEqual({
      changes: [],
      cursor: 0,
      more: false,
    });
    expect(calls[0]?.[0]).toBe("/api/sync/default/pull");
    expect(calls[0]?.[1]).toMatchObject({
      method: "POST",
      credentials: "same-origin",
      redirect: "manual",
      body: '{"since":0}',
    });
  });

  test("reads an Access redirect or sign-in page as signed out", async () => {
    const redirected = await transport(
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: "/cdn-cgi/access/login" },
        }),
    ).pull({ since: 0 });
    expect(redirected._unsafeUnwrapErr()).toEqual({ kind: "signed_out" });
    const page = await transport(
      async () =>
        new Response("<html>Sign in</html>", {
          headers: { "content-type": "text/html" },
        }),
    ).pull({ since: 0 });
    expect(page._unsafeUnwrapErr()).toEqual({ kind: "signed_out" });
  });

  test("reports the Worker's error message, a network failure, and a malformed answer", async () => {
    const refused = await transport(async () =>
      Response.json({ error: "no Access token" }, { status: 403 }),
    ).pull({ since: 0 });
    expect(refused._unsafeUnwrapErr()).toEqual({
      kind: "http",
      status: 403,
      message: "no Access token",
    });
    const offline = await transport(async () => {
      throw new TypeError("Failed to fetch");
    }).pull({ since: 0 });
    expect(offline._unsafeUnwrapErr()).toEqual({
      kind: "network",
      message: "Failed to fetch",
    });
    const malformed = await transport(async () =>
      Response.json({ cursor: "x" }),
    ).pull({
      since: 0,
    });
    expect(malformed._unsafeUnwrapErr()).toMatchObject({ kind: "protocol" });
  });

  test("refuses push results that don't match what was pushed", async () => {
    const result = await transport(async () =>
      Response.json({
        results: [
          {
            status: "accepted",
            collection: "documents",
            key: "other",
            serverRev: 1,
            syncedAt: 1,
          },
        ],
      }),
    ).push({
      deviceId: "d",
      changes: [
        {
          collection: "documents",
          key: "d1",
          baseRev: 0,
          record: { id: "d1", title: "", content: [], updatedAt: 1 },
          deletedAt: null,
        },
      ],
    });
    expect(result._unsafeUnwrapErr()).toMatchObject({
      kind: "protocol",
      error: { path: "results[0]" },
    });
  });
});
