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

/** A `fetch` that reaches an in-process Worker. */
export function inProcessWorker(verify: AccessVerifier = allowAll): {
  readonly fetch: (url: string, init: RequestInit) => Promise<Response>;
  readonly env: Env;
} {
  const env = fakeEnv(fakeNamespace());
  return {
    env,
    fetch: (url, init) =>
      handleRequest(
        new Request(new URL(url, "https://app.test"), init),
        env,
        verify,
      ),
  };
}
