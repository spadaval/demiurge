/**
 * Runs a session inside bubblewrap, so isolation doesn't rest on the prompt.
 * The session sees system directories read-only, its own run directory
 * read-write, a fresh home holding only the OAuth credentials (read-only:
 * the host's live sessions depend on that file), and, for tool
 * runs only, the frozen tool read-only at a neutral path. Everything else,
 * this repository, other runs, the key and the rest of /tmp, isn't there.
 */

import { existsSync, readFileSync, realpathSync } from "node:fs";

export const BWRAP = "/usr/bin/bwrap";
/** Where a tool run sees the frozen tool. */
export const TOOL_MOUNT = "/opt/story-tool";
/** The session's home: a fresh tmpfs. */
export const SANDBOX_HOME = "/home/writer";
const BIN = "/opt/bin";

export function credentialsPath(): string {
  return `${process.env.HOME ?? ""}/.claude/.credentials.json`;
}

/** When the OAuth access token expires, in milliseconds since the epoch. */
export function tokenExpiresAt(path = credentialsPath()): number {
  const data: unknown = JSON.parse(readFileSync(path, "utf8"));
  const expires =
    typeof data === "object" &&
    data !== null &&
    "claudeAiOauth" in data &&
    typeof data.claudeAiOauth === "object" &&
    data.claudeAiOauth !== null &&
    "expiresAt" in data.claudeAiOauth
      ? data.claudeAiOauth.expiresAt
      : undefined;
  if (typeof expires !== "number") {
    throw new Error(`${path} has no claudeAiOauth.expiresAt.`);
  }
  return expires;
}

export type SandboxInputs = {
  workdir: string;
  /** The frozen tool directory, for tool runs only. */
  toolDir?: string;
  claude: string;
  bun: string;
  env: Record<string, string>;
};

/**
 * bwrap's options for one session. They hold host paths, so they go to
 * bwrap through `--args <fd>` and never appear on its command line, which a
 * session could see with `ps`.
 */
export function sandboxArgs({
  workdir,
  toolDir,
  claude,
  bun,
  env,
}: SandboxInputs): string[] {
  const resolve = existsSync("/run/systemd/resolve")
    ? ["--ro-bind", "/run/systemd/resolve", "/run/systemd/resolve"]
    : [];
  return [
    "--unshare-all",
    "--share-net",
    "--die-with-parent",
    "--new-session",
    "--ro-bind",
    "/usr",
    "/usr",
    "--symlink",
    "usr/bin",
    "/bin",
    "--symlink",
    "usr/lib",
    "/lib",
    "--symlink",
    "usr/lib64",
    "/lib64",
    "--symlink",
    "usr/sbin",
    "/sbin",
    "--ro-bind",
    "/etc",
    "/etc",
    ...resolve,
    "--proc",
    "/proc",
    "--dev",
    "/dev",
    "--tmpfs",
    "/tmp",
    "--tmpfs",
    "/home",
    "--dir",
    `${SANDBOX_HOME}/.claude`,
    // Read-only: the host's own sessions depend on this file, and
    // ensureToken refreshes it on the host before each step.
    "--ro-bind",
    credentialsPath(),
    `${SANDBOX_HOME}/.claude/.credentials.json`,
    "--ro-bind",
    realpathSync(claude),
    `${BIN}/claude`,
    "--ro-bind",
    realpathSync(bun),
    `${BIN}/bun`,
    ...(toolDir === undefined ? [] : ["--ro-bind", toolDir, TOOL_MOUNT]),
    "--bind",
    workdir,
    workdir,
    "--chdir",
    workdir,
    "--clearenv",
    ...Object.entries({
      ...env,
      PATH: `${BIN}:/usr/bin:/bin`,
      HOME: SANDBOX_HOME,
    }).flatMap(([name, value]) => ["--setenv", name, value]),
  ];
}

export type TokenSource = {
  expiresAt: () => number;
  now: () => number;
  sleep: (ms: number) => void;
  /** Refreshes the token on the host, outside any sandbox. */
  refresh: () => void;
  log: (message: string) => void;
};

/**
 * Makes sure the OAuth access token outlives the next step by `neededMs`, so
 * a sandboxed session, which can't write the credentials, never needs to
 * refresh it. If it won't, waits for it to lapse, refreshes it on the host,
 * and throws if it's still not fresh.
 */
export function ensureToken(neededMs: number, token: TokenSource): void {
  const fresh = () => token.expiresAt() - token.now() > neededMs;
  if (fresh()) return;
  while (!fresh() && token.now() < token.expiresAt() + 60_000) {
    token.log("Waiting for the OAuth token to lapse before refreshing it.");
    token.sleep(60_000);
  }
  if (!fresh()) token.refresh();
  if (!fresh()) {
    throw new Error(
      "The OAuth access token would expire during the next step and didn't refresh.",
    );
  }
}
