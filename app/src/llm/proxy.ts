/**
 * The contract between the LLM client and the Worker's inference proxy
 * (`worker/proxy.ts`), shared by both. A proxied profile's requests go to
 * the Worker that serves the app, under `/api/llm/`, naming the server they
 * are for in `UPSTREAM_HEADER`; the Worker forwards them only to an upstream
 * it is configured for, with that upstream's key from its own secrets. The
 * browser then holds no key, and a phone reaches a server that doesn't
 * allow cross-origin requests.
 *
 * Imports here are relative: the Worker bundles this file on its own.
 */

import type { LlmRequest } from "./types";

export const LLM_PROXY_PREFIX = "/api/llm/";

/** The base URL (with its version segment) the request is for. */
export const UPSTREAM_HEADER = "X-Demiurge-Upstream";

/** The OpenAI-compatible paths below a base URL the proxy forwards. */
export const PROXY_PATHS: Readonly<Record<LlmRequest["endpoint"], string>> = {
  chat: "chat/completions",
  completion: "completions",
};

/** A base URL as the client and the Worker compare it. */
export const normalizeBaseUrl = (url: string) => url.trim().replace(/\/+$/, "");

/** Where a proxied request to `endpoint` goes, relative to the app's origin. */
export const proxyUrl = (endpoint: LlmRequest["endpoint"]) =>
  LLM_PROXY_PREFIX + PROXY_PATHS[endpoint];
