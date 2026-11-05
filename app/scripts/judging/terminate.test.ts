import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  isSandboxedSession,
  refuseIfSessionsRunning,
  sandboxedSessions,
} from "./terminate";

const HERE = resolve(import.meta.dir);
const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

/** Pids of every process whose command line holds `token`. */
function holding(token: string): number[] {
  return readdirSync("/proc")
    .filter((e) => /^\d+$/.test(e))
    .filter((e) => {
      try {
        return readFileSync(`/proc/${e}/cmdline`, "utf8").includes(token);
      } catch {
        return false;
      }
    })
    .map(Number);
}

/**
 * A stand-in runner: one sandboxed session (`sleep <token>` in bwrap, as
 * spawnSandboxed starts claude), with or without the runners' handler.
 */
function runner(dir: string, token: string, handled: boolean): string {
  const script = join(dir, "runner.ts");
  writeFileSync(
    script,
    `import { writeFileSync } from "node:fs";
import { spawnSandboxed, systemMounts, workdirAndEnv } from ${JSON.stringify(join(HERE, "../comparison/sandbox.ts"))};
import { onTermination } from ${JSON.stringify(join(HERE, "terminate.ts"))};
const dir = ${JSON.stringify(dir)};
${handled ? `onTermination((signal) => writeFileSync(dir + "/recorded", signal));` : ""}
const session = spawnSandboxed([...systemMounts(), ...workdirAndEnv(dir, {})], ["sleep", ${JSON.stringify(token)}], 600, {
  cwd: dir, stdout: dir + "/out", stderr: dir + "/err",
});
writeFileSync(dir + "/ready", "");
await session.exited;
`,
  );
  return script;
}

async function startRunner(handled: boolean) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "terminate-test.")));
  temps.push(dir);
  const token = `${290 + Math.floor(Math.random() * 9)}.${Date.now() % 1_000_000}`;
  const proc = Bun.spawn(["bun", runner(dir, token, handled)], {
    stdout: "ignore",
    stderr: "pipe",
  });
  const until = Date.now() + 20_000;
  while (Date.now() < until) {
    // The sandboxed sleep itself is up.
    if (existsSync(join(dir, "ready")) && holding(token).length >= 3) break;
    await Bun.sleep(100);
  }
  return { dir, token, proc };
}

async function gone(token: string, ms = 20_000): Promise<number[]> {
  const until = Date.now() + ms;
  while (holding(token).length > 0 && Date.now() < until) await Bun.sleep(200);
  return holding(token);
}

describe("isSandboxedSession", () => {
  test("matches the runners' bwrap sessions only", () => {
    const names = ["claude", "grok"];
    expect(
      isSandboxedSession(
        [
          "/usr/bin/timeout",
          "--kill-after=60",
          "3600",
          "/usr/bin/bwrap",
          "--args",
          "3",
          "claude",
          "-p",
          "x",
        ],
        names,
      ),
    ).toBe(true);
    expect(
      isSandboxedSession(
        ["/usr/bin/bwrap", "--args", "3", "grok", "-p"],
        names,
      ),
    ).toBe(true);
    expect(
      isSandboxedSession(
        ["/usr/bin/bwrap", "--args", "3", "git", "log"],
        names,
      ),
    ).toBe(false);
    expect(
      isSandboxedSession(
        ["/usr/bin/bwrap", "--unshare-all", "git", "log"],
        names,
      ),
    ).toBe(false);
    expect(isSandboxedSession(["claude", "-p", "x"], names)).toBe(false);
  });
});

describe("termination reaches the sandboxed session (worldcrafter-7b2r)", () => {
  test.each([
    "SIGTERM",
    "SIGHUP",
    "SIGINT",
  ] as const)("%s to the runner stops its session, records the signal and exits", async (signal) => {
    const { dir, token, proc } = await startRunner(true);
    expect(holding(token).length).toBeGreaterThanOrEqual(3);
    // The startup check sees it.
    // The startup check sees it once (its timeout, not the bwraps under it),
    // and only as this user's.
    const mine = sandboxedSessions(["sleep"]).filter((s) =>
      s.command.includes(token),
    );
    expect(mine).toHaveLength(1);
    expect(mine[0]?.command.startsWith("/usr/bin/timeout")).toBe(true);
    expect(() => refuseIfSessionsRunning(["sleep"])).toThrow("still running");
    const other = (process.getuid?.() ?? 0) + 1;
    expect(
      sandboxedSessions(["sleep"], other).filter((s) =>
        s.command.includes(token),
      ),
    ).toEqual([]);
    expect(() => refuseIfSessionsRunning(["sleep"], other)).not.toThrow();
    proc.kill(signal);
    const code = await proc.exited;
    expect(code).toBe({ SIGHUP: 129, SIGINT: 130, SIGTERM: 143 }[signal]);
    expect(await gone(token)).toEqual([]);
    expect(readFileSync(join(dir, "recorded"), "utf8")).toBe(signal);
  }, 40_000);

  test("without the handler, the session is left behind (why it is needed)", async () => {
    const { token, proc } = await startRunner(false);
    proc.kill("SIGTERM");
    await proc.exited;
    await Bun.sleep(1000);
    const left = holding(token);
    expect(left.length).toBeGreaterThan(0);
    for (const pid of left) {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        // Gone.
      }
    }
    expect(await gone(token)).toEqual([]);
  }, 40_000);
});

describe("the round runner's phase guard (worldcrafter-s8hy)", () => {
  test("a signal between sessions still removes the phase's temp dirs and exits", async () => {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), "terminate-test.")));
    temps.push(dir);
    const scratch = join(dir, "so-far-home.x");
    mkdirSync(scratch);
    const script = join(dir, "phase.ts");
    writeFileSync(
      script,
      `import { writeFileSync } from "node:fs";
import { live, withPhaseGuard } from ${JSON.stringify(join(HERE, "../round/round.ts"))};
await withPhaseGuard(async () => {
  // Between a story so far's reply and its revision: no session runs.
  live.cleanup.add(${JSON.stringify(scratch)});
  writeFileSync(${JSON.stringify(join(dir, "ready"))}, "");
  await Bun.sleep(60_000);
});
`,
    );
    const proc = Bun.spawn(["bun", script], {
      stdout: "ignore",
      stderr: "ignore",
    });
    const until = Date.now() + 20_000;
    while (!existsSync(join(dir, "ready")) && Date.now() < until)
      await Bun.sleep(100);
    expect(existsSync(scratch)).toBe(true);
    proc.kill("SIGTERM");
    expect(await proc.exited).toBe(143);
    expect(existsSync(scratch)).toBe(false);
  }, 30_000);
});
