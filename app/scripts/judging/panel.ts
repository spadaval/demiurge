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

/** Part 1 sees the rubric from this heading... */
export const PART1_FROM = "## What you're judging";
/** ...up to, not including, this one. */
export const PART1_UNTIL = "## Part 2";

/** The rubric text a part's session gets, and where it was cut. */
export type RubricCopy = { text: string; sha256: string; cut: string };

/**
 * Part 2 gets the whole rubric. Part 1 gets only the span from "What you're
 * judging" up to the Part 2 heading: the title and preamble name the arms
 * and the strategy, and Part 2 names the arms and which premise was tuned on.
 */
export function rubricFor(rubric: Rubric, part: Part): RubricCopy {
  const copy = (text: string, cut: string): RubricCopy => ({
    text,
    sha256: createHash("sha256").update(text).digest("hex"),
    cut,
  });
  if (part === "part2") return copy(rubric.text, "the whole file");
  const lines = rubric.text.split("\n");
  const from = lines.findIndex((line) => line.trimEnd() === PART1_FROM);
  const until = lines.findIndex((line) => line.startsWith(PART1_UNTIL));
  if (from === -1 || until === -1 || until < from) {
    throw new Error(
      `The rubric at ${rubric.commit} has no "${PART1_FROM}" heading before "${PART1_UNTIL}".`,
    );
  }
  return copy(
    `${lines.slice(from, until).join("\n").trimEnd()}\n`,
    `lines ${from + 1}-${until} of ${RUBRIC_PATH} at ${rubric.commit}: from "${PART1_FROM}" up to, not including, "${lines[until]}"`,
  );
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
  rubricText: string,
  sources: Record<string, string>,
): string {
  const dir = realpathSync(mkdtempSync("/tmp/judge."));
  try {
    writeFileSync(join(dir, "rubric.md"), rubricText);
    for (const [to, from] of Object.entries(sources)) {
      if (!existsSync(from)) throw new Error(`${from} is missing.`);
      mkdirSync(dirname(join(dir, to)), { recursive: true });
      if (statSync(from).isDirectory()) {
        cpSync(from, join(dir, to), { recursive: true });
      } else {
        copyFileSync(from, join(dir, to));
      }
    }
  } catch (error) {
    rmSync(dir, { recursive: true });
    throw error;
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
  const marked = readRecorded(part1);
  const now = sha256(join(part1, "part1.md"));
  if (marked.part1Sha256 !== now) {
    throw new Error(
      `${judge}'s part1.md has changed since it was recorded as ${marked.evidenceId} (sha256 ${marked.part1Sha256}, now ${now}).`,
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
  writeJson(join(part1, "RECORDED"), {
    evidenceId,
    part1Sha256: sha256(join(part1, "part1.md")),
  });
}

export type Recorded = { evidenceId: string; part1Sha256: string };

/** `RECORDED`: the evidence ID and the sha256 of the part1.md it recorded. */
export function readRecorded(part1: string): Recorded {
  const data: unknown = JSON.parse(
    readFileSync(join(part1, "RECORDED"), "utf8"),
  );
  if (
    typeof data !== "object" ||
    data === null ||
    !("evidenceId" in data) ||
    !("part1Sha256" in data) ||
    typeof data.evidenceId !== "string" ||
    typeof data.part1Sha256 !== "string"
  ) {
    throw new Error(`${join(part1, "RECORDED")} isn't a valid record.`);
  }
  return { evidenceId: data.evidenceId, part1Sha256: data.part1Sha256 };
}

// ---------------------------------------------------------------------------
// One judge's run.

export type RunRecord = {
  judge: Judge;
  part: Part;
  model: string;
  replacement: boolean;
  rubricCommit: string;
  /** The rubric text the session got: its sha256 and where it was cut. */
  rubric: { sha256: string; cut: string };
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

/** What a finished session's run dir and transcript show went wrong. */
export function postSessionProblems({
  part,
  model,
  exitCode,
  jsonl,
  transcript,
  runDir,
  inputs,
}: {
  part: Part;
  model: string;
  exitCode: number;
  jsonl: string;
  transcript: TranscriptSummary;
  runDir: string;
  inputs: Record<string, string>;
}): string[] {
  const problems: string[] = [];
  if (exitCode === 124 || exitCode === 137) {
    problems.push(`timed out after ${TIMEOUT_SECONDS}s`);
  } else if (exitCode !== 0) {
    problems.push(`claude exited ${exitCode}`);
  }
  problems.push(...modelProblems(jsonl, transcript, model));
  if (transcript.unparsed > 0) {
    problems.push(
      `${transcript.unparsed} transcript lines weren't JSON, so the transcript check couldn't read them`,
    );
  }
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
  } else if (part === "part2") {
    try {
      parseVerdict(readFileSync(output, "utf8"));
    } catch (error) {
      problems.push(errorText(error));
    }
  }
  return problems;
}

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const writeStatus = (out: string, problems: readonly string[]) =>
  writeFileSync(
    join(out, "STATUS"),
    problems.length === 0
      ? "ok\n"
      : `failed\n${problems.map((p) => `- ${p}`).join("\n")}\n`,
  );

/**
 * Part directories whose session is under way, with their run dirs, for the
 * signal handler.
 */
const running = new Map<string, string | undefined>();

export async function runJudge(
  rootArg: string,
  judge: Judge,
  part: Part,
  rubric: Rubric,
  replacement: boolean,
): Promise<RunRecord> {
  const root = resolve(rootArg);
  const model = JUDGES[judge];
  const out = partDir(root, judge, part);
  mkdirSync(out, { recursive: true });
  running.set(out, undefined);
  const record: RunRecord = {
    judge,
    part,
    model,
    replacement,
    rubricCommit: rubric.commit,
    rubric: { sha256: "", cut: "" },
    runDir: "",
    inputs: {},
    claudeArgs: [],
    sandbox: [],
    startedAt: new Date().toISOString(),
    problems: [],
  };
  writeFileSync(join(out, "STATUS"), "running\n");
  try {
    const copy = rubricFor(rubric, part);
    record.rubric = { sha256: copy.sha256, cut: copy.cut };
    const runDir = makeRunDir(copy.text, runDirSources(root, judge, part));
    record.runDir = runDir;
    running.set(out, runDir);
    try {
      record.inputs = Object.fromEntries(
        filesUnder(runDir).map((path) => [path, sha256(join(runDir, path))]),
      );
      const session = judgeSession(model, runDir);
      record.claudeArgs = session.args;
      record.sandbox = session.sandbox;
      const text = prompt(part);
      writeFileSync(join(out, "prompt.md"), text);
      writeJson(join(out, "run.json"), record);
      console.log(`[${judge} ${part}] started ${record.startedAt} on ${model}`);

      const started = performance.now();
      const exitCode = await spawnSession(session, text, TIMEOUT_SECONDS, {
        cwd: runDir,
        stdout: join(out, "transcript.jsonl"),
        stderr: join(out, "stderr.txt"),
      }).exited;
      record.exitCode = exitCode;
      record.durationSeconds = Math.round((performance.now() - started) / 1000);
      const jsonl = readFileSync(join(out, "transcript.jsonl"), "utf8");
      record.transcript = checkTranscript(jsonl, runDir, {
        read: [runDir],
        write: [runDir],
      });
      record.problems = postSessionProblems({
        part,
        model,
        exitCode,
        jsonl,
        transcript: record.transcript,
        runDir,
        inputs: record.inputs,
      });
      const output = join(runDir, OUTPUT[part]);
      if (existsSync(output)) copyFileSync(output, join(out, OUTPUT[part]));
    } finally {
      // A copy of everything the run directory held afterwards, for audit.
      cpSync(runDir, join(out, "files"), { recursive: true });
      rmSync(runDir, { recursive: true });
    }
  } catch (error) {
    record.problems.push(`the runner failed: ${errorText(error)}`);
  } finally {
    running.delete(out);
    writeJson(join(out, "run.json"), record);
    writeStatus(out, record.problems);
  }
  console.log(
    `[${judge} ${part}] exit ${record.exitCode ?? "none"}, ${record.durationSeconds ?? 0}s, ${record.problems.length === 0 ? "ok" : `FAILED: ${record.problems.join("; ")}`}`,
  );
  return record;
}

/**
 * Marks every session under way as failed if the runner is interrupted, so
 * none is left looking as if it might still finish.
 */
function onInterrupt(signal: "SIGINT" | "SIGTERM"): void {
  for (const [out, runDir] of running) {
    writeStatus(out, [`the runner was interrupted by ${signal}`]);
    if (runDir !== undefined) rmSync(runDir, { recursive: true, force: true });
  }
  process.exit(signal === "SIGINT" ? 130 : 143);
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
  ensureToken((TIMEOUT_SECONDS + 600) * 1000, hostToken);
  for (const [dir, keep] of moves) {
    if (keep !== undefined) renameSync(dir, keep);
  }
  process.on("SIGINT", onInterrupt);
  process.on("SIGTERM", onInterrupt);
  try {
    const gib = availableGib();
    if (judges.length > 1 && gib > CONCURRENT_MIN_GIB) {
      console.log(`${gib.toFixed(1)} GiB available: running concurrently.`);
      return await Promise.all(
        judges.map((j) => runJudge(root, j, part, rubric, replacement)),
      );
    }
    const records: RunRecord[] = [];
    for (const judge of judges) {
      records.push(await runJudge(root, judge, part, rubric, replacement));
    }
    return records;
  } finally {
    process.off("SIGINT", onInterrupt);
    process.off("SIGTERM", onInterrupt);
  }
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
