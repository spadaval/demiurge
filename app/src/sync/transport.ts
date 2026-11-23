/**
 * Reaches the sync Worker over HTTP. The app and the Worker share an origin
 * behind Cloudflare Access, so the browser sends the Access cookie itself.
 * When the Access session has ended, Access answers with a redirect to its
 * sign-in page; that reads as `signed_out` rather than as a protocol error.
 */

import { errAsync, okAsync, type Result, ResultAsync } from "neverthrow";
import type { SyncError, SyncTransport } from "./client";
import {
  checkPullResponse,
  checkPushResponse,
  type ProtocolError,
  SYNC_API_PREFIX,
  WORLD_ID_PATTERN,
} from "./protocol";

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export interface FetchTransportOptions {
  readonly worldId: string;
  readonly fetch: FetchLike;
  /** Prefixes the API path; empty for the page's own origin. */
  readonly origin?: string;
}

export function createFetchTransport({
  worldId,
  fetch,
  origin = "",
}: FetchTransportOptions): SyncTransport {
  if (!WORLD_ID_PATTERN.test(worldId)) {
    throw new Error(`world ID ${JSON.stringify(worldId)} can't be synced`);
  }
  const post = <T>(
    operation: "pull" | "push",
    body: unknown,
    check: (value: unknown) => Result<T, ProtocolError>,
  ): ResultAsync<T, SyncError> =>
    ResultAsync.fromPromise(
      fetch(`${origin}${SYNC_API_PREFIX}${worldId}/${operation}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        credentials: "same-origin",
        redirect: "manual",
      }),
      (cause): SyncError => ({
        kind: "network",
        message: cause instanceof Error ? cause.message : String(cause),
      }),
    ).andThen((response) => {
      if (
        response.type === "opaqueredirect" ||
        (response.status >= 300 && response.status < 400)
      ) {
        return errAsync<T, SyncError>({ kind: "signed_out" });
      }
      return ResultAsync.fromPromise(
        response.text(),
        (cause): SyncError => ({
          kind: "network",
          message: cause instanceof Error ? cause.message : String(cause),
        }),
      ).andThen((text) => {
        let value: unknown;
        try {
          value = JSON.parse(text);
        } catch {
          value = undefined;
        }
        if (!response.ok) {
          const message =
            typeof value === "object" &&
            value !== null &&
            "error" in value &&
            typeof value.error === "string"
              ? value.error
              : text.slice(0, 200);
          return errAsync<T, SyncError>({
            kind: "http",
            status: response.status,
            message,
          });
        }
        if (value === undefined) {
          // Access serves its sign-in page with 200 on some paths.
          return errAsync<T, SyncError>(
            response.headers.get("content-type")?.includes("text/html")
              ? { kind: "signed_out" }
              : {
                  kind: "protocol",
                  error: { path: "(root)", reason: "not JSON" },
                },
          );
        }
        const checked = check(value);
        return checked.isOk()
          ? okAsync<T, SyncError>(checked.value)
          : errAsync<T, SyncError>({ kind: "protocol", error: checked.error });
      });
    });

  return {
    pull: (request) => post("pull", request, checkPullResponse),
    push: (request) =>
      post("push", request, (value) =>
        checkPushResponse(value, request.changes),
      ),
  };
}
