/**
 * The judging panel for the blind comparison (worldcrafter-i2uz, decision
 * worldcrafter-zybl): three judges on three models, each a fresh `claude -p`
 * session in the comparison's bubblewrap sandbox, reaching only a run
 * directory that holds exactly its material. Part 1 is blind; Part 2 adds
 * the key and runs only once that judge's Part 1 is marked as recorded
 * evidence. See README.md beside this file.
 *
 *   bun scripts/judging/panel.ts probe
 *   bun scripts/judging/panel.ts part1 <root> <judge|all> --rubric-commit <sha> [--replacement]
 *   bun scripts/judging/panel.ts mark-recorded <root> <judge> <evidence-id>
 *   bun scripts/judging/panel.ts part2 <root> <judge|all> --rubric-commit <sha> [--replacement]
 *   bun scripts/judging/panel.ts verdict <root>
 */

import { createHash } from "node:crypto";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSession } from "../comparison/comparison";
import {
  ensureToken,
  sandboxArgs,
  type TokenSource,
  tokenExpiresAt,
} from "../comparison/sandbox";
import {
  checkTranscript,
  type TranscriptSummary,
} from "../comparison/transcript";

export const JUDGES = {
  opus: "claude-opus-5-5",
  sonnet: "claude-sonnet-5-5",
  fable: "claude-fable-5-1",
} as const;
export type Judge = keyof typeof JUDGES;
export const JUDGE_NAMES = Object.keys(JUDGES) as Judge[];
export type Part = "part1" | "part2";
export type Call = "keep" | "change" | "drop";

/** Each session is bounded by `timeout`; this Claude Code has no --max-turns. */
export const TIMEOUT_SECONDS = 3600;
/** Run `all` concurrently only with more memory available than this. */
const CONCURRENT_MIN_GIB = 4;
/** No subagents, no web, no Edit: a judge reads and writes its report. */
const TOOLS = "Bash,Read,Write";
export const RUBRIC_PATH = "docs/verdicts/comparison-rubric.md";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../../..");

const OUTPUT: Record<Part, string> = { part1: "part1.md", part2: "part2.md" };

// ---------------------------------------------------------------------------
// Small helpers.

function sh(cmd: string[], cwd = REPO) {
  const r = Bun.spawnSync(cmd, { cwd, stdout: "pipe", stderr: "pipe" });
  return {
    code: r.exitCode,
    out: r.stdout.toString(),
    err: r.stderr.toString(),
  };
}

function must(cmd: string[], cwd = REPO): string {
  const r = sh(cmd, cwd);
  if (r.code !== 0) {
    throw new Error(`\`${cmd.join(" ")}\` failed (${r.code}): ${r.err}`);
  }
  return r.out;
}

const writeJson = (path: string, value: unknown) =>
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

const sha256 = (path: string) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

/** Every file under `dir`, relative to it, sorted. */
export function filesUnder(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((path) => statSync(join(dir, path)).isFile())
    .sort();
}

function availableGib(): number {
  const match = /^MemAvailable:\s+(\d+) kB/m.exec(
    readFileSync("/proc/meminfo", "utf8"),
  );
  return match ? Number(match[1]) / 1024 / 1024 : Number.POSITIVE_INFINITY;
}

function which(name: string): string {
  const path = Bun.which(name);
  if (path === null) throw new Error(`\`${name}\` is not on PATH.`);
  return path;
}

export function isJudge(name: string): name is Judge {
  return Object.hasOwn(JUDGES, name);
}

// ---------------------------------------------------------------------------
// The rubric, pinned at a commit.

export type Rubric = { commit: string; text: string };

/** The rubric as committed at `rev`, never the working tree. */
export function rubricAt(rev: string, repo = REPO): Rubric {
  const commit = must(
    ["git", "rev-parse", "--verify", `${rev}^{commit}`],
    repo,
  ).trim();
  return {
    commit,
    text: must(["git", "show", `${commit}:${RUBRIC_PATH}`], repo),
  };
}

// ---------------------------------------------------------------------------
// Layout. The material root holds `packets/` and `key/`; judging output goes
// to `<root>/judging/<judge>/<part>/`, which no session ever mounts.

export const partDir = (root: string, judge: Judge, part: Part) =>
  join(root, "judging", judge, part);

/** The first line of a part's STATUS file: `ok` or `failed`. */
export function statusOf(dir: string): "ok" | "failed" | undefined {
  const path = join(dir, "STATUS");
  if (!existsSync(path)) return undefined;
  const first = readFileSync(path, "utf8").split("\n")[0]?.trim();
  return first === "ok" || first === "failed" ? first : undefined;
}

/**
 * What each run directory holds, as {path in the run dir: host source}.
 * Directories are copied whole. Nothing else goes in.
 */
export function runDirSources(
  root: string,
  judge: Judge,
  part: Part,
): Record<string, string> {
  const packets = join(root, "packets");
  const names = readdirSync(packets)
    .filter((name) => name.endsWith(".md"))
    .sort();
  if (names.length === 0) throw new Error(`${packets} holds no packets.`);
  const sources: Record<string, string> = Object.fromEntries(
    names.map((name) => [`packets/${name}`, join(packets, name)]),
  );
  if (part === "part2") {
    const key = join(root, "key");
    sources["my-part1.md"] = join(partDir(root, judge, "part1"), "part1.md");
    sources["key.md"] = join(key, "key.md");
    sources["model-gaps"] = join(key, "model-gaps");
    sources["failures.md"] = join(key, "failures.md");
  }
  return sources;
}

/** A fresh run directory under /tmp holding exactly the rubric and sources. */
export function makeRunDir(
  rubric: Rubric,
  sources: Record<string, string>,
): string {
  const dir = realpathSync(mkdtempSync("/tmp/judge."));
  writeFileSync(join(dir, "rubric.md"), rubric.text);
  for (const [to, from] of Object.entries(sources)) {
    if (!existsSync(from)) throw new Error(`${from} is missing.`);
    mkdirSync(dirname(join(dir, to)), { recursive: true });
    if (statSync(from).isDirectory()) {
      cpSync(from, join(dir, to), { recursive: true });
    } else {
      copyFileSync(from, join(dir, to));
    }
  }
  return dir;
}

// ---------------------------------------------------------------------------
// Prompts.

export function prompt(part: Part): string {
  if (part === "part1") {
    return `You are a judge. This directory holds \`rubric.md\` and the packets you are judging, in \`packets/\`. Read the rubric and every packet in full.

Answer Part 1 of the rubric for every pair: every one of its questions, then the one-line preference and your confidence. Write your report to \`part1.md\` in this directory.

This session is Part 1 only. The key and Part 2 come later, in a separate session that will be given this report. Work only with the files in this directory, and don't change the packets or the rubric.`;
  }
  return `You are a judge. This directory holds \`rubric.md\`, the packets in \`packets/\`, \`my-part1.md\` (your own Part 1 report, written in an earlier session before you saw the key), \`key.md\` (the key), \`model-gaps/\` (the tool runs' model-gaps logs) and \`failures.md\` (notes on the runs, including any failed ones). Read them all.

Answer Part 2 of the rubric, every one of its questions, and write your report to \`part2.md\` in this directory. Don't revise Part 1: leave \`my-part1.md\` exactly as it is, and don't rewrite your Part 1 answers in \`part2.md\`.

End \`part2.md\` with a single line that is exactly \`VERDICT: keep\`, \`VERDICT: change\` or \`VERDICT: drop\`, matching your answer to question 6.

Work only with the files in this directory, and don't change any file other than \`part2.md\`.`;
}

// ---------------------------------------------------------------------------
// Sessions.

export type Session = { args: string[]; sandbox: string[] };

/** The `claude` flags and sandbox for one judge session. No tool mount. */
export function judgeSession(model: string, workdir: string): Session {
  const env = {
    USER: "judge",
    LANG: "C.UTF-8",
    CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1",
    DISABLE_AUTOUPDATER: "1",
  };
  const args = [
    "--model",
    model,
    "--setting-sources",
    "project,local",
    "--strict-mcp-config",
    "--disable-slash-commands",
    "--tools",
    TOOLS,
    "--permission-mode",
    "bypassPermissions",
    "--no-session-persistence",
    "--output-format",
    "stream-json",
    "--verbose",
    "--include-hook-events",
  ];
  const sandbox = sandboxArgs({
    workdir,
    claude: which("claude"),
    bun: process.execPath,
    env,
  });
  return { args, sandbox };
}

/** Refreshes the OAuth token with a one-line `claude -p` on the host. */
function refreshTokenOnHost(): void {
  const dir = mkdtempSync(join(tmpdir(), "token-refresh."));
  sh(
    [
      "claude",
      "-p",
      "Reply with ok.",
      "--model",
      JUDGES.sonnet,
      "--setting-sources",
      "project,local",
      "--strict-mcp-config",
      "--disable-slash-commands",
      "--tools",
      "",
      "--no-session-persistence",
    ],
    dir,
  );
  rmSync(dir, { recursive: true });
}

const hostToken: TokenSource = {
  expiresAt: () => tokenExpiresAt(),
  now: () => Date.now(),
  sleep: (ms) => Bun.sleepSync(ms),
  refresh: refreshTokenOnHost,
  log: (message) => console.log(message),
};

/**
 * Why a session's transcript doesn't show the expected model throughout, if
 * it doesn't. Claude Code falls back to another model, for the rest of the
 * session, when a model's safeguards refuse; that's named here too.
 */
export function modelProblems(
  jsonl: string,
  summary: TranscriptSummary,
  model: string,
): string[] {
  const problems: string[] = [];
  for (const line of jsonl.split("\n")) {
    if (!line.includes('"model_refusal_fallback"')) continue;
    const event: unknown = JSON.parse(line);
    if (typeof event !== "object" || event === null) continue;
    const field = (key: string) =>
      key in event ? String(Reflect.get(event, key)) : "?";
    problems.push(
      `refusal fallback from ${field("original_model")} to ${field("fallback_model")} (${field("api_refusal_category")})`,
    );
  }
  if (summary.initModel !== model) {
    problems.push(`init reported model ${summary.initModel ?? "none"}`);
  }
  if (summary.models.length === 0) problems.push("no assistant message");
  if (summary.models.some((m) => m !== model)) {
    problems.push(`answered by ${summary.models.join(", ")}`);
  }
  return problems;
}

export type ProbeResult = {
  judge: Judge;
  model: string;
  exitCode: number;
  initModel: string | undefined;
  models: string[];
  problems: string[];
};

/** A trivial, non-premise session per model, in the same sandbox. */
export async function probe(): Promise<ProbeResult[]> {
  ensureToken(600_000, hostToken);
  return Promise.all(
    JUDGE_NAMES.map(async (judge) => {
      const model = JUDGES[judge];
      const dir = realpathSync(mkdtempSync("/tmp/judge-probe."));
      const out = join(dir, "out");
      mkdirSync(out);
      const runDir = join(dir, "run");
      mkdirSync(runDir);
      // The judges' own session, tools included: Fable's safeguards refuse
      // most sessions in this sandbox that have no tools at all.
      const proc = spawnSession(
        judgeSession(model, runDir),
        "Reply with the single word ok.",
        300,
        {
          cwd: runDir,
          stdout: join(out, "transcript.jsonl"),
          stderr: join(out, "stderr.txt"),
        },
      );
      const exitCode = await proc.exited;
      const jsonl = readFileSync(join(out, "transcript.jsonl"), "utf8");
      const summary = checkTranscript(jsonl, runDir, {
        read: [runDir],
        write: [runDir],
      });
      rmSync(dir, { recursive: true });
      const problems = modelProblems(jsonl, summary, model);
      if (exitCode !== 0) problems.push(`claude exited ${exitCode}`);
      return {
        judge,
        model,
        exitCode,
        initModel: summary.initModel,
        models: summary.models,
        problems,
      };
    }),
  );
}

// ---------------------------------------------------------------------------
// Preconditions. Each throws with the reason it refuses.

/**
 * Checks there's room for a run of `part`: refuses if one exists, unless
 * this is a replacement for a failed one. Returns where that failed run is
 * to be kept (`<part>-failed-<n>`), if there is one.
 */
export function checkSlot(
  root: string,
  judge: Judge,
  part: Part,
  replacement: boolean,
): string | undefined {
  const dir = partDir(root, judge, part);
  if (part === "part1" && existsSync(partDir(root, judge, "part2"))) {
    throw new Error(
      `${judge} already has a Part 2; its Part 1 can't be replaced now.`,
    );
  }
  if (!existsSync(dir)) {
    if (replacement) throw new Error(`${judge} has no ${part} to replace.`);
    return undefined;
  }
  if (!replacement) {
    throw new Error(
      `${dir} exists. A failed run is replaced with --replacement, never rerun in place.`,
    );
  }
  if (statusOf(dir) !== "failed") {
    throw new Error(
      `${dir} isn't marked failed in STATUS, so it isn't replaced.`,
    );
  }
  let n = 1;
  while (existsSync(`${dir}-failed-${n}`)) n++;
  return `${dir}-failed-${n}`;
}

/** Part 2 runs only after that judge's Part 1 succeeded and was recorded. */
export function checkPart2Ready(
  root: string,
  judge: Judge,
  rubricCommit: string,
): void {
  const part1 = partDir(root, judge, "part1");
  if (!existsSync(join(part1, "part1.md"))) {
    throw new Error(`${judge} has no ${join(part1, "part1.md")}.`);
  }
  if (statusOf(part1) !== "ok") {
    throw new Error(`${judge}'s Part 1 isn't marked ok in STATUS.`);
  }
  if (!existsSync(join(part1, "RECORDED"))) {
    throw new Error(
      `${judge}'s Part 1 isn't marked as recorded evidence; run mark-recorded first.`,
    );
  }
  const recorded = readRun(part1).rubricCommit;
  if (recorded !== rubricCommit) {
    throw new Error(
      `${judge}'s Part 1 used rubric ${recorded}, not ${rubricCommit}.`,
    );
  }
}

export function markRecorded(
  root: string,
  judge: Judge,
  evidenceId: string,
): void {
  const part1 = partDir(root, judge, "part1");
  if (statusOf(part1) !== "ok" || !existsSync(join(part1, "part1.md"))) {
    throw new Error(`${judge} has no successful Part 1 to mark.`);
  }
  if (existsSync(join(part1, "RECORDED"))) {
    throw new Error(`${join(part1, "RECORDED")} already exists.`);
  }
  if (!/^[a-z0-9]+-[a-z0-9]+$/.test(evidenceId)) {
    throw new Error(`${evidenceId} doesn't look like an evidence ID.`);
  }
  writeFileSync(join(part1, "RECORDED"), `${evidenceId}\n`);
}

// ---------------------------------------------------------------------------
// One judge's run.

export type RunRecord = {
  judge: Judge;
  part: Part;
  model: string;
  replacement: boolean;
  rubricCommit: string;
  runDir: string;
  /** sha256 of every file the run directory held before the session. */
  inputs: Record<string, string>;
  claudeArgs: string[];
  sandbox: string[];
  startedAt: string;
  exitCode?: number;
  durationSeconds?: number;
  transcript?: TranscriptSummary;
  problems: string[];
};

export function readRun(dir: string): RunRecord {
  return JSON.parse(readFileSync(join(dir, "run.json"), "utf8")) as RunRecord;
}

export async function runJudge(
  rootArg: string,
  judge: Judge,
  part: Part,
  rubric: Rubric,
  replacement: boolean,
): Promise<RunRecord> {
  const root = resolve(rootArg);
  const model = JUDGES[judge];
  const sources = runDirSources(root, judge, part);
  const out = partDir(root, judge, part);
  mkdirSync(out, { recursive: true });
  const runDir = makeRunDir(rubric, sources);
  const inputs = Object.fromEntries(
    filesUnder(runDir).map((path) => [path, sha256(join(runDir, path))]),
  );
  const session = judgeSession(model, runDir);
  const text = prompt(part);
  writeFileSync(join(out, "prompt.md"), text);
  const record: RunRecord = {
    judge,
    part,
    model,
    replacement,
    rubricCommit: rubric.commit,
    runDir,
    inputs,
    claudeArgs: session.args,
    sandbox: session.sandbox,
    startedAt: new Date().toISOString(),
    problems: [],
  };
  writeJson(join(out, "run.json"), record);
  writeFileSync(join(out, "STATUS"), "running\n");
  console.log(`[${judge} ${part}] started ${record.startedAt} on ${model}`);

  const started = performance.now();
  const exitCode = await spawnSession(session, text, TIMEOUT_SECONDS, {
    cwd: runDir,
    stdout: join(out, "transcript.jsonl"),
    stderr: join(out, "stderr.txt"),
  }).exited;
  record.exitCode = exitCode;
  record.durationSeconds = Math.round((performance.now() - started) / 1000);

  const problems: string[] = [];
  if (exitCode === 124 || exitCode === 137) {
    problems.push(`timed out after ${TIMEOUT_SECONDS}s`);
  } else if (exitCode !== 0) {
    problems.push(`claude exited ${exitCode}`);
  }
  const jsonl = readFileSync(join(out, "transcript.jsonl"), "utf8");
  const transcript = checkTranscript(jsonl, runDir, {
    read: [runDir],
    write: [runDir],
  });
  record.transcript = transcript;
  problems.push(...modelProblems(jsonl, transcript, model));
  for (const f of transcript.outside) {
    problems.push(`outside the run dir: ${f.tool}: ${f.detail}`);
  }
  for (const [path, hash] of Object.entries(inputs)) {
    const now = join(runDir, path);
    if (!existsSync(now) || sha256(now) !== hash) {
      problems.push(`${path} changed during the session`);
    }
  }
  const output = join(runDir, OUTPUT[part]);
  if (!existsSync(output) || readFileSync(output, "utf8").trim() === "") {
    problems.push(`${OUTPUT[part]} is missing or empty`);
  } else {
    copyFileSync(output, join(out, OUTPUT[part]));
    if (part === "part2") {
      try {
        parseVerdict(readFileSync(output, "utf8"));
      } catch (error) {
        problems.push(String(error instanceof Error ? error.message : error));
      }
    }
  }
  // A copy of everything the run directory held afterwards, for audit.
  cpSync(runDir, join(out, "files"), { recursive: true });
  rmSync(runDir, { recursive: true });

  record.problems = problems;
  writeJson(join(out, "run.json"), record);
  writeFileSync(
    join(out, "STATUS"),
    problems.length === 0
      ? "ok\n"
      : `failed\n${problems.map((p) => `- ${p}`).join("\n")}\n`,
  );
  console.log(
    `[${judge} ${part}] exit ${exitCode}, ${record.durationSeconds}s, ${problems.length === 0 ? "ok" : `FAILED: ${problems.join("; ")}`}`,
  );
  return record;
}

/** Runs one judge, or all three: concurrently if memory allows. */
export async function runPart(
  rootArg: string,
  which: Judge | "all",
  part: Part,
  rubricRev: string,
  replacement: boolean,
): Promise<RunRecord[]> {
  const root = resolve(rootArg);
  const rubric = rubricAt(rubricRev);
  const judges: Judge[] = which === "all" ? JUDGE_NAMES : [which];
  if (which === "all" && replacement) {
    throw new Error("Replace one judge at a time.");
  }
  // Check every judge before starting any.
  const moves = judges.map((judge) => {
    if (part === "part2") checkPart2Ready(root, judge, rubric.commit);
    return [
      partDir(root, judge, part),
      checkSlot(root, judge, part, replacement),
    ] as const;
  });
  for (const [dir, keep] of moves)
    if (keep !== undefined) renameSync(dir, keep);
  ensureToken((TIMEOUT_SECONDS + 600) * 1000, hostToken);
  const gib = availableGib();
  if (judges.length > 1 && gib > CONCURRENT_MIN_GIB) {
    console.log(`${gib.toFixed(1)} GiB available: running concurrently.`);
    return Promise.all(
      judges.map((j) => runJudge(root, j, part, rubric, replacement)),
    );
  }
  const records: RunRecord[] = [];
  for (const judge of judges) {
    records.push(await runJudge(root, judge, part, rubric, replacement));
  }
  return records;
}

// ---------------------------------------------------------------------------
// The verdict.

/**
 * The call on the last non-empty line, `VERDICT: keep|change|drop`. Markdown
 * emphasis or code around it is allowed; anything else isn't.
 */
export function parseVerdict(report: string): Call {
  const last = report
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .at(-1);
  const match =
    last === undefined
      ? null
      : /^[*_`]*VERDICT:\s*(keep|change|drop)[*_`.]*$/i.exec(last);
  const call = match?.[1]?.toLowerCase();
  if (call !== "keep" && call !== "change" && call !== "drop") {
    throw new Error(
      `the last line isn't "VERDICT: keep|change|drop": ${JSON.stringify(last ?? "")}`,
    );
  }
  return call;
}

export type Tally = Record<Call, number>;

/** The call at least two of the three make; change if all three differ. */
export function aggregate(calls: readonly Call[]): {
  tally: Tally;
  result: Call;
  rule: string;
} {
  if (calls.length !== 3) {
    throw new Error(`The rule takes exactly three calls, not ${calls.length}.`);
  }
  const tally: Tally = { keep: 0, change: 0, drop: 0 };
  for (const call of calls) tally[call]++;
  const majority = (Object.keys(tally) as Call[]).find((c) => tally[c] >= 2);
  return majority === undefined
    ? {
        tally,
        result: "change",
        rule: "All three calls differ, so the verdict is change.",
      }
    : {
        tally,
        result: majority,
        rule: `At least two of the three judges call ${majority}.`,
      };
}

export function verdict(rootArg: string): string {
  const root = resolve(rootArg);
  const rows = JUDGE_NAMES.map((judge) => {
    const dir = partDir(root, judge, "part2");
    if (statusOf(dir) !== "ok") {
      throw new Error(`${judge}'s Part 2 isn't marked ok in STATUS.`);
    }
    const run = readRun(dir);
    if (run.model !== JUDGES[judge]) {
      throw new Error(`${judge}'s Part 2 ran on ${run.model}.`);
    }
    const call = parseVerdict(readFileSync(join(dir, "part2.md"), "utf8"));
    return { judge, model: run.model, rubricCommit: run.rubricCommit, call };
  });
  const commits = new Set(rows.map((r) => r.rubricCommit));
  if (commits.size !== 1) {
    throw new Error(
      `The judges used different rubric commits: ${[...commits].join(", ")}.`,
    );
  }
  const { tally, result, rule } = aggregate(rows.map((r) => r.call));
  const dissent = rows.filter((r) => r.call !== result);
  const lines = [
    "# Verdict (worldcrafter-i2uz)",
    "",
    `Rubric: \`${RUBRIC_PATH}\` at ${rows[0]?.rubricCommit}.`,
    "",
    ...rows.map(
      (r) =>
        `- ${r.judge} (${r.model}): ${r.call} (\`judging/${r.judge}/part2/part2.md\`)`,
    ),
    "",
    `Tally: keep ${tally.keep}, change ${tally.change}, drop ${tally.drop}.`,
    "",
    `Rule: the call at least two of the three make, else change. ${rule}`,
    "",
    `Result: **${result}**.`,
    "",
    dissent.length === 0
      ? "Dissent: none."
      : `Dissent: ${dissent.map((r) => `${r.judge} called ${r.call}`).join("; ")}.`,
    "",
  ];
  const text = lines.join("\n");
  writeFileSync(join(root, "judging", "verdict.md"), text);
  return text;
}

// ---------------------------------------------------------------------------

const USAGE = `Usage:
  panel.ts probe
  panel.ts part1 <root> <opus|sonnet|fable|all> --rubric-commit <sha> [--replacement]
  panel.ts mark-recorded <root> <judge> <evidence-id>
  panel.ts part2 <root> <opus|sonnet|fable|all> --rubric-commit <sha> [--replacement]
  panel.ts verdict <root>`;

export async function main(argv: string[]): Promise<void> {
  const [command, ...rest] = argv;
  const flag = (name: string) => {
    const i = rest.indexOf(name);
    return i === -1 ? undefined : rest[i + 1];
  };
  const positional = rest.filter(
    (arg, i) => !arg.startsWith("--") && rest[i - 1] !== "--rubric-commit",
  );
  switch (command) {
    case "probe": {
      const results = await probe();
      console.log(JSON.stringify(results, null, 2));
      if (results.some((r) => r.problems.length > 0)) process.exit(1);
      return;
    }
    case "part1":
    case "part2": {
      const [root, who] = positional;
      const rubric = flag("--rubric-commit");
      if (root === undefined || who === undefined || rubric === undefined) {
        break;
      }
      if (who !== "all" && !isJudge(who)) break;
      const records = await runPart(
        root,
        who,
        command,
        rubric,
        rest.includes("--replacement"),
      );
      if (records.some((r) => r.problems.length > 0)) process.exit(1);
      return;
    }
    case "mark-recorded": {
      const [root, who, evidenceId] = positional;
      if (root === undefined || who === undefined || evidenceId === undefined) {
        break;
      }
      if (!isJudge(who)) break;
      markRecorded(resolve(root), who, evidenceId);
      return;
    }
    case "verdict": {
      const [root] = positional;
      if (root === undefined) break;
      console.log(verdict(root));
      return;
    }
  }
  console.error(USAGE);
  process.exit(2);
}

if (import.meta.main) {
  await main(process.argv.slice(2));
}
