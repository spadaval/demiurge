/**
 * The blind comparison harness (worldcrafter-04z5): freeze the tool, run
 * four-step sessions in fresh temporary git repositories, snapshot each step,
 * check transcripts for reads outside the run, and write blind packets with
 * the key kept apart. See README.md beside this file.
 *
 *   bun scripts/comparison/comparison.ts freeze <frozen-dir>
 *   bun scripts/comparison/comparison.ts run <out-dir> <frozen-dir> <tool|notes> thukker
 *   bun scripts/comparison/comparison.ts packets <out-dir>
 *   bun scripts/comparison/comparison.ts phase-b <root>
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { diffHunks, packetMarkdown } from "./packet";
import {
  type Arm,
  FILES,
  PREMISES,
  type Premise,
  type PremiseId,
  STEPS,
  type Step,
  stepPrompt,
} from "./prompts";
import { checkTranscript, type TranscriptSummary } from "./transcript";

export const MODEL = "claude-opus-5-5";
/** Each step is bounded by `timeout`; this Claude Code has no --max-turns. */
export const STEP_TIMEOUT_SECONDS = 2700;
/** Wait before a session while less memory than this is available. */
const MIN_AVAILABLE_GIB = 3;
/**
 * Built-in tools a session may use. Leaves out subagents (their reads would
 * be harder to check) and anything that reaches other sessions, schedules
 * work, or touches worktrees.
 */
const TOOLS = "Bash,Read,Edit,Write,ToolSearch,WebFetch,WebSearch";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../../..");
/** What the freeze pins: the tool, the skill and this harness. */
const FROZEN_PATHS = [
  "app/scripts/story.ts",
  "app/src",
  "app/package.json",
  "app/bun.lock",
  ".agents/skills/story-sketch",
  "app/scripts/comparison",
];

type Frozen = {
  commit: string;
  frozenAt: string;
  claudeVersion: string;
  model: string;
  storyCli: string;
  skillDir: string;
};

type StepRecord = {
  step: Step;
  exitCode: number;
  timedOut: boolean;
  durationSeconds: number;
  problems: string[];
  transcript: TranscriptSummary;
};

export type RunRecord = {
  runId: string;
  arm: Arm;
  premise: PremiseId;
  workdir: string;
  frozenCommit: string;
  model: string;
  claudeArgs: string[];
  env: Record<string, string>;
  steps: StepRecord[];
  failed: boolean;
};

// ---------------------------------------------------------------------------
// Small helpers.

function sh(
  cmd: string[],
  cwd = REPO,
): { code: number; out: string; err: string } {
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

const readIf = (path: string): string | undefined =>
  existsSync(path) ? readFileSync(path, "utf8") : undefined;

const writeJson = (path: string, value: unknown) =>
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

function randomId(): string {
  return [...crypto.getRandomValues(new Uint8Array(4))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** A random order, by sorting on cryptographic random keys. */
export function shuffle<T>(items: readonly T[]): T[] {
  const keys = crypto.getRandomValues(new Uint32Array(items.length));
  return items
    .map((item, i) => ({ item, key: keys[i] ?? 0 }))
    .sort((a, b) => a.key - b.key)
    .map(({ item }) => item);
}

function availableGib(): number {
  const match = /^MemAvailable:\s+(\d+) kB/m.exec(
    readFileSync("/proc/meminfo", "utf8"),
  );
  return match ? Number(match[1]) / 1024 / 1024 : Number.POSITIVE_INFINITY;
}

function waitForMemory(): void {
  while (availableGib() < MIN_AVAILABLE_GIB) {
    console.log(
      `Waiting: ${availableGib().toFixed(1)} GiB available, need ${MIN_AVAILABLE_GIB}.`,
    );
    Bun.sleepSync(30_000);
  }
}

function which(name: string): string {
  const path = Bun.which(name);
  if (path === null) throw new Error(`\`${name}\` is not on PATH.`);
  return path;
}

// ---------------------------------------------------------------------------
// Freeze.

export function freeze(frozenDir: string): Frozen {
  const dir = resolve(frozenDir);
  if (existsSync(dir)) {
    throw new Error(`${dir} exists; a freeze is never redone in place.`);
  }
  const dirty = must(["git", "status", "--porcelain", "--", ...FROZEN_PATHS]);
  if (dirty.trim() !== "") {
    throw new Error(`Commit these before freezing:\n${dirty}`);
  }
  const commit = must(["git", "rev-parse", "HEAD"]).trim();
  const skillDir = join(dir, "story-sketch");
  mkdirSync(skillDir, { recursive: true });
  for (const file of ["SKILL.md", "craft.md"]) {
    copyFileSync(
      join(REPO, ".agents/skills/story-sketch", file),
      join(skillDir, file),
    );
  }
  const storyCli = join(dir, "story.js");
  must([
    "bun",
    "build",
    "--target=bun",
    join(REPO, "app/scripts/story.ts"),
    "--outfile",
    storyCli,
  ]);
  must(["bun", storyCli, "--help"], dir);
  const frozen: Frozen = {
    commit,
    frozenAt: new Date().toISOString(),
    claudeVersion: must(["claude", "--version"]).trim(),
    model: MODEL,
    storyCli,
    skillDir,
  };
  writeJson(join(dir, "FROZEN.json"), frozen);
  return frozen;
}

function loadFrozen(frozenDir: string): Frozen {
  const dir = realpathSync(resolve(frozenDir));
  const frozen = JSON.parse(
    readFileSync(join(dir, "FROZEN.json"), "utf8"),
  ) as Frozen;
  // The harness running now must be the one that was frozen.
  const changed = sh([
    "git",
    "diff",
    "--quiet",
    frozen.commit,
    "--",
    ...FROZEN_PATHS,
  ]);
  if (changed.code !== 0) {
    throw new Error(
      `The tool, skill or harness differs from the frozen commit ${frozen.commit}.`,
    );
  }
  return {
    ...frozen,
    storyCli: join(dir, "story.js"),
    skillDir: join(dir, "story-sketch"),
  };
}

// ---------------------------------------------------------------------------
// One run.

function claudeInvocation(
  arm: Arm,
  frozenDir: string,
  storyCli: string,
): { args: string[]; env: Record<string, string> } {
  const path = [
    ...new Set([dirname(which("bun")), dirname(which("claude"))]),
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
  ].join(":");
  const env: Record<string, string> = {
    PATH: path,
    HOME: process.env.HOME ?? "",
    USER: process.env.USER ?? "",
    LANG: "C.UTF-8",
    CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1",
    ...(arm === "tool" ? { STORY_CLI: storyCli } : {}),
  };
  const args = [
    "--model",
    MODEL,
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
    ...(arm === "tool" ? ["--add-dir", frozenDir] : []),
  ];
  return { args, env };
}

/** The story as a reader sees it, or why it couldn't be read. */
function readableText(
  arm: Arm,
  workdir: string,
  storyCli: string,
): { text?: string; problem?: string } {
  if (arm === "notes") {
    const text = readIf(join(workdir, FILES.notesStory));
    return text === undefined
      ? { problem: `${FILES.notesStory} is missing` }
      : { text };
  }
  if (!existsSync(join(workdir, FILES.toolStory))) {
    return { problem: `${FILES.toolStory} is missing` };
  }
  const r = sh(["bun", storyCli, FILES.toolStory, "render"], workdir);
  if (r.code !== 0) return { problem: `render failed: ${r.err.trim()}` };
  // Drop render's own word count; packets count both arms the same way.
  return { text: `${r.out.replace(/\n*\(\d+ words\)\s*$/, "").trimEnd()}\n` };
}

function expectedFile(step: Step): string | undefined {
  if (step === 2 || step === 3) return FILES.reworkNote[step];
  if (step === 4) return FILES.scene;
  return undefined;
}

export async function runOne(
  outDir: string,
  frozenDir: string,
  arm: Arm,
  premise: Premise,
): Promise<RunRecord> {
  const frozen = loadFrozen(frozenDir);
  const frozenReal = realpathSync(resolve(frozenDir));
  const runId = randomId();
  const raw = join(resolve(outDir), "key", "raw", runId);
  mkdirSync(raw, { recursive: true });
  const workdir = realpathSync(mkdtempSync("/tmp/story."));
  must(["git", "init", "-q", "-b", "main"], workdir);
  const craft = readFileSync(join(frozen.skillDir, "craft.md"), "utf8");
  const skill =
    arm === "tool"
      ? readFileSync(join(frozen.skillDir, "SKILL.md"), "utf8")
      : undefined;
  const { args, env } = claudeInvocation(arm, frozenReal, frozen.storyCli);
  const allowed = arm === "tool" ? [workdir, frozenReal] : [workdir];
  const record: RunRecord = {
    runId,
    arm,
    premise: premise.id,
    workdir,
    frozenCommit: frozen.commit,
    model: MODEL,
    claudeArgs: args,
    env,
    steps: [],
    failed: false,
  };
  const save = () => writeJson(join(raw, "run.json"), record);
  save();

  for (const step of STEPS) {
    const stepDir = join(raw, `step-${step}`);
    mkdirSync(stepDir, { recursive: true });
    const prompt = stepPrompt({
      arm,
      step,
      premise,
      craft,
      ...(skill === undefined ? {} : { skill }),
    });
    writeFileSync(join(stepDir, "prompt.md"), prompt);
    waitForMemory();
    console.log(
      `[${runId} ${arm} ${premise.id}] step ${step} started ${new Date().toISOString()}`,
    );
    const started = performance.now();
    const proc = Bun.spawn(
      [
        "timeout",
        "--kill-after=60",
        String(STEP_TIMEOUT_SECONDS),
        "claude",
        "-p",
        prompt,
        ...args,
      ],
      {
        cwd: workdir,
        env,
        stdin: "ignore",
        stdout: Bun.file(join(stepDir, "transcript.jsonl")),
        stderr: Bun.file(join(stepDir, "stderr.txt")),
      },
    );
    const exitCode = await proc.exited;
    const durationSeconds = Math.round((performance.now() - started) / 1000);

    // Snapshot everything the run has saved, history included.
    const files = join(stepDir, "files");
    mkdirSync(files);
    must(["cp", "-a", `${workdir}/.`, files]);
    writeFileSync(
      join(stepDir, "git-log.txt"),
      sh(["git", "log", "--stat", "--format=%h %ad %s", "--date=iso"], workdir)
        .out,
    );
    const problems: string[] = [];
    if (exitCode === 124 || exitCode === 137) {
      problems.push(`timed out after ${STEP_TIMEOUT_SECONDS}s`);
    } else if (exitCode !== 0) {
      problems.push(`claude exited ${exitCode}`);
    }
    if (step !== 4) {
      const readable = readableText(arm, workdir, frozen.storyCli);
      if (readable.text !== undefined) {
        writeFileSync(join(stepDir, "readable.md"), readable.text);
      } else {
        problems.push(readable.problem ?? "no readable text");
      }
    }
    const expected = expectedFile(step);
    if (expected !== undefined && !existsSync(join(workdir, expected))) {
      problems.push(`${expected} is missing`);
    }
    const transcript = checkTranscript(
      readFileSync(join(stepDir, "transcript.jsonl"), "utf8"),
      workdir,
      allowed,
    );
    if (transcript.models.some((m) => m !== MODEL)) {
      problems.push(`answered by ${transcript.models.join(", ")}`);
    }
    record.steps.push({
      step,
      exitCode,
      timedOut: exitCode === 124 || exitCode === 137,
      durationSeconds,
      problems,
      transcript,
    });
    if (problems.length > 0) record.failed = true;
    save();
    console.log(
      `[${runId}] step ${step}: exit ${exitCode}, ${durationSeconds}s, ${problems.length === 0 ? "ok" : problems.join("; ")}, ${transcript.outside.length} outside`,
    );
    if (step === 1 && !existsSync(join(stepDir, "readable.md"))) {
      console.log(`[${runId}] no sketch to rework; stopping this run.`);
      break;
    }
  }
  const gaps = readIf(join(workdir, FILES.modelGaps));
  if (gaps !== undefined) {
    mkdirSync(join(resolve(outDir), "key", "model-gaps"), { recursive: true });
    writeFileSync(
      join(resolve(outDir), "key", "model-gaps", `${runId}.md`),
      gaps,
    );
  }
  return record;
}

// ---------------------------------------------------------------------------
// Packets and the key.

function lineDiff(before: string, after: string): string {
  const dir = mkdtempSync(join(tmpdir(), "packet-diff."));
  writeFileSync(join(dir, "before"), before);
  writeFileSync(join(dir, "after"), after);
  const r = sh(
    ["git", "diff", "--no-index", "--no-color", "-U3", "before", "after"],
    dir,
  );
  if (r.code !== 0 && r.code !== 1) throw new Error(`diff failed: ${r.err}`);
  must(["rm", "-rf", dir]);
  return diffHunks(r.out);
}

function loadRuns(outDir: string): RunRecord[] {
  const rawDir = join(outDir, "key", "raw");
  return readdirSync(rawDir)
    .map((id) => join(rawDir, id, "run.json"))
    .filter(existsSync)
    .map((path) => JSON.parse(readFileSync(path, "utf8")) as RunRecord);
}

function packetFor(outDir: string, run: RunRecord, label: string): string {
  const raw = join(outDir, "key", "raw", run.runId);
  const readable = (step: Step) =>
    readIf(join(raw, `step-${step}`, "readable.md"));
  const saved = (step: Step, file: string) =>
    readIf(join(raw, `step-${step}`, "files", file));
  const r1 = readable(1);
  const r2 = readable(2);
  const r3 = readable(3);
  const diff = (a: string | undefined, b: string | undefined) =>
    a === undefined || b === undefined ? undefined : lineDiff(a, b);
  return packetMarkdown({
    premiseTitle: PREMISES[run.premise].title,
    label,
    readable: { 1: r1, 2: r2, 3: r3 },
    diffs: { 2: diff(r1, r2), 3: diff(r2, r3) },
    notes: {
      2: saved(2, FILES.reworkNote[2]),
      3: saved(3, FILES.reworkNote[3]),
    },
    scene: saved(4, FILES.scene),
  });
}

export function writePackets(outDirArg: string): void {
  const outDir = resolve(outDirArg);
  const packets = join(outDir, "packets");
  if (existsSync(packets)) {
    throw new Error(`${packets} exists; packets are written once.`);
  }
  mkdirSync(packets);
  const runs = loadRuns(outDir);
  const key: Record<string, unknown>[] = [];
  const keyLines = [
    "# Key",
    "",
    "Open only after the packets have been read and judged (worldcrafter-i2uz).",
    "",
  ];
  for (const premise of Object.values(PREMISES)) {
    const tool = shuffle(
      runs.filter((r) => r.premise === premise.id && r.arm === "tool"),
    );
    const notes = shuffle(
      runs.filter((r) => r.premise === premise.id && r.arm === "notes"),
    );
    if (tool.length === 0 && notes.length === 0) continue;
    if (tool.length !== notes.length) {
      throw new Error(
        `${premise.id}: ${tool.length} tool runs but ${notes.length} notes runs; each pair needs one of each.`,
      );
    }
    keyLines.push(
      `## ${premise.title}${premise.tunedOn ? " (tuned-on: the tool was built against this premise, so weigh it less)" : " (held back until the freeze)"}`,
      "",
    );
    tool.forEach((toolRun, i) => {
      const pair = i + 1;
      const notesRun = notes[i];
      if (notesRun === undefined) return;
      const ordered = shuffle([toolRun, notesRun]);
      for (const [letter, run] of ordered.map(
        (r, j) => [j === 0 ? "A" : "B", r] as const,
      )) {
        const name = `${premise.id}-pair-${pair}-${letter}.md`;
        const label = `${premise.title}, pair ${pair}, packet ${letter}`;
        writeFileSync(join(packets, name), packetFor(outDir, run, label));
        key.push({
          packet: name,
          runId: run.runId,
          arm: run.arm,
          premise: premise.id,
          tunedOn: premise.tunedOn,
          model: run.model,
          frozenCommit: run.frozenCommit,
          failed: run.failed,
        });
        keyLines.push(
          `- \`${name}\`: **${run.arm}** (run ${run.runId}${run.failed ? ", FAILED: see failures.md" : ""})`,
        );
      }
    });
    keyLines.push("");
  }
  writeJson(join(outDir, "key", "key.json"), key);
  writeFileSync(join(outDir, "key", "key.md"), `${keyLines.join("\n")}\n`);
  writeFileSync(join(outDir, "key", "failures.md"), failuresReport(runs));
}

function failuresReport(runs: readonly RunRecord[]): string {
  const lines = ["# Failures and transcript checks", ""];
  const failed = runs.filter((r) => r.failed);
  lines.push(`${failed.length} of ${runs.length} runs failed.`, "");
  for (const run of runs) {
    lines.push(`## Run ${run.runId} (${run.arm}, ${run.premise})`, "");
    for (const s of run.steps) {
      lines.push(
        `- Step ${s.step}: exit ${s.exitCode}, ${s.durationSeconds}s, models ${s.transcript.models.join(", ") || "none"}${s.problems.length > 0 ? `; problems: ${s.problems.join("; ")}` : ""}`,
      );
      if (s.transcript.outside.length === 0) {
        lines.push("  - Nothing read outside the allowed directories.");
      }
      for (const f of s.transcript.outside) {
        lines.push(
          `  - Outside: ${f.tool}: \`${f.detail.replaceAll("`", "'")}\``,
        );
      }
    }
    if (run.steps.length < STEPS.length) {
      lines.push(`- Stopped after step ${run.steps.length}.`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

// ---------------------------------------------------------------------------
// Phase B: all eight runs, then the packets.

export async function phaseB(rootArg: string): Promise<void> {
  const root = resolve(rootArg);
  const frozenDir = join(root, "frozen");
  loadFrozen(frozenDir);
  if (existsSync(join(root, "key")) || existsSync(join(root, "packets"))) {
    throw new Error(
      `${root} already has a key or packets; failed runs aren't quietly rerun.`,
    );
  }
  const slots = shuffle(
    Object.values(PREMISES).flatMap((premise) =>
      (["tool", "tool", "notes", "notes"] as const).map((arm) => ({
        arm,
        premise,
      })),
    ),
  );
  for (const { arm, premise } of slots) {
    await runOne(root, frozenDir, arm, premise);
  }
  writePackets(root);
}

// ---------------------------------------------------------------------------

async function main(argv: string[]): Promise<void> {
  const [command, ...rest] = argv;
  switch (command) {
    case "freeze": {
      const [dir] = rest;
      if (dir === undefined) break;
      console.log(JSON.stringify(freeze(dir), null, 2));
      return;
    }
    case "run": {
      const [out, frozen, arm, premise] = rest;
      if (out === undefined || frozen === undefined) break;
      if (arm !== "tool" && arm !== "notes") break;
      // Single runs are for smoke tests; the held-back premise runs only in
      // phase-b, after the freeze.
      if (premise !== "thukker") {
        throw new Error("`run` takes only the thukker premise.");
      }
      const record = await runOne(out, frozen, arm, PREMISES.thukker);
      console.log(`Run ${record.runId}: ${record.failed ? "FAILED" : "ok"}`);
      return;
    }
    case "packets": {
      const [out] = rest;
      if (out === undefined) break;
      writePackets(out);
      return;
    }
    case "phase-b": {
      const [root] = rest;
      if (root === undefined) break;
      await phaseB(root);
      return;
    }
  }
  console.error(
    "Usage: comparison.ts freeze <frozen-dir> | run <out-dir> <frozen-dir> <tool|notes> thukker | packets <out-dir> | phase-b <root>",
  );
  process.exit(2);
}

if (import.meta.main) {
  await main(process.argv.slice(2));
}
