/**
 * Termination for the runners that start sandboxed sessions (the round
 * runner and both panels; worldcrafter-7b2r, finding worldcrafter-gbh1).
 *
 * Each session runs as runner → `timeout` → bwrap → claude or grok.
 * `timeout` puts itself in a process group of its own, so a signal to the
 * runner, or to the runner's process group, never reaches it, and bwrap's
 * `--die-with-parent` ties the session to bwrap, not to the runner. Killed
 * without a handler, the runner leaves a credentialed session running. So
 * the runners pass SIGTERM, SIGINT and SIGHUP on: each child `timeout` gets
 * SIGTERM, which it sends to its group (bwrap, whose death takes the
 * sandbox's processes with it); any still alive after a grace period gets
 * SIGKILL, group and all.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const TERMINATIONS = ["SIGTERM", "SIGINT", "SIGHUP"] as const;
export type Termination = (typeof TERMINATIONS)[number];

const EXIT: Record<Termination, number> = {
  SIGHUP: 129,
  SIGINT: 130,
  SIGTERM: 143,
};

/** This process's children: each session's `timeout`, while it runs. */
export function childPids(pid = process.pid): number[] {
  const tasks = `/proc/${pid}/task`;
  try {
    return readdirSync(tasks).flatMap((tid) =>
      readFileSync(join(tasks, tid, "children"), "utf8")
        .split(/\s+/)
        .filter((child) => child !== "")
        .map(Number),
    );
  } catch {
    return [];
  }
}

/**
 * Whether a process is still running. A child that has exited but that the
 * runner, busy in its handler, hasn't reaped is a zombie: it counts as gone.
 */
const alive = (pid: number) => {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    return (
      stat.slice(stat.lastIndexOf(")") + 2, stat.lastIndexOf(")") + 3) !== "Z"
    );
  } catch {
    return false;
  }
};

const send = (pid: number, signal: NodeJS.Signals) => {
  try {
    process.kill(pid, signal);
  } catch {
    // Already gone.
  }
};

/**
 * Stops every child session: SIGTERM to each child (its `timeout` passes it
 * to bwrap), then, for any still alive after `graceMs`, SIGKILL to its
 * process group and to it. Returns once none is left, or after the kill.
 */
export function stopChildren(graceMs = 15_000): void {
  const pids = childPids();
  for (const pid of pids) send(pid, "SIGTERM");
  const until = Date.now() + graceMs;
  while (pids.some(alive) && Date.now() < until) Bun.sleepSync(100);
  for (const pid of pids.filter(alive)) {
    // `timeout` leads its own process group: kill bwrap with it.
    send(-pid, "SIGKILL");
    send(pid, "SIGKILL");
  }
}

/**
 * Installs handlers for SIGTERM, SIGINT and SIGHUP that stop every child
 * session, call `record` with the signal so the runner can mark what was
 * under way as failed, and exit 128 + the signal's number. Returns a
 * function that removes them.
 */
export function onTermination(
  record: (signal: Termination) => void,
): () => void {
  const handler = (signal: Termination) => {
    stopChildren();
    try {
      record(signal);
    } finally {
      process.exit(EXIT[signal]);
    }
  };
  for (const signal of TERMINATIONS) process.on(signal, handler);
  return () => {
    for (const signal of TERMINATIONS) process.off(signal, handler);
  };
}

/** A process that is one of the runners' sandboxed sessions. */
export type LiveSession = { pid: number; command: string };

/**
 * Whether a command line (argv) is a runner's session: bwrap reading its
 * options from fd 3 and running one of `names` (claude or grok), as
 * `spawnSandboxed` starts them.
 */
export function isSandboxedSession(
  argv: readonly string[],
  names: readonly string[],
): boolean {
  const at = argv.findIndex(
    (arg) => arg === "/usr/bin/bwrap" || arg.endsWith("/bwrap"),
  );
  return (
    at !== -1 &&
    argv[at + 1] === "--args" &&
    argv[at + 2] === "3" &&
    names.includes(argv[at + 3] ?? "")
  );
}

/** Every running sandboxed session on the host, from /proc. */
export function sandboxedSessions(
  names: readonly string[] = ["claude", "grok"],
): LiveSession[] {
  const found: LiveSession[] = [];
  for (const entry of readdirSync("/proc")) {
    if (!/^\d+$/.test(entry)) continue;
    let argv: string[];
    try {
      argv = readFileSync(`/proc/${entry}/cmdline`, "utf8")
        .split("\0")
        .filter((a) => a !== "");
    } catch {
      continue;
    }
    if (isSandboxedSession(argv, names)) {
      found.push({ pid: Number(entry), command: argv.slice(0, 8).join(" ") });
    }
  }
  return found;
}

/**
 * Refuses to start a phase while a sandboxed writer or judge from an
 * earlier run is still running: it holds the credentials unsupervised and
 * could overlap the new one.
 */
export function refuseIfSessionsRunning(
  names: readonly string[] = ["claude", "grok"],
): void {
  const live = sandboxedSessions(names);
  if (live.length > 0) {
    throw new Error(
      `A sandboxed session from an earlier run is still running; stop it first (kill the pid's process group):\n${live.map((s) => `- pid ${s.pid}: ${s.command} ...`).join("\n")}`,
    );
  }
}
