/**
 * The sync Worker run in-process for tests: each world's Durable Object gets
 * its own in-memory `bun:sqlite` database, which stands in for a Durable
 * Object's SQLite storage (same SQL dialect, synchronous calls).
 */

import { Database } from "bun:sqlite";
import type { AccessVerifier } from "./access";
import {
  type DurableObjectNamespace,
  type DurableObjectState,
  type Env,
  type Fetcher,
  handleRequest,
  SyncWorld,
} from "./index";
import type { SqlRunner, SqlValue } from "./ledger";
import type { UpstreamFetch } from "./proxy";

export function sqliteState(db = new Database(":memory:")): DurableObjectState {
  const sql: SqlRunner = {
    exec: (query: string, ...bindings: SqlValue[]) =>
      db.query<Record<string, unknown>, SqlValue[]>(query).iterate(...bindings),
  };
  return {
    storage: {
      sql,
      transactionSync: <T>(work: () => T): T => db.transaction(work)(),
    },
  };
}

/** A Durable Object namespace that makes a `SyncWorld` per name. */
export function fakeNamespace(): DurableObjectNamespace & {
  readonly worlds: Map<string, SyncWorld>;
} {
  const worlds = new Map<string, SyncWorld>();
  return {
    worlds,
    idFromName: (name) => name,
    get: (id): Fetcher => {
      const name = String(id);
      let world = worlds.get(name);
      if (world === undefined) {
        world = new SyncWorld(sqliteState(), fakeEnv());
        worlds.set(name, world);
      }
      const found = world;
      return { fetch: (request) => found.fetch(request) };
    },
  };
}

function fakeEnv(namespace?: DurableObjectNamespace): Env {
  return {
    ASSETS: { fetch: async () => new Response("asset") },
    SYNC_WORLDS: namespace ?? {
      idFromName: (name) => name,
      get: () => ({ fetch: async () => new Response(null, { status: 500 }) }),
    },
  };
}

export const allowAll: AccessVerifier = async () => ({
  ok: true,
  subject: "writer@example.com",
});

/**
 * A `fetch` that reaches an in-process Worker. `vars` are laid over its
 * environment (variables and secrets, such as `LLM_UPSTREAMS`), and
 * `fetchUpstream` answers what the inference proxy sends on.
 */
export function inProcessWorker(
  verify: AccessVerifier | null = allowAll,
  {
    vars = {},
    fetchUpstream = async () => new Response(null, { status: 599 }),
  }: {
    vars?: Record<string, unknown>;
    fetchUpstream?: UpstreamFetch;
  } = {},
): {
  readonly fetch: (url: string, init: RequestInit) => Promise<Response>;
  readonly env: Env;
} {
  const env: Env = { ...vars, ...fakeEnv(fakeNamespace()) };
  return {
    env,
    fetch: async (url, init) =>
      disconnectOnAbort(
        await handleRequest(
          new Request(new URL(url, "https://app.test"), init),
          env,
          verify,
          fetchUpstream,
        ),
        init.signal ?? null,
      ),
  };
}

/**
 * `response` as a real `fetch` gives it: aborting `signal` first rejects,
 * and aborting it later errors the body
 * the client reads and cancels the Worker's, as a client disconnecting does.
 */
function disconnectOnAbort(
  response: Response,
  signal: AbortSignal | null,
): Response {
  // A real fetch aborted before its answer rejects instead.
  signal?.throwIfAborted();
  if (signal === null || response.body === null) return response;
  const pipe = new TransformStream<Uint8Array, Uint8Array>();
  response.body.pipeTo(pipe.writable, { signal }).catch(() => undefined);
  return new Response(pipe.readable, response);
}
