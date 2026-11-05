/**
 * One round of mission worldcrafter-gwx3 (issue worldcrafter-x2ij, decision
 * worldcrafter-jeue): a sandboxed Opus 5.5 writer builds a world and a
 * novel-scale outline in a story file with the story CLI, the orchestrator
 * picks points from it, the same writer session is resumed to write a scene
 * at each, and a fresh agent per scene writes its story so far from the
 * outline up to it. Phases run separately. See README.md beside this file.
 *
 *   bun scripts/round/round.ts outline <round-dir> [--premise <text>] [--outline-size <text>]
 *   bun scripts/round/round.ts beats <round-dir>
 *   bun scripts/round/round.ts choose <round-dir> <scene-id> --reason <text>
 *   bun scripts/round/round.ts choose-random <round-dir> --seed <n> [--range <a>-<b>] [--reason <text>]
 *   bun scripts/round/round.ts scenes <round-dir> [--words <text>]
 *   bun scripts/round/round.ts so-far <round-dir>
 *   bun scripts/round/round.ts vocab <round-dir>
 *   bun scripts/round/round.ts recheck <round-dir> <phase>
 */

import { randomUUID } from "node:crypto";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseStory, type Story } from "../../src/story/story";
import { buildTool } from "../comparison/comparison";
import {
  BIN,
  BWRAP,
  credentialsPath,
  ensureToken,
  SANDBOX_HOME,
  spawnSandboxed,
  systemMounts,
  TOOL_MOUNT,
} from "../comparison/sandbox";
import {
  checkTranscript,
  type TranscriptSummary,
} from "../comparison/transcript";
import {
  availableGib,
  filesUnder,
  hostToken,
  judgeSession,
  judgeTranscript,
  modelProblems,
  persistedOutputs,
  sha256,
} from "../judging/panel";
import { KIND_NAMES, LIST_KINDS } from "../story";

export const MODEL = "claude-opus-5-5";

/** As Sumeet gave it (decision worldcrafter-jeue). */
export const WARLOCK_PREMISE =
  "Wait. Let me get this straight. You are a warlock that doesn't have a single patron, but hundreds of lesser patrons all watching you at the same time? And... you call them 'Chat'?";

export const DEFAULT_OUTLINE_SIZE = "roughly 25 to 40 chapters' worth of";
export const DEFAULT_SCENE_WORDS = "1,200 to 2,000";

/**
 * Session bounds. The comparison gave each step 2700 s; a novel-scale world
 * and outline is far more, so the outline gets two hours. A scene is one
 * scene's prose plus links and commits. A story so far is one short reply.
 */
export const TIMEOUTS = { outline: 7200, scene: 3600, soFar: 900 } as const;

/** Wait before a session while less memory than this is available. */
const MIN_AVAILABLE_GIB = 2;
/** The writer reads, writes, edits and runs the CLI and git. No web, no subagents. */
const WRITER_TOOLS = "Bash,Read,Edit,Write";
/** Where the writer sees its story repository. */
export const STORY_MOUNT = "/story";
/** The story file and log, in the story repository. */
export const STORY_FILE = "story.json";
export const MODEL_GAPS = "model-gaps.md";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../../..");
/** What the round's tool is built from, for the dirty check. */
const TOOL_PATHS = [
  "app/scripts/story.ts",
  "app/src/story",
  "app/package.json",
  "app/bun.lock",
  ".agents/skills/story-sketch",
];

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
  if (r.code !== 0)
    throw new Error(`\`${cmd.join(" ")}\` failed (${r.code}): ${r.err}`);
  return r.out;
}

const writeJson = (path: string, value: unknown) =>
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(path, "utf8")) as T;

export const words = (text: string) =>
  text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

function waitForMemory(): void {
  while (availableGib() < MIN_AVAILABLE_GIB) {
    console.log(
      `Less than ${MIN_AVAILABLE_GIB} GiB available; waiting a minute.`,
    );
    Bun.sleepSync(60_000);
  }
}

// ---------------------------------------------------------------------------
// The round directory.

export const paths = (round: string) => ({
  run: join(round, "run.json"),
  tool: join(round, "tool"),
  /** The writer's sandbox home, kept so its session can be resumed. */
  home: join(round, "writer-home"),
  /** The story repository, mounted at STORY_MOUNT. */
  work: join(round, "work"),
  points: join(round, "points.json"),
  phases: join(round, "phases"),
  scenes: join(round, "scenes"),
  soFar: join(round, "so-far"),
  vocabulary: join(round, "vocabulary.md"),
});

export type SessionRecord = {
  phase: string;
  model: string;
  timeoutSeconds: number;
  command: string[];
  sandbox: string[];
  startedAt: string;
  exitCode?: number;
  durationSeconds?: number;
  /** The session's working directory, as the sandbox sees it. */
  cwd: string;
  credentials: { before: string; after?: string };
  transcript?: TranscriptSummary;
  /** What the exit, the transcript and the credentials show; `recheck` redoes these. */
  checkProblems: string[];
  /** Everything wrong: `checkProblems` and what the phase's own checks found. */
  problems: string[];
};

export type RoundRecord = {
  premise: string;
  outlineSize: string;
  model: string;
  /** `claude --version` on the host when the round started. */
  claudeVersion: string;
  /** The commit the tool and skill were built from, and what was uncommitted. */
  commit: string;
  uncommitted: string;
  builtAt: string;
  /** sha256 of every file under tool/. */
  tool: Record<string, string>;
  /** The writer's session, resumed for every scene. */
  sessionId: string;
  sessions: SessionRecord[];
};

export type Point = {
  sceneId: string;
  title: string;
  /** 1-based place in the telling order when it was chosen, of `beats`. */
  position: number;
  beats: number;
  how: "chosen" | "random";
  reason: string;
  seed?: number;
  /** For a random point drawn from part of the outline: the positions, inclusive. */
  range?: { from: number; to: number };
  chosenAt: string;
};

/** `<a>-<b>`: 1-based positions in telling order, inclusive, a <= b. */
export function parseRange(text: string): { from: number; to: number } {
  const match = /^([1-9]\d*)-([1-9]\d*)$/.exec(text);
  const from = Number(match?.[1]);
  const to = Number(match?.[2]);
  if (match === null || from > to) {
    throw new Error(
      `--range takes <a>-<b> with 1 <= a <= b, not ${JSON.stringify(text)}.`,
    );
  }
  return { from, to };
}

const readRound = (round: string) => readJson<RoundRecord>(paths(round).run);
const saveRound = (round: string, record: RoundRecord) =>
  writeJson(paths(round).run, record);

export function readPoints(round: string): Point[] {
  const path = paths(round).points;
  return existsSync(path) ? readJson<Point[]>(path) : [];
}

/** The story file as it stands in the round's story repository. */
export function readStory(round: string): Story {
  const text = readRepoFile(paths(round).work, STORY_FILE);
  if (text === undefined) {
    throw new Error(
      `${STORY_FILE} is missing, or isn't a plain file in the story repository.`,
    );
  }
  const result = parseStory(text);
  if (result.isErr()) {
    throw new Error(
      `${STORY_FILE} doesn't parse: ${JSON.stringify(result.error)}`,
    );
  }
  return result.value;
}

// ---------------------------------------------------------------------------
// Prompts. Written for this round, not taken from the comparison: nothing
// here bounds the bible's length or treats `render` as the story (8och).

export function outlinePrompt({
  premise,
  outlineSize,
  craft,
  skill,
}: {
  premise: string;
  outlineSize: string;
  craft: string;
  skill: string;
}): string {
  return `${[
    "Work only in the current directory (a git repository), apart from running the tool, whose path is in the `STORY_CLI` environment variable. Don't read files anywhere else.",
    "",
    "## Your task",
    "",
    `Build the world and the outline of a novel from the premise below, in the story file \`${STORY_FILE}\`, with the tool described below. \`${STORY_FILE}\` doesn't exist yet: start it with \`init\` and the premise.`,
    "",
    `Make the world rich and full. Outline a novel-length story, ${outlineSize} beats, as scenes in the story file in telling order, each with a summary of what happens in it. Don't write prose yet: you will be asked for scenes from this outline later, one at a time.`,
    "",
    `Keep \`${MODEL_GAPS}\` as the skill file below says.`,
    "",
    `Premise: ${premise}`,
    "",
    "## How to work",
    "",
    "- Commit after each meaningful change, with a message that says what changed in the story.",
    "",
    "## Advice on finding a story",
    "",
    "Follow this advice.",
    "",
    "<craft>",
    craft.trim(),
    "</craft>",
    "",
    "## The tool",
    "",
    "This is the skill file for the tool. Where it says to read `craft.md`, that is the advice above.",
    "",
    "<skill>",
    skill.trim(),
    "</skill>",
  ].join("\n")}\n`;
}

export function scenePrompt({
  point,
  index,
  count,
  sceneWords,
}: {
  point: Pick<Point, "sceneId" | "title">;
  index: number;
  count: number;
  sceneWords: string;
}): string {
  return [
    `Now write scene \`${point.sceneId}\` ("${point.title}") of your outline, the ${ordinal(index)} of the ${count} scenes you'll be asked for, which come in telling order.`,
    "",
    `Write its prose in its scene file, \`scenes/${point.sceneId}.md\` (\`show scene:${point.sceneId}\` prints the path), about ${sceneWords} words. It is a scene in a novel: prose only, as a reader will read it, with no notes and nothing about the tool, the story file or the outline.`,
    "",
    `Then link the scene in the story file to what it reveals, implies and withholds, update the story file where writing the scene showed it needs it, keep \`${MODEL_GAPS}\` going, and commit.`,
  ].join("\n");
}

const ordinal = (n: number) =>
  ["first", "second", "third", "fourth", "fifth", "sixth"][n - 1] ?? `${n}th`;

export function soFarPrompt(): string {
  return [
    "This directory holds `outline.md`: the premise of a novel and what happens in it, in order, up to the scene a reader is about to start. Read it in full. Read nothing else.",
    "",
    "Write the story so far for that reader: 300 to 500 words of plain prose saying what has happened and who the people are, in the order a reader met it. Hold to what the outline says: don't add events, and don't guess at what comes next. Don't mention the outline, notes, scenes, beats or chapters.",
    "",
    "Give it as your final reply, with no heading and nothing before or after it. Don't create or change any file.",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// The outline, as beats and as the story so far's source.

export type Beat = {
  position: number;
  id: string;
  title: string;
  summary: string;
};

export function beatsOf(story: Story): Beat[] {
  return story.scenes.map((scene, i) => ({
    position: i + 1,
    id: scene.id,
    title: scene.title,
    summary: scene.summary,
  }));
}

export function beatsText(story: Story): string {
  return `${beatsOf(story)
    .map(
      (b) =>
        `${b.position}. ${b.id}: ${b.title}${b.summary === "" ? "" : `\n   ${b.summary}`}`,
    )
    .join("\n")}\n`;
}

/**
 * What a story-so-far agent gets: the premise and the beats before the scene,
 * in telling order, as plain text with no IDs. Nothing at or after it.
 */
export function outlineBefore(story: Story, sceneId: string): string {
  const beats = beatsOf(story);
  const at = beats.findIndex((b) => b.id === sceneId);
  if (at === -1) throw new Error(`The outline has no scene ${sceneId}.`);
  return `${[
    "# Outline",
    "",
    `Premise: ${story.premise}`,
    "",
    ...beats
      .slice(0, at)
      .map(
        (b) =>
          `${b.position}. ${b.title}.${b.summary === "" ? "" : ` ${b.summary}`}`,
      ),
  ].join("\n")}\n`;
}

/** Chosen points in the outline's current telling order, each with its place. */
export function pointsInOrder(
  story: Story,
  points: readonly Point[],
): (Point & { index: number })[] {
  const ids = story.scenes.map((s) => s.id);
  for (const p of points) {
    if (!ids.includes(p.sceneId))
      throw new Error(`The outline no longer has chosen scene ${p.sceneId}.`);
  }
  return [...points]
    .sort((a, b) => ids.indexOf(a.sceneId) - ids.indexOf(b.sceneId))
    .map((p, i) => ({ ...p, index: i + 1 }));
}

// ---------------------------------------------------------------------------
// Choosing points.

export const MAX_POINTS = 4;

/** Mulberry32: a small seeded generator, so a random choice can be redone. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function choosePoint(
  story: Story,
  points: readonly Point[],
  choice:
    | { sceneId: string; reason: string }
    | { seed: number; reason?: string; range?: { from: number; to: number } },
  now = new Date(),
): Point {
  if (points.length >= MAX_POINTS)
    throw new Error(`${MAX_POINTS} points are chosen already.`);
  const beats = beatsOf(story);
  const taken = new Set(points.map((p) => p.sceneId));
  if ("sceneId" in choice) {
    const beat = beats.find((b) => b.id === choice.sceneId);
    if (beat === undefined)
      throw new Error(`The outline has no scene ${choice.sceneId}.`);
    if (taken.has(beat.id)) throw new Error(`${beat.id} is chosen already.`);
    if (choice.reason.trim() === "")
      throw new Error("Say how it was chosen with --reason.");
    return {
      sceneId: beat.id,
      title: beat.title,
      position: beat.position,
      beats: beats.length,
      how: "chosen",
      reason: choice.reason,
      chosenAt: now.toISOString(),
    };
  }
  const range = choice.range;
  if (range !== undefined && range.to > beats.length) {
    throw new Error(
      `--range ${range.from}-${range.to} goes past the outline's ${beats.length} beats.`,
    );
  }
  const open = beats.filter(
    (b) =>
      !taken.has(b.id) &&
      (range === undefined ||
        (b.position >= range.from && b.position <= range.to)),
  );
  if (open.length === 0) {
    throw new Error(
      range === undefined
        ? "Every beat is chosen already."
        : `Every beat in ${range.from}-${range.to} is chosen already.`,
    );
  }
  const beat = open[Math.floor(seeded(choice.seed)() * open.length)];
  if (beat === undefined) throw new Error("No beat was drawn.");
  return {
    sceneId: beat.id,
    title: beat.title,
    position: beat.position,
    beats: beats.length,
    how: "random",
    reason:
      choice.reason ??
      `Drawn uniformly from the ${open.length} beats ${range === undefined ? "" : `in ${range.from}-${range.to} `}not already chosen, with seed ${choice.seed} (mulberry32).`,
    seed: choice.seed,
    ...(range === undefined ? {} : { range }),
    chosenAt: now.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// The vocabulary check on everything a judge reads.

/** Terms that belong to the tool, never to a story's prose. */
const FIXED_TERMS = [
  "story.json",
  "STORY_CLI",
  "model-gaps",
  "Demiurge",
  "gap ref",
  "open-question",
  "reader-question",
];
/**
 * Every kind a ref or listing names, as the CLI spells it: every record kind
 * (KIND_NAMES is typed over all of them, candidate included) and `list`'s
 * kinds, which add constraint. A kind added to the story model is covered.
 */
export const VOCAB_KINDS: readonly string[] = [
  ...new Set([...Object.values(KIND_NAMES), ...LIST_KINDS]),
].sort();
const REF = new RegExp(
  `\\b(?:${VOCAB_KINDS.join("|")}):[a-z0-9][a-z0-9/-]*`,
  "g",
);

/** The CLI's hyphenated command names, from its `--help`: `add-actor`, `reader-order`. */
export function commandNames(help: string): string[] {
  const names = new Set<string>();
  for (const match of help.matchAll(/^ {2}([a-z]+(?:-[a-z]+)+)\b/gm)) {
    if (match[1] !== undefined) names.add(match[1]);
  }
  return [...names].sort();
}

export type VocabHit = {
  file: string;
  line: number;
  term: string;
  text: string;
};

export function vocabHits(
  file: string,
  text: string,
  commands: readonly string[],
): VocabHit[] {
  const hits: VocabHit[] = [];
  const terms = [...FIXED_TERMS, ...commands];
  text.split("\n").forEach((line, i) => {
    const found = new Set<string>();
    for (const m of line.matchAll(REF)) found.add(m[0]);
    for (const term of terms) {
      const pattern = new RegExp(
        `(?<![\\w-])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`,
        "i",
      );
      if (pattern.test(line)) found.add(term);
    }
    for (const term of found) {
      hits.push({ file, line: i + 1, term, text: line.trim().slice(0, 200) });
    }
  });
  return hits;
}

/** Checks every scene and story so far in the round; writes vocabulary.md. */
export function vocabulary(roundArg: string): VocabHit[] {
  const round = resolve(roundArg);
  const p = paths(round);
  const help = must(["bun", join(p.tool, "story.js"), "--help"], round);
  const commands = commandNames(help);
  const files = [p.scenes, p.soFar].flatMap((dir) =>
    existsSync(dir)
      ? filesUnder(dir)
          .filter((f) => f.endsWith(".md"))
          .map((f) => join(dir, f))
      : [],
  );
  const hits = files.flatMap((path) =>
    vocabHits(
      path.slice(round.length + 1),
      readFileSync(path, "utf8"),
      commands,
    ),
  );
  const lines = [
    "# Vocabulary check",
    "",
    `Checked ${files.length} judge-facing files for refs (kind:id), the CLI's ${commands.length} hyphenated command names and ${FIXED_TERMS.join(", ")}.`,
    "",
    hits.length === 0
      ? "No hits."
      : hits
          .map((h) => `- ${h.file}:${h.line}: \`${h.term}\`: ${h.text}`)
          .join("\n"),
    "",
  ];
  writeFileSync(p.vocabulary, lines.join("\n"));
  return hits;
}

// ---------------------------------------------------------------------------
// Sessions.

/** The writer's sandbox: its persisted home, the story repository and the tool. */
export function writerSandbox(
  round: string,
  claude: string,
  bun: string,
): string[] {
  const p = paths(round);
  return [
    ...systemMounts(),
    // The home is kept in the round directory so the session can be resumed.
    "--bind",
    p.home,
    SANDBOX_HOME,
    // Read-only over the home: the host's sessions depend on this file, and
    // the token is refreshed on the host before each session.
    "--ro-bind",
    credentialsPath(),
    `${SANDBOX_HOME}/.claude/.credentials.json`,
    "--ro-bind",
    realpathSync(claude),
    `${BIN}/claude`,
    "--ro-bind",
    realpathSync(bun),
    `${BIN}/bun`,
    "--ro-bind",
    p.tool,
    TOOL_MOUNT,
    "--bind",
    p.work,
    STORY_MOUNT,
    "--chdir",
    STORY_MOUNT,
    "--clearenv",
    ...Object.entries({
      USER: "writer",
      LANG: "C.UTF-8",
      CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1",
      DISABLE_AUTOUPDATER: "1",
      GIT_AUTHOR_NAME: "Writer",
      GIT_AUTHOR_EMAIL: "writer@example.invalid",
      GIT_COMMITTER_NAME: "Writer",
      GIT_COMMITTER_EMAIL: "writer@example.invalid",
      STORY_CLI: `${TOOL_MOUNT}/story.js`,
      PATH: `${BIN}:/usr/bin:/bin`,
      HOME: SANDBOX_HOME,
    }).flatMap(([name, value]) => ["--setenv", name, value]),
  ];
}

/** `claude` flags for the writer: the first session names its ID, later ones resume it. */
export function writerArgs(sessionId: string, resume: boolean): string[] {
  return [
    "--model",
    MODEL,
    "--setting-sources",
    "project,local",
    "--strict-mcp-config",
    "--disable-slash-commands",
    "--tools",
    WRITER_TOOLS,
    "--permission-mode",
    "bypassPermissions",
    ...(resume ? ["--resume", sessionId] : ["--session-id", sessionId]),
    "--add-dir",
    TOOL_MOUNT,
    "--output-format",
    "stream-json",
    "--verbose",
    "--include-hook-events",
  ];
}

/** The session ID every event of a writer transcript names, if they agree. */
export function sessionIds(jsonl: string): string[] {
  const ids = new Set<string>();
  for (const line of jsonl.split("\n")) {
    try {
      const event: unknown = JSON.parse(line);
      const id =
        typeof event === "object" && event !== null
          ? Reflect.get(event, "session_id")
          : undefined;
      if (typeof id === "string") ids.add(id);
    } catch {
      // The transcript check counts lines that aren't JSON.
    }
  }
  return [...ids];
}

/** The final reply of a `claude -p` session: its `result` event's text. */
export function resultText(jsonl: string): string | undefined {
  let reply: string | undefined;
  for (const line of jsonl.split("\n")) {
    try {
      const event: unknown = JSON.parse(line);
      if (typeof event !== "object" || event === null) continue;
      if (Reflect.get(event, "type") !== "result") continue;
      const result: unknown = Reflect.get(event, "result");
      reply = typeof result === "string" ? result : undefined;
    } catch {
      // As above.
    }
  }
  return reply;
}

function which(name: string): string {
  const path = Bun.which(name);
  if (path === null) throw new Error(`\`${name}\` is not on PATH.`);
  return path;
}

/** Runs one session into `<round>/phases/<phase>/` and returns its record. */
async function runSession({
  round,
  phase,
  prompt,
  command,
  sandbox,
  cwd,
  sandboxCwd,
  timeoutSeconds,
  check,
}: {
  round: string;
  phase: string;
  prompt: string;
  command: string[];
  sandbox: string[];
  cwd: string;
  /** The working directory as the sandbox sees it. */
  sandboxCwd: string;
  timeoutSeconds: number;
  check: (jsonl: string) => TranscriptSummary;
}): Promise<{ record: SessionRecord; jsonl: string; dir: string }> {
  const dir = join(paths(round).phases, phase);
  if (existsSync(dir)) {
    throw new Error(`${dir} exists; move it aside to run ${phase} again.`);
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "prompt.md"), prompt);
  waitForMemory();
  ensureToken((timeoutSeconds + 600) * 1000, hostToken);
  const record: SessionRecord = {
    phase,
    model: MODEL,
    timeoutSeconds,
    command: command.map((arg) => (arg === prompt ? "<prompt.md>" : arg)),
    sandbox,
    startedAt: new Date().toISOString(),
    cwd: sandboxCwd,
    credentials: { before: sha256(credentialsPath()) },
    checkProblems: [],
    problems: [],
  };
  console.log(`[${phase}] started ${record.startedAt}`);
  const started = performance.now();
  record.exitCode = await spawnSandboxed(sandbox, command, timeoutSeconds, {
    cwd,
    stdout: join(dir, "transcript.jsonl"),
    stderr: join(dir, "stderr.txt"),
  }).exited;
  record.durationSeconds = Math.round((performance.now() - started) / 1000);
  record.credentials.after = sha256(credentialsPath());
  const jsonl = readFileSync(join(dir, "transcript.jsonl"), "utf8");
  record.transcript = check(jsonl);
  record.checkProblems = checkProblems(record, jsonl, record.transcript);
  record.problems.push(...record.checkProblems);
  writeJson(join(dir, "record.json"), record);
  console.log(
    `[${phase}] exit ${record.exitCode}, ${record.durationSeconds}s, ${record.problems.length === 0 ? "ok" : record.problems.join("; ")}`,
  );
  return { record, jsonl, dir };
}

/** What a finished session's exit, transcript and credentials show went wrong. */
export function checkProblems(
  record: Pick<SessionRecord, "exitCode" | "timeoutSeconds" | "credentials">,
  jsonl: string,
  transcript: TranscriptSummary,
): string[] {
  const problems: string[] = [];
  if (record.exitCode === 124 || record.exitCode === 137) {
    problems.push(`timed out after ${record.timeoutSeconds}s`);
  } else if (record.exitCode !== 0) {
    problems.push(`claude exited ${record.exitCode ?? "nothing"}`);
  }
  problems.push(...modelProblems(jsonl, transcript, MODEL));
  if (transcript.unparsed > 0) {
    problems.push(`${transcript.unparsed} transcript lines weren't JSON`);
  }
  for (const f of transcript.outside) {
    problems.push(
      `outside its directory: ${f.tool}: ${f.detail.slice(0, 300)}`,
    );
  }
  if (record.credentials.after !== record.credentials.before) {
    problems.push(
      "note: the credentials changed during the session (mounted read-only, so on the host)",
    );
  }
  return problems;
}

/**
 * Redoes a finished phase's transcript check, as the check stands now, on
 * its saved transcript: after a fix to a false positive. Keeps record.json
 * as it was and writes recheck.json beside it with the commit, the new
 * check and the problems with the new check's in place of the old.
 */
export function recheck(
  roundArg: string,
  phase: string,
  commit: string,
): string[] {
  const dir = join(paths(resolve(roundArg)).phases, phase);
  const record = readJson<SessionRecord>(join(dir, "record.json"));
  const jsonl = readFileSync(join(dir, "transcript.jsonl"), "utf8");
  const transcript = phase.startsWith("so-far-")
    ? judgeTranscript(jsonl, record.cwd)
    : writerCheck(jsonl);
  const fresh = checkProblems(record, jsonl, transcript);
  const old = new Set(record.checkProblems);
  const problems = [...record.problems.filter((p) => !old.has(p)), ...fresh];
  writeJson(join(dir, "recheck.json"), {
    at: new Date().toISOString(),
    commit,
    transcript,
    checkProblems: fresh,
    problems,
  });
  return problems;
}

/** The writer's transcript check: it may read its repository, the tool and its own saved tool results. */
const writerCheck = (jsonl: string) =>
  checkTranscript(jsonl, STORY_MOUNT, {
    read: [STORY_MOUNT, TOOL_MOUNT, ...persistedOutputs(jsonl, STORY_MOUNT)],
    write: [STORY_MOUNT],
  });

/**
 * Keeps the story repository as a session left it: its files (symlinks
 * copied as links, never followed) and its git log, read in a sandbox.
 */
function snapshot(round: string, dir: string): string[] {
  const work = paths(round).work;
  const problems: string[] = [];
  try {
    cpSync(work, join(dir, "work"), {
      recursive: true,
      verbatimSymlinks: true,
    });
  } catch (error) {
    // A FIFO or socket the writer left can't be copied.
    problems.push(
      `the snapshot failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  writeFileSync(join(dir, "git-log.txt"), sandboxedGitLog(work));
  return problems;
}

/**
 * `git log --stat` of a repository the writer controls, run inside a
 * sandbox: the writer can set anything in its .git/config (a gpg.program
 * with log.showSignature, a textconv, an fsmonitor) that makes git run a
 * program, so git never runs on the host there. The sandbox has the
 * repository read-only at its own path, empty tmpfs /tmp and /home, no
 * network and no credentials; whatever the config runs runs there and can
 * write nothing that outlives it. Bounded by `timeout`.
 */
export function sandboxedGitLog(repo: string, timeoutSeconds = 120): string {
  const real = realpathSync(repo);
  const r = Bun.spawnSync(
    [
      "/usr/bin/timeout",
      "--kill-after=10",
      String(timeoutSeconds),
      BWRAP,
      "--unshare-all",
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
      "--ro-bind",
      "/etc",
      "/etc",
      "--proc",
      "/proc",
      "--dev",
      "/dev",
      "--tmpfs",
      "/tmp",
      "--tmpfs",
      "/home",
      "--ro-bind",
      real,
      real,
      "--chdir",
      real,
      "--clearenv",
      "--setenv",
      "HOME",
      "/home/git",
      "--setenv",
      "PATH",
      "/usr/bin:/bin",
      "--setenv",
      "GIT_CONFIG_GLOBAL",
      "/dev/null",
      // Output is capped inside the sandbox, so a program the writer's
      // config runs can't stream unbounded data into host memory
      // (finding worldcrafter-rkqy). The exit status is git's.
      "/bin/bash",
      "-c",
      `set -o pipefail; git log --stat '--format=%h %ad %s' --date=iso 2>/dev/null | head -c ${GIT_LOG_CAP}`,
    ],
    { cwd: tmpdir(), env: {}, stdout: "pipe", stderr: "ignore" },
  );
  const out = r.stdout.toString();
  if (out.length >= GIT_LOG_CAP) {
    return `${out}\n(git log output cut at ${GIT_LOG_CAP} bytes)\n`;
  }
  return r.exitCode === 0
    ? out
    : `(git log failed in its sandbox, exit ${r.exitCode})\n`;
}

/** Bytes of `git log` output kept from a writer's repository. */
export const GIT_LOG_CAP = 4_000_000;

/**
 * A file's text from a repository the writer controls, or undefined unless
 * it is a plain file there: a symlink (to the host's credentials, say) is
 * never followed, nor is a path through a symlinked directory.
 */
export function readRepoFile(repo: string, rel: string): string | undefined {
  const root = realpathSync(repo);
  const path = join(root, rel);
  if (!existsSync(path)) return undefined;
  if (!lstatSync(path).isFile()) return undefined;
  if (realpathSync(path) !== path) return undefined;
  return readFileSync(path, "utf8");
}

// ---------------------------------------------------------------------------
// Phase 1: the world and the outline.

export async function outline(
  roundArg: string,
  {
    premise = WARLOCK_PREMISE,
    outlineSize = DEFAULT_OUTLINE_SIZE,
  }: { premise?: string | undefined; outlineSize?: string | undefined } = {},
): Promise<SessionRecord> {
  const round = resolve(roundArg);
  const p = paths(round);
  if (existsSync(p.run))
    throw new Error(`${p.run} exists; a round's outline is run once.`);
  mkdirSync(round, { recursive: true });
  mkdirSync(join(p.home, ".claude"), { recursive: true });
  mkdirSync(p.work, { recursive: true });
  must(["git", "init", "-q", "-b", "main"], p.work);
  const commit = must(["git", "rev-parse", "HEAD"]).trim();
  const uncommitted = must([
    "git",
    "status",
    "--porcelain",
    "--",
    ...TOOL_PATHS,
  ]).trim();
  buildTool(p.tool, REPO);
  must(["chmod", "-R", "a-w", p.tool]);
  const tool = Object.fromEntries(
    filesUnder(p.tool).map((f) => [f, sha256(join(p.tool, f))]),
  );
  const record: RoundRecord = {
    premise,
    outlineSize,
    model: MODEL,
    claudeVersion: must(["claude", "--version"]).trim(),
    commit,
    uncommitted,
    builtAt: new Date().toISOString(),
    tool,
    sessionId: randomUUID(),
    sessions: [],
  };
  saveRound(round, record);
  const skillDir = join(p.tool, "story-sketch");
  const prompt = outlinePrompt({
    premise,
    outlineSize,
    craft: readFileSync(join(skillDir, "craft.md"), "utf8"),
    skill: readFileSync(join(skillDir, "SKILL.md"), "utf8"),
  });
  const { record: session, dir } = await runSession({
    round,
    phase: "outline",
    prompt,
    command: ["claude", "-p", prompt, ...writerArgs(record.sessionId, false)],
    sandbox: writerSandbox(round, which("claude"), process.execPath),
    cwd: p.work,
    sandboxCwd: STORY_MOUNT,
    timeoutSeconds: TIMEOUTS.outline,
    check: writerCheck,
  });
  if (readRepoFile(p.work, STORY_FILE) === undefined)
    session.problems.push(`${STORY_FILE} is missing`);
  else {
    try {
      const story = readStory(round);
      writeFileSync(join(round, "beats.md"), beatsText(story));
      if (story.scenes.length === 0)
        session.problems.push("the outline has no scenes");
    } catch (error) {
      session.problems.push(
        error instanceof Error ? error.message : String(error),
      );
    }
  }
  session.problems.push(...snapshot(round, dir));
  writeJson(join(dir, "record.json"), session);
  record.sessions.push(session);
  saveRound(round, record);
  return session;
}

// ---------------------------------------------------------------------------
// Phase 2: the scenes, by the same writer, resumed.

export async function scenes(
  roundArg: string,
  {
    sceneWords = DEFAULT_SCENE_WORDS,
  }: { sceneWords?: string | undefined } = {},
): Promise<SessionRecord[]> {
  const round = resolve(roundArg);
  const p = paths(round);
  const record = readRound(round);
  const points = pointsInOrder(readStory(round), readPoints(round));
  if (points.length === 0)
    throw new Error("No points are chosen; use choose or choose-random.");
  mkdirSync(p.scenes, { recursive: true });
  writeJson(
    join(round, "scene-order.json"),
    points.map((pt) => ({ n: pt.index, sceneId: pt.sceneId })),
  );
  const done: SessionRecord[] = [];
  for (const point of points) {
    const out = join(p.scenes, `${point.index}.md`);
    if (existsSync(out)) {
      console.log(`[scene-${point.index}] ${out} exists; skipping.`);
      continue;
    }
    const prompt = scenePrompt({
      point,
      index: point.index,
      count: points.length,
      sceneWords,
    });
    const {
      record: session,
      jsonl,
      dir,
    } = await runSession({
      round,
      phase: `scene-${point.index}`,
      prompt,
      command: ["claude", "-p", prompt, ...writerArgs(record.sessionId, true)],
      sandbox: writerSandbox(round, which("claude"), process.execPath),
      cwd: p.work,
      sandboxCwd: STORY_MOUNT,
      timeoutSeconds: TIMEOUTS.scene,
      check: writerCheck,
    });
    const ids = sessionIds(jsonl);
    if (ids.length !== 1 || ids[0] !== record.sessionId) {
      session.problems.push(
        `not the outline's session: the transcript names ${ids.join(", ") || "no session"}, not ${record.sessionId}`,
      );
    }
    const prose = readRepoFile(p.work, join("scenes", `${point.sceneId}.md`));
    if (prose === undefined || prose.trim() === "") {
      session.problems.push(
        `scenes/${point.sceneId}.md is missing, empty or not a plain file`,
      );
    } else {
      writeFileSync(out, prose);
    }
    session.problems.push(...snapshot(round, dir));
    writeJson(join(dir, "record.json"), session);
    record.sessions.push(session);
    saveRound(round, record);
    done.push(session);
    if (session.problems.some((pr) => !pr.startsWith("note:"))) {
      console.log(
        `[scene-${point.index}] failed; stopping, so later scenes keep their order.`,
      );
      break;
    }
  }
  vocabulary(round);
  return done;
}

// ---------------------------------------------------------------------------
// Phase 3: the story so far, a fresh agent per scene.

/** The story so far for the outline's first scene, which has none. */
export const OPENING_SO_FAR = "Nothing yet: this scene opens the story.";

export async function soFar(roundArg: string): Promise<SessionRecord[]> {
  const round = resolve(roundArg);
  const p = paths(round);
  const record = readRound(round);
  const story = readStory(round);
  const points = pointsInOrder(story, readPoints(round));
  mkdirSync(p.soFar, { recursive: true });
  const done: SessionRecord[] = [];
  for (const point of points) {
    const out = join(p.soFar, `${point.index}.md`);
    if (existsSync(out)) {
      console.log(`[so-far-${point.index}] ${out} exists; skipping.`);
      continue;
    }
    if (story.scenes[0]?.id === point.sceneId) {
      // Nothing comes before it, so there is nothing to summarise.
      writeFileSync(out, `${OPENING_SO_FAR}\n`);
      console.log(
        `[so-far-${point.index}] the story's first scene: wrote "${OPENING_SO_FAR}"`,
      );
      continue;
    }
    const outlineText = outlineBefore(story, point.sceneId);
    const runDir = realpathSync(mkdtempSync("/tmp/so-far."));
    try {
      writeFileSync(join(runDir, "outline.md"), outlineText);
      const prompt = soFarPrompt();
      const session = judgeSession(MODEL, runDir, "Read");
      const {
        record: rec,
        jsonl,
        dir,
      } = await runSession({
        round,
        phase: `so-far-${point.index}`,
        prompt,
        command: ["claude", "-p", prompt, ...session.args],
        sandbox: session.sandbox,
        cwd: runDir,
        sandboxCwd: runDir,
        timeoutSeconds: TIMEOUTS.soFar,
        check: (j) => judgeTranscript(j, runDir),
      });
      writeFileSync(join(dir, "outline.md"), outlineText);
      if (filesUnder(runDir).join(",") !== "outline.md") {
        rec.problems.push(`the run dir holds ${filesUnder(runDir).join(", ")}`);
      }
      const reply = resultText(jsonl)?.trim();
      if (reply === undefined || reply === "")
        rec.problems.push("no final reply");
      else {
        writeFileSync(out, `${reply}\n`);
        const n = words(reply);
        if (n < 300 || n > 500)
          rec.problems.push(`note: ${n} words, outside 300 to 500`);
      }
      writeJson(join(dir, "record.json"), rec);
      record.sessions.push(rec);
      saveRound(round, record);
      done.push(rec);
    } finally {
      rmSync(runDir, { recursive: true });
    }
  }
  vocabulary(round);
  return done;
}

// ---------------------------------------------------------------------------

const USAGE = `Usage:
  round.ts outline <round-dir> [--premise <text>] [--outline-size <text>]
  round.ts beats <round-dir>
  round.ts choose <round-dir> <scene-id> --reason <text>
  round.ts choose-random <round-dir> --seed <n> [--range <a>-<b>] [--reason <text>]
  round.ts scenes <round-dir> [--words <text>]
  round.ts so-far <round-dir>
  round.ts vocab <round-dir>
  round.ts recheck <round-dir> <phase>`;

const failed = (records: readonly Pick<SessionRecord, "problems">[]) =>
  records.some((r) => r.problems.some((p) => !p.startsWith("note:")));

export async function main(argv: string[]): Promise<void> {
  const [command, ...rest] = argv;
  const VALUED = [
    "--premise",
    "--outline-size",
    "--reason",
    "--seed",
    "--range",
    "--words",
  ];
  const flag = (name: string) => {
    const i = rest.indexOf(name);
    return i === -1 ? undefined : rest[i + 1];
  };
  const positional = rest.filter(
    (arg, i) => !arg.startsWith("--") && !VALUED.includes(rest[i - 1] ?? ""),
  );
  const [roundArg, sceneId] = positional;
  if (roundArg === undefined) {
    console.error(USAGE);
    process.exit(2);
  }
  const round = resolve(roundArg);
  switch (command) {
    case "outline": {
      const session = await outline(round, {
        premise: flag("--premise"),
        outlineSize: flag("--outline-size"),
      });
      if (existsSync(join(round, "beats.md")))
        console.log(readFileSync(join(round, "beats.md"), "utf8"));
      if (failed([session])) process.exit(1);
      return;
    }
    case "beats": {
      const text = beatsText(readStory(round));
      writeFileSync(join(round, "beats.md"), text);
      console.log(text);
      for (const pt of readPoints(round))
        console.log(`chosen: ${pt.sceneId} (${pt.how}: ${pt.reason})`);
      return;
    }
    case "choose":
    case "choose-random": {
      const story = readStory(round);
      const points = readPoints(round);
      const reason = flag("--reason");
      let point: Point;
      if (command === "choose") {
        if (sceneId === undefined || reason === undefined) break;
        point = choosePoint(story, points, { sceneId, reason });
      } else {
        const seed = Number(flag("--seed"));
        if (!Number.isInteger(seed)) break;
        const rangeText = flag("--range");
        point = choosePoint(story, points, {
          seed,
          ...(reason === undefined ? {} : { reason }),
          ...(rangeText === undefined ? {} : { range: parseRange(rangeText) }),
        });
      }
      writeJson(paths(round).points, [...points, point]);
      console.log(
        `Chose ${point.sceneId} (${point.position} of ${point.beats}): ${point.reason}`,
      );
      return;
    }
    case "scenes": {
      const records = await scenes(round, { sceneWords: flag("--words") });
      console.log(readFileSync(paths(round).vocabulary, "utf8"));
      if (failed(records)) process.exit(1);
      return;
    }
    case "so-far": {
      const records = await soFar(round);
      console.log(readFileSync(paths(round).vocabulary, "utf8"));
      if (failed(records)) process.exit(1);
      return;
    }
    case "recheck": {
      const phase = sceneId;
      if (phase === undefined) break;
      const dirty = must([
        "git",
        "status",
        "--porcelain",
        "--",
        "app/scripts/round",
        "app/scripts/comparison",
        "app/scripts/judging",
      ]).trim();
      if (dirty !== "")
        throw new Error(`Commit these before rechecking:\n${dirty}`);
      const problems = recheck(
        round,
        phase,
        must(["git", "rev-parse", "HEAD"]).trim(),
      );
      console.log(
        problems.length === 0
          ? `${phase}: ok`
          : `${phase}:\n${problems.map((p) => `- ${p}`).join("\n")}`,
      );
      if (failed([{ problems }])) process.exit(1);
      return;
    }
    case "vocab": {
      const hits = vocabulary(round);
      console.log(readFileSync(paths(round).vocabulary, "utf8"));
      if (hits.length > 0) process.exit(1);
      return;
    }
  }
  console.error(USAGE);
  process.exit(2);
}

if (import.meta.main) {
  await main(process.argv.slice(2));
}
