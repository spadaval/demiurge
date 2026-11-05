/**
 * Grok as a judge (worldcrafter-w716): the Grok Build CLI, headless, in the
 * same bubblewrap sandbox as the Claude judges. The sandbox's home is a
 * fresh tmpfs holding only `~/.grok/auth.json` (read-only: the host's own
 * Grok sessions depend on it) and a config the runner writes, so none of
 * the host's memory, sessions, config, skills or plugins is there. The
 * access token is refreshed on the host before a session, never inside one.
 * See README.md beside this file.
 */

import { mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import {
  BIN,
  SANDBOX_HOME,
  systemMounts,
  workdirAndEnv,
} from "../comparison/sandbox";
import type { Finding } from "../comparison/transcript";

/** The model `grok models` lists for Grok 4.7. */
export const GROK_MODEL = "grok-4.7";
/**
 * The models a Grok 4.7 session may report in its usage: the CLI serves
 * `grok-4.7` as `grok-4.7-build` (seen in every probe). `grok-4.7-build-fast`,
 * a different model, isn't accepted.
 */
export const GROK_ANSWERING = ["grok-4.7", "grok-4.7-build"] as const;
/** Read the inputs; the report is the final reply. */
export const GROK_TOOLS = ["read_file"] as const;
/**
 * The MCP discovery tools Grok offers even with `--tools read_file`
 * (`use_tool` is a gateway to tools behind it); removed explicitly. Seen:
 * with this, `available_commands` lists `read_file` alone.
 */
export const GROK_DISALLOWED = ["search_tool", "use_tool"] as const;
const WRITERS = new Set(["write", "search_replace"]);

export function grokBinary(): string {
  return `${process.env.HOME ?? ""}/.grok/bin/grok`;
}

export function grokAuthPath(): string {
  return `${process.env.HOME ?? ""}/.grok/auth.json`;
}

/**
 * The runner's own `~/.grok/config.toml` for the sandbox: no auto-update.
 * The host's config (default model, marketplace sources) stays out.
 */
export const GROK_CONFIG = "[cli]\nauto_update = false\n";

/**
 * Environment for a sandboxed session: no cross-session memory, telemetry,
 * feedback, subagents or web fetch, and no proactive token refresh (it
 * couldn't write auth.json anyway; the host refreshes before the run).
 */
export const GROK_ENV: Record<string, string> = {
  USER: "judge",
  LANG: "C.UTF-8",
  GROK_MEMORY: "0",
  GROK_TELEMETRY_ENABLED: "0",
  GROK_FEEDBACK_ENABLED: "0",
  GROK_SUBAGENTS: "0",
  GROK_WEB_FETCH: "0",
  GROK_AUTH_EARLY_INVALIDATION_SECS: "0",
};

/**
 * bwrap's options for one Grok session. The home is a writable tmpfs
 * (Grok won't start if it can't create a session there; it is discarded
 * afterwards) holding only the read-only credentials and `configPath`, the
 * runner's config. `grok` itself is mounted read-only.
 */
export function grokSandboxArgs({
  workdir,
  configPath,
  grok = grokBinary(),
  auth = grokAuthPath(),
}: {
  workdir: string;
  configPath: string;
  grok?: string;
  auth?: string;
}): string[] {
  return [
    ...systemMounts(),
    "--dir",
    `${SANDBOX_HOME}/.grok`,
    "--ro-bind",
    auth,
    `${SANDBOX_HOME}/.grok/auth.json`,
    "--ro-bind",
    configPath,
    `${SANDBOX_HOME}/.grok/config.toml`,
    "--ro-bind",
    realpathSync(grok),
    `${BIN}/grok`,
    ...workdirAndEnv(workdir, GROK_ENV),
  ];
}

/** `grok`'s flags after the prompt, for one judge session. */
export function grokArgs(maxTurns: number): string[] {
  return [
    "-m",
    GROK_MODEL,
    "--output-format",
    "streaming-json",
    "--tools",
    GROK_TOOLS.join(","),
    "--disallowed-tools",
    GROK_DISALLOWED.join(","),
    "--disable-web-search",
    "--no-subagents",
    "--permission-mode",
    "bypassPermissions",
    "--max-turns",
    String(maxTurns),
  ];
}

// ---------------------------------------------------------------------------
// The access token.

/**
 * When the earliest access token in `auth.json` expires, in milliseconds
 * since the epoch. Reads only the `expires_at` fields.
 */
export function grokTokenExpiresAt(path = grokAuthPath()): number {
  const data: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (typeof data !== "object" || data === null) {
    throw new Error(`${path} isn't a JSON object.`);
  }
  const times = Object.values(data).map((entry: unknown) => {
    const at =
      typeof entry === "object" && entry !== null
        ? Reflect.get(entry, "expires_at")
        : undefined;
    return typeof at === "string" ? Date.parse(at) : Number.NaN;
  });
  if (times.length === 0 || times.some(Number.isNaN)) {
    throw new Error(`${path} has an entry with no readable expires_at.`);
  }
  return Math.min(...times);
}

export type GrokTokenSource = {
  expiresAt: () => number;
  now: () => number;
  /** Refreshes on the host if the token expires within `withinSeconds`. */
  refresh: (withinSeconds: number) => void;
  log: (message: string) => void;
};

/**
 * Makes sure Grok's access token outlives the next step by `neededMs`, so a
 * sandboxed session never needs to refresh it. Grok refreshes a token that
 * expires within GROK_AUTH_EARLY_INVALIDATION_SECS, so a one-line session on
 * the host with that set past the step refreshes it at once, with no wait.
 */
export function ensureGrokToken(
  neededMs: number,
  token: GrokTokenSource,
): void {
  const fresh = () => token.expiresAt() - token.now() > neededMs;
  if (fresh()) return;
  token.log("Refreshing Grok's access token on the host.");
  token.refresh(Math.ceil(neededMs / 1000) + 600);
  if (!fresh()) {
    throw new Error(
      "Grok's access token would expire during the next step and didn't refresh.",
    );
  }
}

/** A one-line `grok -p` on the host, which refreshes the token. */
export function refreshGrokOnHost(withinSeconds: number): void {
  const dir = mkdtempSync(join(tmpdir(), "grok-refresh."));
  try {
    Bun.spawnSync(
      [
        grokBinary(),
        "-p",
        "Reply with ok.",
        "-m",
        GROK_MODEL,
        "--tools",
        "read_file",
        "--no-subagents",
        "--disable-web-search",
        "--max-turns",
        "1",
      ],
      {
        cwd: dir,
        env: {
          ...process.env,
          GROK_MEMORY: "0",
          GROK_AUTH_EARLY_INVALIDATION_SECS: String(withinSeconds),
        },
        stdout: "ignore",
        stderr: "ignore",
      },
    );
  } finally {
    rmSync(dir, { recursive: true });
  }
}

export const hostGrokToken: GrokTokenSource = {
  expiresAt: () => grokTokenExpiresAt(),
  now: () => Date.now(),
  refresh: refreshGrokOnHost,
  log: (message) => console.log(message),
};

// ---------------------------------------------------------------------------
// The transcript: `--output-format streaming-json`, one event per line.

export type GrokSummary = {
  /** Tools the session was offered, from its `available_commands` events. */
  toolsOffered: string[];
  toolCalls: number;
  /** The models that answered, from the `end` event's `modelUsage`. */
  models: string[];
  stopReason: string | undefined;
  numTurns: unknown;
  costUsd: unknown;
  /** Whether the `end` event arrived. */
  ended: boolean;
  outside: Finding[];
  unparsed: number;
};

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Every string path a tool call names: its input's path fields and its locations. */
function callPaths(event: Json): string[] {
  const paths: string[] = [];
  const input = event.rawInput;
  if (isObject(input)) {
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === "string" && /file|path|dir/i.test(key)) {
        paths.push(value);
      }
    }
  }
  if (Array.isArray(event.locations)) {
    for (const location of event.locations) {
      if (isObject(location) && typeof location.path === "string") {
        paths.push(location.path);
      }
    }
  }
  return paths;
}

/**
 * Reads a Grok transcript and reports any tool call outside `allowed` tools,
 * or naming a path outside `runDir` (or Grok's home or credentials). Tool
 * calls and their updates are both read, so a path that only shows in an
 * update still counts. It reports; it never blocks.
 */
export function checkGrokTranscript(
  jsonl: string,
  runDir: string,
  allowed: readonly string[] = GROK_TOOLS,
): GrokSummary {
  const inside = (path: string) => {
    const rel = relative(runDir, resolve(runDir, path));
    return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
  };
  const summary: GrokSummary = {
    toolsOffered: [],
    toolCalls: 0,
    models: [],
    stopReason: undefined,
    numTurns: undefined,
    costUsd: undefined,
    ended: false,
    outside: [],
    unparsed: 0,
  };
  const names = new Map<string, string>();
  for (const line of jsonl.split("\n")) {
    if (line.trim() === "") continue;
    let event: unknown;
    try {
      event = JSON.parse(line);
    } catch {
      summary.unparsed++;
      continue;
    }
    if (!isObject(event)) continue;
    if (event.type === "available_commands" && Array.isArray(event.tools)) {
      for (const tool of event.tools) {
        if (typeof tool === "string" && !summary.toolsOffered.includes(tool)) {
          summary.toolsOffered.push(tool);
          if (!allowed.includes(tool)) {
            summary.outside.push({
              tool,
              detail: "offered a tool the judge wasn't given",
            });
          }
        }
      }
    } else if (
      event.type === "tool_call" ||
      event.type === "tool_call_update"
    ) {
      const id = typeof event.toolCallId === "string" ? event.toolCallId : "";
      if (event.type === "tool_call") {
        summary.toolCalls++;
        const name =
          typeof event.toolName === "string" ? event.toolName : "(unnamed)";
        names.set(id, name);
        if (!allowed.includes(name)) {
          summary.outside.push({
            tool: name,
            detail: `a tool the judge wasn't given: ${JSON.stringify(event.rawInput ?? null)}`,
          });
        }
      }
      const name = names.get(id) ?? "(unknown call)";
      for (const path of callPaths(event)) {
        if (
          path.startsWith("~") ||
          !inside(path) ||
          /\.grok|auth\.json|credentials/.test(path)
        ) {
          summary.outside.push({
            tool: WRITERS.has(name) ? `${name} (write)` : name,
            detail: path,
          });
        }
      }
    } else if (event.type === "end") {
      summary.ended = true;
      summary.stopReason =
        typeof event.stopReason === "string" ? event.stopReason : undefined;
      summary.numTurns = event.num_turns;
      summary.costUsd = event.total_cost_usd;
      if (isObject(event.modelUsage)) {
        summary.models = Object.keys(event.modelUsage);
      }
    }
  }
  // A call's path shows in both the call and its updates; report it once.
  const seen = new Set<string>();
  summary.outside = summary.outside.filter((f) => {
    const key = `${f.tool}\0${f.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return summary;
}

/** Why a Grok transcript shows the session didn't finish on Grok 4.7. */
export function grokModelProblems(summary: GrokSummary): string[] {
  const problems: string[] = [];
  if (!summary.ended) problems.push("no end event: the session didn't finish");
  else if (summary.stopReason !== "end_turn") {
    problems.push(`stopped with ${summary.stopReason ?? "no stop reason"}`);
  }
  if (summary.ended && summary.models.length === 0) {
    problems.push("the end event names no model");
  }
  const others = summary.models.filter(
    (m) => !(GROK_ANSWERING as readonly string[]).includes(m),
  );
  if (others.length > 0) problems.push(`answered by ${others.join(", ")}`);
  return problems;
}
