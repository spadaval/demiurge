/**
 * The scene panel for mission worldcrafter-gwx3 (issue worldcrafter-w716,
 * decision worldcrafter-jeue): four judges on four models, Opus 5.5, Sonnet
 * 5.5, Fable 5.1 and Grok 4.7, each a fresh session in the bubblewrap
 * sandbox that reaches only a run directory holding one scene, its story so
 * far and the judge-facing part of the rubric. Scores are tabulated per
 * judge, never combined. A failed run, or one that reaches beyond its
 * inputs, is replaced by a fresh judge on the same model, and the
 * replacement is kept (decision worldcrafter-zybl). See README.md.
 *
 *   bun scripts/judging/scenes.ts judge <round-dir> [--rubric-commit <rev>] [--scene <id>]... [--judge <name>]...
 *   bun scripts/judging/scenes.ts tabulate <round-dir>
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  credentialsPath,
  ensureToken,
  spawnSandboxed,
} from "../comparison/sandbox";
import type { TranscriptSummary } from "../comparison/transcript";
import {
  checkGrokTranscript,
  ensureGrokToken,
  GROK_CONFIG,
  GROK_MODEL,
  type GrokSummary,
  grokArgs,
  grokAuthPath,
  grokModelProblems,
  grokSandboxArgs,
  hostGrokToken,
} from "./grok";
import {
  availableGib,
  childPids,
  filesUnder,
  hostToken,
  judgeSession,
  judgeTranscript,
  makeRunDir,
  modelProblems,
  type Rubric,
  type RubricCopy,
  rubricAt,
  rubricFor,
  sha256,
} from "./panel";

export const SCENE_JUDGES = {
  opus: { kind: "claude", model: "claude-opus-5-5" },
  sonnet: { kind: "claude", model: "claude-sonnet-5-5" },
  fable: { kind: "claude", model: "claude-fable-5-1" },
  grok: { kind: "grok", model: GROK_MODEL },
} as const;
export type SceneJudge = keyof typeof SCENE_JUDGES;
export const SCENE_JUDGE_NAMES = Object.keys(SCENE_JUDGES) as SceneJudge[];
export const isSceneJudge = (name: string): name is SceneJudge =>
  Object.hasOwn(SCENE_JUDGES, name);

export const DEFAULT_RUBRIC = "docs/verdicts/world-demo-rubric.md";
/** Each session is bounded by `timeout`. */
export const TIMEOUT_SECONDS = 1800;
/** Grok's own bound on agent turns; reading two files and writing one is a few. */
const GROK_MAX_TURNS = 30;
/**
 * Read the inputs; the report is the final reply. No Write, Bash, web or
 * subagents. (Fable refuses most sandboxed sessions with no tools at all.)
 */
const CLAUDE_TOOLS = "Read";
/** A judge's runs per scene in one invocation: the first and two replacements. */
export const DEFAULT_ATTEMPTS = 3;

/** What a run directory holds, besides `rubric.md`. */
export const SCENE_FILE = "scene.md";
export const SO_FAR_FILE = "story-so-far.md";
/** Where the runner saves the judge's final reply, outside the run dir. */
export const REPORT_FILE = "report.md";

/**
 * How many judges run at once: four only if `free -g` shows more than 5 GB
 * available, else fewer. `free -g` prints whole GiB, rounded down, so 5.9
 * GiB is 5 and not enough for four.
 */
export function concurrencyFor(gib: number): number {
  const shown = Math.floor(gib);
  if (shown > 5) return 4;
  if (shown > 3) return 2;
  return 1;
}

/**
 * A note, not a failure, when the credentials a session mounted changed
 * while it ran. The mount is read-only, so only the host can have changed
 * them (another session refreshing a token); the note puts that evidence
 * where the round's STATUS and tables show it.
 */
export function credentialsNote(
  credentials: SceneRun["credentials"],
): string | undefined {
  if (
    credentials.after === undefined ||
    credentials.after === credentials.before
  ) {
    return undefined;
  }
  return `note: credentials changed during the session: ${credentials.path} sha256 ${credentials.before.slice(0, 16)}... before, ${credentials.after.slice(0, 16)}... after (mounted read-only, so changed on the host)`;
}

// ---------------------------------------------------------------------------
// The prompt. It names the three files and the report, and nothing of the
// process: no parts, sessions, later steps, other judges or who wrote it.

export function scenePrompt(): string {
  return `You are a judge. This directory holds three files: \`${SO_FAR_FILE}\` (the story so far), \`${SCENE_FILE}\` (the scene you are judging) and \`rubric.md\` (how to judge it). Read \`rubric.md\`, then \`${SO_FAR_FILE}\`, then \`${SCENE_FILE}\`, each in full. Read nothing else.

Score the scene as the rubric says, and give your report, in the form its "Your report" section gives, as your final reply. Don't create or change any file.`;
}

// ---------------------------------------------------------------------------
// The report.

export const CRITERIA = [
  "pacing",
  "intrigue",
  "subtext",
  "character",
  "prose_voice",
  "tone_humour",
  "world_aliveness",
  "continuity",
] as const;
export type Criterion = (typeof CRITERIA)[number];
type Moment = { quote: string; why: string };

export type SceneReport = Record<
  Criterion,
  { score: number; evidence: string }
> & {
  overall: { score: number };
  best_moment: Moment;
  worst_moment: Moment;
};

/** The template's keys at both levels. */
const SHAPE: Record<string, readonly string[]> = {
  ...Object.fromEntries(CRITERIA.map((c) => [c, ["score", "evidence"]])),
  overall: ["score"],
  best_moment: ["quote", "why"],
  worst_moment: ["quote", "why"],
};

export type Parsed =
  | { ok: true; report: SceneReport }
  | { ok: false; problems: string[] };

/**
 * The rubric's Part 2: a report fails unless it holds exactly one ```json
 * fenced block that parses as JSON with exactly the template's keys at both
 * levels, every score a whole number from 1 to 10 and every string
 * non-empty.
 */
export function parseReport(text: string): Parsed {
  const lines = text.split("\n");
  const opens = lines.flatMap((line, i) =>
    /^\s*```json\s*$/.test(line) ? [i] : [],
  );
  if (opens.length !== 1) {
    return {
      ok: false,
      problems: [`the report has ${opens.length} \`\`\`json blocks, not one`],
    };
  }
  const from = (opens[0] ?? 0) + 1;
  const close = lines.findIndex(
    (line, i) => i >= from && /^\s*```\s*$/.test(line),
  );
  if (close === -1) {
    return { ok: false, problems: ["the ```json block is never closed"] };
  }
  let data: unknown;
  try {
    data = JSON.parse(lines.slice(from, close).join("\n"));
  } catch (error) {
    return {
      ok: false,
      problems: [
        `the json block doesn't parse: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
  const problems: string[] = [];
  const isObject = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);
  if (!isObject(data))
    return { ok: false, problems: ["the json isn't an object"] };
  const keysDiffer = (
    where: string,
    have: string[],
    want: readonly string[],
  ) => {
    const missing = want.filter((k) => !have.includes(k));
    const added = have.filter((k) => !want.includes(k));
    if (missing.length > 0)
      problems.push(`${where} lacks ${missing.join(", ")}`);
    if (added.length > 0) problems.push(`${where} adds ${added.join(", ")}`);
  };
  keysDiffer("the report", Object.keys(data), Object.keys(SHAPE));
  for (const [key, fields] of Object.entries(SHAPE)) {
    const entry = data[key];
    if (entry === undefined) continue;
    if (!isObject(entry)) {
      problems.push(`${key} isn't an object`);
      continue;
    }
    keysDiffer(key, Object.keys(entry), fields);
    for (const field of fields) {
      const value = entry[field];
      if (value === undefined) continue;
      if (field === "score") {
        if (
          typeof value !== "number" ||
          !Number.isInteger(value) ||
          value < 1 ||
          value > 10
        ) {
          problems.push(
            `${key}.score is ${JSON.stringify(value)}, not a whole number from 1 to 10`,
          );
        }
      } else if (typeof value !== "string" || value.trim() === "") {
        problems.push(
          `${key}.${field} is ${typeof value === "string" ? "empty" : "not a string"}`,
        );
      }
    }
  }
  if (problems.length > 0) return { ok: false, problems };
  // Every key, field and type was checked against SHAPE above.
  return { ok: true, report: data as SceneReport };
}

// ---------------------------------------------------------------------------
// Quotes.

/** Straight quote marks for curly ones, and single spaces for any whitespace. */
export function normalise(text: string): string {
  return text
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

const OUTER_QUOTES = /^(["'])(.*)\1$/s;
const withoutEmphasis = (text: string) => text.replace(/[*_]/g, "");

/**
 * How a quote was found in the scene: as given, after JSON unescaping and
 * normalising quote marks and whitespace; or only without one pair of quote
 * marks around the whole of it; or only once markdown emphasis (`*`, `_`) is
 * ignored in both; or not at all. The quote itself is never corrected.
 */
export type QuoteMatch =
  | "verbatim"
  | "without outer quotes"
  | "ignoring emphasis"
  | "not in scene";

export function findQuote(quote: string, scene: string): QuoteMatch {
  const text = normalise(scene);
  const q = normalise(quote);
  if (q !== "" && text.includes(q)) return "verbatim";
  const inner = OUTER_QUOTES.exec(q)?.[2]?.trim();
  if (inner !== undefined && inner !== "" && text.includes(inner)) {
    return "without outer quotes";
  }
  const plain = withoutEmphasis(text);
  const candidates = [q, inner].filter(
    (c): c is string => c !== undefined && c !== "",
  );
  if (candidates.some((c) => plain.includes(withoutEmphasis(c)))) {
    return "ignoring emphasis";
  }
  return "not in scene";
}

export type QuoteCheck = { field: string; quote: string; match: QuoteMatch };

/** Every evidence quote and the best and worst moments, checked against the scene. */
export function checkQuotes(report: SceneReport, scene: string): QuoteCheck[] {
  const quotes: [string, string][] = [
    ...CRITERIA.map((c): [string, string] => [
      `${c}.evidence`,
      report[c].evidence,
    ]),
    ["best_moment.quote", report.best_moment.quote],
    ["worst_moment.quote", report.worst_moment.quote],
  ];
  return quotes.map(([field, quote]) => ({
    field,
    quote,
    match: findQuote(quote, scene),
  }));
}

// ---------------------------------------------------------------------------
// Layout. A round directory holds `scenes/<id>.md` and `so-far/<id>.md`;
// output goes to `<round>/judging/<id>/<judge>/`, which no session mounts.

/** The scene IDs in a round: every `scenes/<id>.md`, each with its `so-far/<id>.md`. */
export function sceneIds(round: string): string[] {
  const dir = join(round, "scenes");
  if (!existsSync(dir)) throw new Error(`${dir} doesn't exist.`);
  const ids = readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.slice(0, -3))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (ids.length === 0) throw new Error(`${dir} holds no scenes.`);
  for (const id of ids) {
    if (!/^[A-Za-z0-9_-]+$/.test(id)) {
      throw new Error(
        `scenes/${id}.md: scene IDs are letters, digits, - and _.`,
      );
    }
    if (!existsSync(join(round, "so-far", `${id}.md`))) {
      throw new Error(`scenes/${id}.md has no so-far/${id}.md.`);
    }
  }
  return ids;
}

export const slotDir = (round: string, scene: string, judge: SceneJudge) =>
  join(round, "judging", scene, judge);

export function statusOf(dir: string): "ok" | "failed" | "running" | undefined {
  const path = join(dir, "STATUS");
  if (!existsSync(path)) return undefined;
  const first = readFileSync(path, "utf8").split("\n")[0]?.trim();
  return first === "ok" || first === "failed" || first === "running"
    ? first
    : undefined;
}

/** A judge's earlier runs on a scene moved aside as `<judge>-failed-<n>`, in order. */
export function failedRuns(
  round: string,
  scene: string,
  judge: SceneJudge,
): string[] {
  const dir = join(round, "judging", scene);
  if (!existsSync(dir)) return [];
  const pattern = new RegExp(`^${judge}-failed-([1-9]\\d*)$`);
  return readdirSync(dir)
    .flatMap((name) => {
      const n = pattern.exec(name)?.[1];
      return n === undefined ? [] : [[Number(n), name] as const];
    })
    .sort((a, b) => a[0] - b[0])
    .map(([, name]) => name);
}

/**
 * Whether a judge's run on a scene is still to do: not if it is ok. A failed
 * one is moved aside to `<judge>-failed-<n>` so a fresh judge replaces it.
 * Refuses a run left `running`, by a runner killed with SIGKILL: mark it
 * failed by hand first.
 */
export function claimSlot(
  round: string,
  scene: string,
  judge: SceneJudge,
): boolean {
  const dir = slotDir(round, scene, judge);
  const status = statusOf(dir);
  if (status === "ok") return false;
  if (status === "running") {
    throw new Error(
      `${dir} is marked running; if no runner is, set its STATUS to failed by hand.`,
    );
  }
  if (existsSync(dir)) {
    renameSync(
      dir,
      join(
        dirname(dir),
        `${judge}-failed-${failedRuns(round, scene, judge).length + 1}`,
      ),
    );
  }
  return true;
}

// ---------------------------------------------------------------------------
// One judge's run.

export type SceneRun = {
  scene: string;
  judge: SceneJudge;
  model: string;
  /** 1 for the first run of this judge on this scene, then each replacement. */
  run: number;
  rubricPath: string;
  rubricCommit: string;
  /** The rubric text the session got: its sha256 and where it was cut. */
  rubric: { sha256: string; cut: string };
  runDir: string;
  /** sha256 of every file the run directory held before the session. */
  inputs: Record<string, string>;
  command: string[];
  sandbox: string[];
  /** The credentials the sandbox mounted read-only: sha256 before and after. */
  credentials: { path: string; before: string; after?: string };
  startedAt: string;
  exitCode?: number;
  durationSeconds?: number;
  transcript?: TranscriptSummary | GrokSummary;
  problems: string[];
  interrupted?: "SIGINT" | "SIGTERM";
};

const writeJson = (path: string, value: unknown) =>
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

const writeStatus = (
  out: string,
  problems: readonly string[],
  note?: string | undefined,
) =>
  writeFileSync(
    join(out, "STATUS"),
    `${problems.length === 0 ? "ok" : "failed"}\n${problems.map((p) => `- ${p}\n`).join("")}${note === undefined ? "" : `${note}\n`}`,
  );

const brief = (detail: string) =>
  detail.length > 300
    ? `${detail.slice(0, 300)}... (cut; whole in run.json)`
    : detail;

/** The session for one judge: its command (after bwrap) and bwrap's options. */
export function sessionFor(
  judge: SceneJudge,
  runDir: string,
  out: string,
  prompt: string,
): { command: string[]; sandbox: string[]; credentials: string } {
  const { kind, model } = SCENE_JUDGES[judge];
  if (kind === "claude") {
    const session = judgeSession(model, runDir, CLAUDE_TOOLS);
    return {
      command: ["claude", "-p", prompt, ...session.args],
      sandbox: session.sandbox,
      credentials: credentialsPath(),
    };
  }
  const configPath = join(out, "grok-config.toml");
  writeFileSync(configPath, GROK_CONFIG);
  return {
    command: ["grok", "-p", prompt, ...grokArgs(GROK_MAX_TURNS)],
    sandbox: grokSandboxArgs({ workdir: runDir, configPath }),
    credentials: grokAuthPath(),
  };
}

/**
 * The session's final reply: for Claude, the `result` event's text; for
 * Grok, the text it streamed after its last tool call.
 */
export function finalReply(
  kind: "claude" | "grok",
  jsonl: string,
): string | undefined {
  let reply: string | undefined;
  for (const line of jsonl.split("\n")) {
    let event: unknown;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (typeof event !== "object" || event === null) continue;
    const type: unknown = Reflect.get(event, "type");
    if (kind === "claude" && type === "result") {
      const result: unknown = Reflect.get(event, "result");
      reply = typeof result === "string" ? result : undefined;
    } else if (kind === "grok" && type === "tool_call") {
      reply = undefined;
    } else if (kind === "grok" && type === "text") {
      const data: unknown = Reflect.get(event, "data");
      if (typeof data === "string") reply = (reply ?? "") + data;
    }
  }
  return reply;
}

/** What the transcript and the files the session left show went wrong. */
export function sessionProblems({
  judge,
  exitCode,
  jsonl,
  runDir,
  filesDir,
  inputs,
}: {
  judge: SceneJudge;
  exitCode: number;
  jsonl: string;
  runDir: string;
  filesDir: string;
  inputs: Record<string, string>;
}): {
  problems: string[];
  transcript: TranscriptSummary | GrokSummary;
  reply?: string;
  report?: SceneReport;
} {
  const { kind, model } = SCENE_JUDGES[judge];
  const problems: string[] = [];
  if (exitCode === 124 || exitCode === 137) {
    problems.push(`timed out after ${TIMEOUT_SECONDS}s`);
  } else if (exitCode !== 0) {
    problems.push(`${kind} exited ${exitCode}`);
  }
  let transcript: TranscriptSummary | GrokSummary;
  if (kind === "claude") {
    const summary = judgeTranscript(jsonl, runDir);
    problems.push(...modelProblems(jsonl, summary, model));
    transcript = summary;
  } else {
    const summary = checkGrokTranscript(jsonl, runDir);
    problems.push(...grokModelProblems(summary));
    transcript = summary;
  }
  if (transcript.unparsed > 0) {
    problems.push(
      `${transcript.unparsed} transcript lines weren't JSON, so the transcript check couldn't read them`,
    );
  }
  for (const f of transcript.outside) {
    problems.push(`outside its inputs: ${f.tool}: ${brief(f.detail)}`);
  }
  for (const [path, hash] of Object.entries(inputs)) {
    const now = join(filesDir, path);
    if (!existsSync(now) || sha256(now) !== hash) {
      problems.push(`${path} changed during the session`);
    }
  }
  const extra = filesUnder(filesDir).filter(
    (path) => !Object.hasOwn(inputs, path),
  );
  if (extra.length > 0) problems.push(`the run dir gained ${extra.join(", ")}`);
  const reply = finalReply(kind, jsonl);
  if (reply === undefined || reply.trim() === "") {
    problems.push("no final reply");
    return { problems, transcript };
  }
  const parsed = parseReport(reply);
  if (!parsed.ok) {
    problems.push(...parsed.problems.map((p) => `malformed report: ${p}`));
    return { problems, transcript, reply };
  }
  return { problems, transcript, reply, report: parsed.report };
}

/** Run dirs under way, with their records, for the signal handler. */
const running = new Map<string, SceneRun>();

/** One judge on one scene, once: into `<round>/judging/<scene>/<judge>/`. */
export async function runSceneJudge(
  round: string,
  scene: string,
  judge: SceneJudge,
  rubric: Rubric,
  copy: RubricCopy,
): Promise<SceneRun> {
  const out = slotDir(round, scene, judge);
  mkdirSync(out, { recursive: true });
  const record: SceneRun = {
    scene,
    judge,
    model: SCENE_JUDGES[judge].model,
    run: failedRuns(round, scene, judge).length + 1,
    rubricPath: rubric.path,
    rubricCommit: rubric.commit,
    rubric: { sha256: copy.sha256, cut: copy.cut },
    runDir: "",
    inputs: {},
    command: [],
    sandbox: [],
    credentials: { path: "", before: "" },
    startedAt: new Date().toISOString(),
    problems: [],
  };
  running.set(out, record);
  writeFileSync(join(out, "STATUS"), "running\n");
  const label = `[${scene} ${judge} run ${record.run}]`;
  try {
    const runDir = makeRunDir(copy.text, {
      [SCENE_FILE]: join(round, "scenes", `${scene}.md`),
      [SO_FAR_FILE]: join(round, "so-far", `${scene}.md`),
    });
    record.runDir = runDir;
    try {
      record.inputs = Object.fromEntries(
        filesUnder(runDir).map((path) => [path, sha256(join(runDir, path))]),
      );
      const prompt = scenePrompt();
      writeFileSync(join(out, "prompt.md"), prompt);
      const session = sessionFor(judge, runDir, out, prompt);
      record.command = session.command;
      record.sandbox = session.sandbox;
      record.credentials = {
        path: session.credentials,
        before: sha256(session.credentials),
      };
      writeJson(join(out, "run.json"), record);
      console.log(`${label} started ${record.startedAt} on ${record.model}`);
      const started = performance.now();
      const exitCode = await spawnSandboxed(
        session.sandbox,
        session.command,
        TIMEOUT_SECONDS,
        {
          cwd: runDir,
          stdout: join(out, "transcript.jsonl"),
          stderr: join(out, "stderr.txt"),
        },
      ).exited;
      record.exitCode = exitCode;
      record.durationSeconds = Math.round((performance.now() - started) / 1000);
      record.credentials.after = sha256(session.credentials);
      const jsonl = readFileSync(join(out, "transcript.jsonl"), "utf8");
      const result = sessionProblems({
        judge,
        exitCode,
        jsonl,
        runDir,
        filesDir: runDir,
        inputs: record.inputs,
      });
      record.transcript = result.transcript;
      record.problems = result.problems;
      if (result.reply !== undefined) {
        writeFileSync(join(out, REPORT_FILE), result.reply);
      }
      if (result.report !== undefined && result.problems.length === 0) {
        const sceneText = readFileSync(join(runDir, SCENE_FILE), "utf8");
        writeJson(join(out, "scores.json"), {
          report: result.report,
          quotes: checkQuotes(result.report, sceneText),
        });
      }
    } finally {
      cpSync(runDir, join(out, "files"), { recursive: true });
      rmSync(runDir, { recursive: true });
    }
  } catch (error) {
    record.problems.push(
      `the runner failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    running.delete(out);
    writeJson(join(out, "run.json"), record);
    writeStatus(out, record.problems, credentialsNote(record.credentials));
  }
  console.log(
    `${label} exit ${record.exitCode ?? "none"}, ${record.durationSeconds ?? 0}s, ${record.problems.length === 0 ? "ok" : `FAILED: ${record.problems.join("; ")}`}`,
  );
  return record;
}

function onInterrupt(signal: "SIGINT" | "SIGTERM"): void {
  for (const pid of childPids()) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Already gone.
    }
  }
  for (const [out, record] of running) {
    record.interrupted = signal;
    record.problems.push(`the runner was interrupted by ${signal}`);
    if (record.runDir !== "" && existsSync(record.runDir)) {
      if (!existsSync(join(out, "files"))) {
        cpSync(record.runDir, join(out, "files"), { recursive: true });
      }
      rmSync(record.runDir, { recursive: true, force: true });
    }
    writeJson(join(out, "run.json"), record);
    writeStatus(out, record.problems);
  }
  process.exit(signal === "SIGINT" ? 130 : 143);
}

export type Task = { scene: string; judge: SceneJudge; tries: number };

/**
 * Judges a round: every scene by every judge named, skipping runs already
 * ok. Runs go in waves of as many judges as memory allows (measured before
 * each wave); tokens are checked on the host before each wave so they
 * outlive it. A failed run is moved aside and its judge requeued on a fresh
 * session, up to `attempts` runs per judge and scene in this invocation.
 * Writes the tables at the end.
 */
export async function judgeRound(
  roundArg: string,
  {
    rubricPath = DEFAULT_RUBRIC,
    rubricRev = "HEAD",
    scenes,
    judges = SCENE_JUDGE_NAMES,
    attempts = DEFAULT_ATTEMPTS,
  }: {
    rubricPath?: string | undefined;
    rubricRev?: string | undefined;
    scenes?: string[] | undefined;
    judges?: readonly SceneJudge[] | undefined;
    attempts?: number | undefined;
  } = {},
): Promise<{ records: SceneRun[]; incomplete: Task[] }> {
  const round = resolve(roundArg);
  const all = sceneIds(round);
  for (const id of scenes ?? []) {
    if (!all.includes(id)) throw new Error(`The round has no scene ${id}.`);
  }
  const rubric = rubricAt(rubricPath, rubricRev);
  const copy = rubricFor(rubric, "part1");
  let queue: Task[] = (scenes ?? all).flatMap((scene) =>
    judges.map((judge) => ({ scene, judge, tries: 0 })),
  );
  // Check every slot before starting any.
  for (const { scene, judge } of queue) {
    if (statusOf(slotDir(round, scene, judge)) === "running") {
      throw new Error(
        `${slotDir(round, scene, judge)} is marked running; if no runner is, set its STATUS to failed by hand.`,
      );
    }
  }
  queue = queue.filter(
    ({ scene, judge }) => statusOf(slotDir(round, scene, judge)) !== "ok",
  );
  const records: SceneRun[] = [];
  const incomplete: Task[] = [];
  process.on("SIGINT", onInterrupt);
  process.on("SIGTERM", onInterrupt);
  try {
    while (queue.length > 0) {
      const gib = availableGib();
      const width = concurrencyFor(gib);
      const wave = queue.splice(0, width);
      console.log(
        `${gib.toFixed(1)} GiB available: ${wave.length} judge(s) at once.`,
      );
      const needed = (TIMEOUT_SECONDS + 600) * 1000;
      if (wave.some((t) => SCENE_JUDGES[t.judge].kind === "claude")) {
        ensureToken(needed, hostToken);
      }
      if (wave.some((t) => SCENE_JUDGES[t.judge].kind === "grok")) {
        ensureGrokToken(needed, hostGrokToken);
      }
      const done = await Promise.all(
        wave.map(async (task) => {
          claimSlot(round, task.scene, task.judge);
          const record = await runSceneJudge(
            round,
            task.scene,
            task.judge,
            rubric,
            copy,
          );
          return { task, record };
        }),
      );
      for (const { task, record } of done) {
        records.push(record);
        if (record.problems.length === 0) continue;
        if (record.interrupted !== undefined) continue;
        const next = { ...task, tries: task.tries + 1 };
        if (next.tries < attempts) queue.push(next);
        else incomplete.push(next);
      }
    }
  } finally {
    process.off("SIGINT", onInterrupt);
    process.off("SIGTERM", onInterrupt);
  }
  tabulate(round);
  return { records, incomplete };
}

// ---------------------------------------------------------------------------
// The tables.

type Scores = { report: SceneReport; quotes: QuoteCheck[] };

const cell = (text: string) => text.replace(/\|/g, "\\|").replace(/\s+/g, " ");
const mark = (match: QuoteMatch) =>
  match === "verbatim"
    ? "found"
    : match === "not in scene"
      ? "**NOT IN SCENE**"
      : `found ${match}`;

/**
 * Writes `<round>/judging/scores.md` and `scores.json`: per scene, a scores
 * table (criterion × judge), each judge's evidence with its quote check,
 * the best and worst moments, and the failed runs replaced. Never combines
 * scores across judges. Refuses runs scored under different rubric texts.
 */
export function tabulate(roundArg: string): string {
  const round = resolve(roundArg);
  const rubrics = new Set<string>();
  const json: Record<string, unknown> = {};
  const lines = [
    "# Scene scores",
    "",
    "Per judge, never combined. Each quote is checked against the scene after JSON unescaping and normalising quote marks and whitespace.",
    "",
  ];
  for (const scene of sceneIds(round)) {
    const ok: Partial<Record<SceneJudge, { run: SceneRun; scores: Scores }>> =
      {};
    const failures: string[] = [];
    for (const judge of SCENE_JUDGE_NAMES) {
      const dir = slotDir(round, scene, judge);
      if (statusOf(dir) === "ok" && existsSync(join(dir, "scores.json"))) {
        const run = JSON.parse(
          readFileSync(join(dir, "run.json"), "utf8"),
        ) as SceneRun;
        rubrics.add(
          `${run.rubricPath} at ${run.rubricCommit} (text sha256 ${run.rubric.sha256})`,
        );
        ok[judge] = {
          run,
          scores: JSON.parse(
            readFileSync(join(dir, "scores.json"), "utf8"),
          ) as Scores,
        };
      } else if (existsSync(dir)) {
        failures.push(
          `- ${judge}: \`judging/${scene}/${judge}\` is ${statusOf(dir) ?? "unfinished"}; no scores.`,
        );
      } else {
        failures.push(`- ${judge}: not run.`);
      }
      for (const name of failedRuns(round, scene, judge)) {
        const status = readFileSync(
          join(round, "judging", scene, name, "STATUS"),
          "utf8",
        )
          .split("\n")
          .slice(1)
          .filter((l) => l.trim() !== "")
          .map((l) => l.replace(/^- /, ""));
        failures.push(
          `- ${judge}: \`judging/${scene}/${name}\` failed and was replaced: ${status.join("; ")}`,
        );
      }
    }
    const judges = SCENE_JUDGE_NAMES.filter((j) => ok[j] !== undefined);
    const score = (j: SceneJudge, c: Criterion | "overall") => {
      const r = ok[j]?.scores.report;
      return r === undefined ? "" : String(r[c].score);
    };
    lines.push(`## Scene ${scene}`, "");
    if (judges.length === 0) {
      lines.push("No judge has scored this scene.", "");
    } else {
      lines.push(
        `| Criterion | ${judges.map((j) => `${j} (${SCENE_JUDGES[j].model})`).join(" | ")} |`,
        `| --- | ${judges.map(() => "---").join(" | ")} |`,
        ...[...CRITERIA, "overall" as const].map(
          (c) => `| ${c} | ${judges.map((j) => score(j, c)).join(" | ")} |`,
        ),
        "",
        "### Evidence",
        "",
      );
      for (const c of CRITERIA) {
        lines.push(`**${c}**`, "");
        for (const j of judges) {
          const s = ok[j]?.scores;
          const check = s?.quotes.find((q) => q.field === `${c}.evidence`);
          if (s === undefined || check === undefined) continue;
          lines.push(
            `- ${j} (${s.report[c].score}): "${cell(check.quote)}" (${mark(check.match)})`,
          );
        }
        lines.push("");
      }
      lines.push("### Best and worst moments", "");
      for (const j of judges) {
        const s = ok[j]?.scores;
        if (s === undefined) continue;
        const q = (field: string) =>
          s.quotes.find((x) => x.field === field)?.match ?? "not in scene";
        lines.push(
          `- ${j}, best: "${cell(s.report.best_moment.quote)}" (${mark(q("best_moment.quote"))}). ${cell(s.report.best_moment.why)}`,
          `- ${j}, worst: "${cell(s.report.worst_moment.quote)}" (${mark(q("worst_moment.quote"))}). ${cell(s.report.worst_moment.why)}`,
        );
      }
      lines.push("");
      const missing = judges.flatMap((j) =>
        (ok[j]?.scores.quotes ?? [])
          .filter((q) => q.match === "not in scene")
          .map((q) => `${j} ${q.field}`),
      );
      lines.push(
        `Quote verification: ${missing.length === 0 ? "every quote found in the scene." : `not in the scene: ${missing.join(", ")}.`}`,
        "",
      );
    }
    lines.push("### Runs", "");
    for (const j of judges) {
      const run = ok[j]?.run;
      if (run === undefined) continue;
      lines.push(
        `- ${j}: run ${run.run}, \`judging/${scene}/${j}/report.md\`, ${run.durationSeconds ?? 0}s.`,
      );
      const note =
        run.credentials === undefined
          ? undefined
          : credentialsNote(run.credentials);
      if (note !== undefined) lines.push(`  - ${j}: ${note}`);
    }
    lines.push(...failures, "");
    json[scene] = Object.fromEntries(
      judges.map((j) => [
        j,
        { model: SCENE_JUDGES[j].model, run: ok[j]?.run.run, ...ok[j]?.scores },
      ]),
    );
  }
  if (rubrics.size > 1) {
    throw new Error(
      `Runs in this round used different rubrics, so their scores aren't compared: ${[...rubrics].join("; ")}.`,
    );
  }
  lines.splice(4, 0, `Rubric: ${[...rubrics][0] ?? "none yet"}.`, "");
  const text = lines.join("\n");
  mkdirSync(join(round, "judging"), { recursive: true });
  writeFileSync(join(round, "judging", "scores.md"), text);
  writeJson(join(round, "judging", "scores.json"), json);
  return text;
}

// ---------------------------------------------------------------------------

const USAGE = `Usage:
  scenes.ts judge <round-dir> [--rubric <path>] [--rubric-commit <rev>] [--scene <id>]... [--judge <opus|sonnet|fable|grok>]... [--attempts <n>]
  scenes.ts tabulate <round-dir>`;

export async function main(argv: string[]): Promise<void> {
  const [command, ...rest] = argv;
  const VALUED = [
    "--rubric",
    "--rubric-commit",
    "--scene",
    "--judge",
    "--attempts",
  ];
  const flags = (name: string) =>
    rest.flatMap((arg, i) => (arg === name ? [rest[i + 1] ?? ""] : []));
  const positional = rest.filter(
    (arg, i) => !arg.startsWith("--") && !VALUED.includes(rest[i - 1] ?? ""),
  );
  const [round] = positional;
  if (command === "judge" && round !== undefined) {
    const judges = flags("--judge");
    const bad = judges.filter((j) => !isSceneJudge(j));
    const attempts = Number(flags("--attempts")[0] ?? DEFAULT_ATTEMPTS);
    if (bad.length === 0 && Number.isInteger(attempts) && attempts >= 1) {
      const scenes = flags("--scene");
      const { incomplete } = await judgeRound(round, {
        rubricPath: flags("--rubric")[0],
        rubricRev: flags("--rubric-commit")[0],
        scenes: scenes.length > 0 ? scenes : undefined,
        judges: judges.length > 0 ? judges.filter(isSceneJudge) : undefined,
        attempts,
      });
      console.log(`Wrote ${join(resolve(round), "judging", "scores.md")}.`);
      if (incomplete.length > 0) {
        console.error(
          `No ok run after ${attempts} tries: ${incomplete.map((t) => `${t.scene}/${t.judge}`).join(", ")}.`,
        );
        process.exit(1);
      }
      return;
    }
  }
  if (command === "tabulate" && round !== undefined) {
    tabulate(round);
    console.log(`Wrote ${join(resolve(round), "judging", "scores.md")}.`);
    return;
  }
  console.error(USAGE);
  process.exit(2);
}

if (import.meta.main) {
  await main(process.argv.slice(2));
}
