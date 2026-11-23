/**
 * The Cloudflare Worker (`app/wrangler.jsonc`): serves the built app from
 * `./dist` and the sync API under `/api/sync/` (`src/sync/protocol.ts`).
 * Each world's records live in its own Durable Object (`SyncWorld`), which
 * runs one request at a time, so pushes to a world never interleave.
 *
 * The sync API answers only requests that carry a valid Cloudflare Access
 * token (`access.ts`). `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` name the Access
 * application; while either is unset the API refuses every request.
 *
 * Imports here are relative: Wrangler bundles this file on its own.
 */

import {
  checkPullRequest,
  checkPushRequest,
  type ProtocolError,
  SYNC_API_PREFIX,
  WORLD_ID_PATTERN,
} from "../sync/protocol";
import { type AccessVerifier, createAccessVerifier } from "./access";
import { type Ledger, openLedger, type SqlRunner } from "./ledger";

/** The parts of the Workers runtime types this Worker uses. */
export interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

export interface DurableObjectNamespace {
  idFromName(name: string): unknown;
  get(id: unknown): Fetcher;
}

export interface DurableObjectState {
  readonly storage: {
    readonly sql: SqlRunner;
    transactionSync<T>(work: () => T): T;
  };
}

export interface Env {
  readonly ASSETS: Fetcher;
  readonly SYNC_WORLDS: DurableObjectNamespace;
  readonly ACCESS_TEAM_DOMAIN?: string;
  readonly ACCESS_AUD?: string;
}

type Operation = "pull" | "push";

const json = (body: unknown, status = 200) => Response.json(body, { status });
const refuse = (status: number, error: string) => json({ error }, status);

/** `/api/sync/<worldId>/<pull|push>`, or null for any other path. */
export function parseSyncPath(
  pathname: string,
): { worldId: string; operation: Operation } | null {
  if (!pathname.startsWith(SYNC_API_PREFIX)) return null;
  const [worldId, operation, ...rest] = pathname
    .slice(SYNC_API_PREFIX.length)
    .split("/");
  if (
    rest.length > 0 ||
    worldId === undefined ||
    !WORLD_ID_PATTERN.test(worldId) ||
    (operation !== "pull" && operation !== "push")
  ) {
    return null;
  }
  return { worldId, operation };
}

/**
 * Routes one request: static assets, or a sync call checked against Access
 * and handed to its world's Durable Object.
 */
export async function handleRequest(
  request: Request,
  env: Env,
  verify: AccessVerifier | null,
): Promise<Response> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
  if (verify === null) {
    return refuse(
      503,
      "sync is not configured: set ACCESS_TEAM_DOMAIN and ACCESS_AUD",
    );
  }
  const access = await verify(request);
  if (!access.ok) return refuse(403, access.reason);
  const route = parseSyncPath(url.pathname);
  if (route === null) return refuse(404, "no such sync route");
  if (request.method !== "POST") return refuse(405, "use POST");
  const world = env.SYNC_WORLDS.get(env.SYNC_WORLDS.idFromName(route.worldId));
  return world.fetch(
    new Request(`https://sync-world/${route.operation}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: await request.text(),
    }),
  );
}

const badRequest = (error: ProtocolError) =>
  refuse(400, `${error.path}: ${error.reason}`);

/** Answers one call to a world's ledger. */
export async function handleLedgerRequest(
  ledger: Ledger,
  request: Request,
): Promise<Response> {
  const operation = new URL(request.url).pathname.slice(1);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return refuse(400, "the body is not JSON");
  }
  if (operation === "pull") {
    const pull = checkPullRequest(body);
    return pull.isOk() ? json(ledger.pull(pull.value)) : badRequest(pull.error);
  }
  if (operation === "push") {
    const push = checkPushRequest(body);
    return push.isOk() ? json(ledger.push(push.value)) : badRequest(push.error);
  }
  return refuse(404, "no such operation");
}

/** One world's sync ledger, in a SQLite-backed Durable Object. */
export class SyncWorld {
  private readonly ledger: Ledger;

  constructor(ctx: DurableObjectState, _env: Env) {
    this.ledger = openLedger({
      sql: ctx.storage.sql,
      transaction: (work) => ctx.storage.transactionSync(work),
      now: Date.now,
    });
  }

  fetch(request: Request): Promise<Response> {
    return handleLedgerRequest(this.ledger, request);
  }
}

/** One verifier per isolate, so fetched Access keys are reused. */
let verifier: { key: string; verify: AccessVerifier } | null = null;

function verifierFor(env: Env): AccessVerifier | null {
  const teamDomain = env.ACCESS_TEAM_DOMAIN?.trim() ?? "";
  const audience = env.ACCESS_AUD?.trim() ?? "";
  if (teamDomain === "" || audience === "") return null;
  const key = `${teamDomain}\n${audience}`;
  if (verifier?.key !== key) {
    verifier = {
      key,
      verify: createAccessVerifier({
        teamDomain,
        audience,
        fetch: (url) => fetch(url),
        now: Date.now,
      }),
    };
  }
  return verifier.verify;
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env, verifierFor(env));
  },
};
