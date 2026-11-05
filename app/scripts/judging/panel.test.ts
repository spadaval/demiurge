import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkTranscript } from "../comparison/transcript";
import {
  aggregate,
  type Call,
  checkPart2Ready,
  checkSlot,
  filesUnder,
  JUDGE_NAMES,
  JUDGES,
  type Judge,
  judgeTranscript,
  makeRunDir,
  markRecorded,
  modelProblems,
  PART1_FROM,
  type Part,
  parseVerdict,
  partDir,
  persistedOutputs,
  postSessionProblems,
  prompt,
  readRecorded,
  recheck,
  rubricAt,
  rubricFor,
  runDirSources,
  runJudge,
  statusOf,
  verdict,
} from "./panel";

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true });
});
const temp = () => {
  const dir = mkdtempSync(join(tmpdir(), "panel-test."));
  temps.push(dir);
  return dir;
};
const write = (path: string, text: string) => {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, text);
};

const RUBRIC = { commit: "c0ffee", text: "# Rubric\n" };
const sha256Text = (text: string) =>
  createHash("sha256").update(text).digest("hex");

/** A material root: packets, a key with raw output, and model-gaps. */
function material(): string {
  const root = temp();
  write(join(root, "packets/x-pair-1-A.md"), "A\n");
  write(join(root, "packets/x-pair-1-B.md"), "B\n");
  write(join(root, "packets/notes.txt"), "not a packet\n");
  write(join(root, "key/key.md"), "# Key\n");
  write(join(root, "key/key.json"), "[]\n");
  write(join(root, "key/failures.md"), "# Failures\n");
  write(join(root, "key/model-gaps/run1.md"), "gaps\n");
  write(join(root, "key/raw/run1/run.json"), "{}\n");
  return root;
}

/** A finished part: STATUS, run.json, and its report. */
function finished(
  root: string,
  judge: Judge,
  part: Part,
  status: "ok" | "failed",
  report: string,
  rubricCommit = RUBRIC.commit,
) {
  const dir = partDir(root, judge, part);
  write(join(dir, "STATUS"), `${status}\n`);
  write(
    join(dir, "run.json"),
    JSON.stringify({ judge, part, model: JUDGES[judge], rubricCommit }),
  );
  write(join(dir, `${part}.md`), report);
}

describe("aggregation", () => {
  const cases: [Call[], Call][] = [
    [["keep", "keep", "keep"], "keep"],
    [["change", "change", "change"], "change"],
    [["drop", "drop", "drop"], "drop"],
    [["keep", "keep", "drop"], "keep"],
    [["keep", "change", "keep"], "keep"],
    [["drop", "keep", "drop"], "drop"],
    [["change", "drop", "drop"], "drop"],
    [["change", "change", "keep"], "change"],
    [["drop", "change", "change"], "change"],
  ];
  for (const [calls, result] of cases) {
    test(`${calls.join(", ")} gives ${result}`, () => {
      const out = aggregate(calls);
      expect(out.result).toBe(result);
      expect(out.rule).toContain("At least two");
    });
  }
  for (const calls of [
    ["keep", "change", "drop"],
    ["drop", "keep", "change"],
    ["change", "drop", "keep"],
  ] satisfies Call[][]) {
    test(`a three-way split (${calls.join(", ")}) gives change`, () => {
      const out = aggregate(calls);
      expect(out.result).toBe("change");
      expect(out.tally).toEqual({ keep: 1, change: 1, drop: 1 });
      expect(out.rule).toContain("All three calls differ");
    });
  }
  test("takes exactly three calls", () => {
    expect(() => aggregate(["keep", "keep"])).toThrow("exactly three");
    expect(() => aggregate(["keep", "keep", "keep", "drop"])).toThrow(
      "exactly three",
    );
  });
});

describe("verdict line", () => {
  test("reads the call on the last non-empty line", () => {
    expect(parseVerdict("Reasons.\n\nVERDICT: keep\n")).toBe("keep");
    expect(parseVerdict("x\nVERDICT: change")).toBe("change");
    expect(parseVerdict("x\n  verdict:   DROP  \n\n\n")).toBe("drop");
    expect(parseVerdict("x\n**VERDICT: drop**\n")).toBe("drop");
    expect(parseVerdict("x\n`VERDICT: keep`\n")).toBe("keep");
  });
  test("refuses anything else", () => {
    expect(() => parseVerdict("")).toThrow("VERDICT");
    expect(() => parseVerdict("VERDICT: keep\nMore after it.\n")).toThrow(
      "More after it.",
    );
    expect(() => parseVerdict("VERDICT: maybe\n")).toThrow();
    expect(() => parseVerdict("VERDICT: keep or change\n")).toThrow();
    expect(() => parseVerdict("My VERDICT: keep\n")).toThrow();
  });
});

describe("run directories", () => {
  test("Part 1 holds exactly the packets and the rubric", () => {
    const root = material();
    const dir = makeRunDir(RUBRIC.text, runDirSources(root, "sonnet", "part1"));
    temps.push(dir);
    expect(filesUnder(dir)).toEqual([
      "packets/x-pair-1-A.md",
      "packets/x-pair-1-B.md",
      "rubric.md",
    ]);
    expect(readFileSync(join(dir, "rubric.md"), "utf8")).toBe(RUBRIC.text);
    expect(readFileSync(join(dir, "packets/x-pair-1-A.md"), "utf8")).toBe(
      "A\n",
    );
  });

  test("Part 2 adds only its own Part 1, the key, model-gaps and failures", () => {
    const root = material();
    finished(root, "sonnet", "part1", "ok", "my report\n");
    finished(root, "opus", "part1", "ok", "another judge\n");
    const dir = makeRunDir(RUBRIC.text, runDirSources(root, "sonnet", "part2"));
    temps.push(dir);
    expect(filesUnder(dir)).toEqual([
      "failures.md",
      "key.md",
      "model-gaps/run1.md",
      "my-part1.md",
      "packets/x-pair-1-A.md",
      "packets/x-pair-1-B.md",
      "rubric.md",
    ]);
    expect(readFileSync(join(dir, "my-part1.md"), "utf8")).toBe("my report\n");
  });

  test("refuses a root with no packets", () => {
    const root = temp();
    mkdirSync(join(root, "packets"));
    expect(() => runDirSources(root, "opus", "part1")).toThrow("no packets");
  });
});

describe("rubric", () => {
  test("comes from the commit, not the working tree", () => {
    const repo = temp();
    const git = (...args: string[]) =>
      Bun.spawnSync(["git", ...args], { cwd: repo, stdout: "pipe" })
        .stdout.toString()
        .trim();
    git("init", "-q");
    write(join(repo, "docs/verdicts/comparison-rubric.md"), "committed\n");
    git("add", ".");
    git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "rubric");
    const sha = git("rev-parse", "HEAD");
    write(join(repo, "docs/verdicts/comparison-rubric.md"), "edited\n");
    expect(rubricAt("HEAD", repo)).toEqual({
      commit: sha,
      text: "committed\n",
    });
    expect(() => rubricAt("nope", repo)).toThrow();
  });
});

describe("Part 2's refusals", () => {
  test("refuses without a Part 1 report", () => {
    const root = material();
    expect(() => checkPart2Ready(root, "sonnet", RUBRIC.commit)).toThrow(
      "part1.md",
    );
  });
  test("refuses a failed Part 1", () => {
    const root = material();
    finished(root, "sonnet", "part1", "failed", "report\n");
    write(join(partDir(root, "sonnet", "part1"), "RECORDED"), "ev-1\n");
    expect(() => checkPart2Ready(root, "sonnet", RUBRIC.commit)).toThrow(
      "isn't marked ok",
    );
  });
  test("refuses until Part 1 is marked recorded", () => {
    const root = material();
    finished(root, "sonnet", "part1", "ok", "report\n");
    expect(() => checkPart2Ready(root, "sonnet", RUBRIC.commit)).toThrow(
      "mark-recorded",
    );
    markRecorded(root, "sonnet", "worldcrafter-ab12");
    expect(readRecorded(partDir(root, "sonnet", "part1"))).toEqual({
      evidenceId: "worldcrafter-ab12",
      part1Sha256: sha256Text("report\n"),
    });
    expect(() => checkPart2Ready(root, "sonnet", RUBRIC.commit)).not.toThrow();
  });
  test("refuses a Part 1 changed since it was recorded", () => {
    const root = material();
    finished(root, "sonnet", "part1", "ok", "report\n");
    markRecorded(root, "sonnet", "worldcrafter-ab12");
    writeFileSync(
      join(partDir(root, "sonnet", "part1"), "part1.md"),
      "edited\n",
    );
    expect(() => checkPart2Ready(root, "sonnet", RUBRIC.commit)).toThrow(
      "changed since it was recorded as worldcrafter-ab12",
    );
  });
  test("refuses a different rubric commit from Part 1's", () => {
    const root = material();
    finished(root, "sonnet", "part1", "ok", "report\n", "other");
    markRecorded(root, "sonnet", "worldcrafter-ab12");
    expect(() => checkPart2Ready(root, "sonnet", RUBRIC.commit)).toThrow(
      "used rubric other",
    );
  });
  test("mark-recorded refuses a failed or missing Part 1, and twice", () => {
    const root = material();
    expect(() => markRecorded(root, "opus", "worldcrafter-ab12")).toThrow();
    finished(root, "opus", "part1", "failed", "report\n");
    expect(() => markRecorded(root, "opus", "worldcrafter-ab12")).toThrow();
    finished(root, "fable", "part1", "ok", "report\n");
    expect(() => markRecorded(root, "fable", "not an id")).toThrow();
    markRecorded(root, "fable", "worldcrafter-ab12");
    expect(() => markRecorded(root, "fable", "worldcrafter-cd34")).toThrow(
      "already exists",
    );
  });
});

describe("slots and replacements", () => {
  test("a fresh run needs no existing one, and a replacement needs a failed one", () => {
    const root = material();
    expect(checkSlot(root, "opus", "part1", false)).toBeUndefined();
    expect(() => checkSlot(root, "opus", "part1", true)).toThrow(
      "no part1 to replace",
    );
    finished(root, "opus", "part1", "ok", "report\n");
    expect(() => checkSlot(root, "opus", "part1", false)).toThrow(
      "--replacement",
    );
    expect(() => checkSlot(root, "opus", "part1", true)).toThrow(
      "isn't marked failed",
    );
  });
  test("a failed run is kept beside its replacement", () => {
    const root = material();
    finished(root, "opus", "part2", "failed", "report\n");
    const dir = partDir(root, "opus", "part2");
    expect(checkSlot(root, "opus", "part2", true)).toBe(`${dir}-failed-1`);
    mkdirSync(`${dir}-failed-1`);
    expect(checkSlot(root, "opus", "part2", true)).toBe(`${dir}-failed-2`);
  });
  test("Part 1 isn't replaced once Part 2 exists", () => {
    const root = material();
    finished(root, "opus", "part1", "failed", "report\n");
    finished(root, "opus", "part2", "ok", "VERDICT: keep\n");
    expect(() => checkSlot(root, "opus", "part1", true)).toThrow(
      "already has a Part 2",
    );
  });
});

describe("verdict", () => {
  test("applies the rule to the three Part 2 reports and writes it", () => {
    const root = material();
    const calls: Record<Judge, Call> = {
      opus: "keep",
      sonnet: "drop",
      fable: "change",
    };
    for (const judge of JUDGE_NAMES) {
      finished(
        root,
        judge,
        "part2",
        "ok",
        `Reasons.\n\nVERDICT: ${calls[judge]}\n`,
      );
    }
    const text = verdict(root);
    expect(text).toContain("Tally: keep 1, change 1, drop 1.");
    expect(text).toContain("All three calls differ");
    expect(text).toContain("Result: **change**.");
    expect(text).toContain("opus called keep; sonnet called drop");
    expect(readFileSync(join(root, "judging/verdict.md"), "utf8")).toBe(text);
  });
  test("refuses a missing or failed Part 2, or mixed rubric commits", () => {
    const root = material();
    finished(root, "opus", "part2", "ok", "VERDICT: keep\n");
    finished(root, "sonnet", "part2", "ok", "VERDICT: keep\n");
    expect(() => verdict(root)).toThrow("fable");
    finished(root, "fable", "part2", "failed", "VERDICT: keep\n");
    expect(() => verdict(root)).toThrow("fable");
    finished(root, "fable", "part2", "ok", "VERDICT: keep\n", "other");
    expect(() => verdict(root)).toThrow("different rubric commits");
    expect(existsSync(join(root, "judging/verdict.md"))).toBe(false);
  });
});

describe("prompts", () => {
  test("Part 1 asks for every question into part1.md and says the key comes later", () => {
    const text = prompt("part1");
    expect(text).toContain("part1.md");
    expect(text).toContain("every one of its questions");
    expect(text).toContain("The key and Part 2 come later");
    for (const word of ["tool", "notes", "held back", "tuned", "markdown"]) {
      expect(text.toLowerCase()).not.toContain(word);
    }
  });
  test("Part 2 asks for part2.md, no revision, and the verdict line", () => {
    const text = prompt("part2");
    expect(text).toContain("part2.md");
    expect(text).toContain("Don't revise Part 1");
    expect(text).toContain(
      "`VERDICT: keep`, `VERDICT: change` or `VERDICT: drop`",
    );
  });
});

describe("judges", () => {
  test("exactly three, on the three models", () => {
    expect(JUDGES).toEqual({
      opus: "claude-opus-5-5",
      sonnet: "claude-sonnet-5-5",
      fable: "claude-fable-5-1",
    });
  });
});

describe("model check", () => {
  const line = (event: Record<string, unknown>) => JSON.stringify(event);
  const jsonl = (answeredBy: string, fallback: boolean) =>
    [
      line({ type: "system", subtype: "init", model: "claude-fable-5-1" }),
      ...(fallback
        ? [
            line({
              type: "system",
              subtype: "model_refusal_fallback",
              original_model: "claude-fable-5-1",
              fallback_model: "claude-opus-4-8",
              api_refusal_category: "cyber",
            }),
          ]
        : []),
      line({
        type: "assistant",
        message: { model: answeredBy, content: [{ type: "text", text: "ok" }] },
      }),
    ].join("\n");
  const problems = (text: string) =>
    modelProblems(
      text,
      checkTranscript(text, "/tmp/judge.x", {
        read: ["/tmp/judge.x"],
        write: ["/tmp/judge.x"],
      }),
      "claude-fable-5-1",
    );
  test("passes a session answered throughout by the judge's model", () => {
    expect(problems(jsonl("claude-fable-5-1", false))).toEqual([]);
  });
  test("names a refusal fallback and the model that answered", () => {
    expect(problems(jsonl("claude-opus-4-8", true))).toEqual([
      "refusal fallback from claude-fable-5-1 to claude-opus-4-8 (cyber)",
      "answered by claude-opus-4-8",
    ]);
  });
  test("flags a session with no answer", () => {
    expect(problems(jsonl("x", false).split("\n")[0] ?? "")).toEqual([
      "no assistant message",
    ]);
  });
});

describe("Part 1's rubric", () => {
  // The rubric as fixed for the panel; Part 1 must not see its title,
  // preamble or Part 2, which name the arms and the tuned-on premise.
  const pinned = rubricAt("314b20a");
  test("stops before Part 2 and names neither arm nor the tuned-on premise", () => {
    const copy = rubricFor(pinned, "part1");
    expect(copy.text.startsWith(`${PART1_FROM}\n`)).toBe(true);
    expect(copy.text).toContain("## Part 1: blind, for each pair");
    expect(copy.text).not.toContain("## Part 2");
    expect(copy.text).not.toContain("# Rubric");
    for (const word of ["tool", "notes", "held back", "tuned", "markdown"]) {
      expect(copy.text.toLowerCase()).not.toContain(word);
    }
    expect(copy.sha256).toBe(sha256Text(copy.text));
    expect(copy.cut).toContain(pinned.commit);
    expect(copy.cut).toContain('"## Part 2: with the key open"');
  });
  test("Part 2 gets the whole rubric", () => {
    const copy = rubricFor(pinned, "part2");
    expect(copy.text).toBe(pinned.text);
    expect(copy.cut).toBe("the whole file");
  });
  test("refuses a rubric it can't cut", () => {
    expect(() =>
      rubricFor({ commit: "x", text: "# R\n## Part 2\n" }, "part1"),
    ).toThrow("no");
    expect(() =>
      rubricFor(
        { commit: "x", text: "## Part 2\n## What you're judging\n" },
        "part1",
      ),
    ).toThrow("no");
  });
});

describe("post-session checks", () => {
  const model = "claude-sonnet-5-5";
  const jsonl = [
    JSON.stringify({ type: "system", subtype: "init", model }),
    JSON.stringify({
      type: "assistant",
      message: { model, content: [{ type: "text", text: "done" }] },
    }),
  ].join("\n");
  /** A run dir as a session left it, with the inputs hashed beforehand. */
  const session = (part: Part, after: (dir: string) => void) => {
    const runDir = temp();
    write(join(runDir, "rubric.md"), "rubric\n");
    write(join(runDir, "my-part1.md"), "mine\n");
    const inputs = {
      "rubric.md": sha256Text("rubric\n"),
      "my-part1.md": sha256Text("mine\n"),
    };
    after(runDir);
    return (text = jsonl, exitCode = 0) =>
      postSessionProblems({
        part,
        model,
        exitCode,
        jsonl: text,
        transcript: checkTranscript(text, runDir, {
          read: [runDir],
          write: [runDir],
        }),
        filesDir: runDir,
        inputs,
      });
  };
  test("passes a clean session", () => {
    const check = session("part2", (dir) =>
      write(join(dir, "part2.md"), "Reasons.\nVERDICT: keep\n"),
    );
    expect(check()).toEqual([]);
  });
  test("flags a changed or removed input", () => {
    const check = session("part2", (dir) => {
      write(join(dir, "part2.md"), "VERDICT: keep\n");
      write(join(dir, "my-part1.md"), "revised\n");
      rmSync(join(dir, "rubric.md"));
    });
    expect(check()).toEqual([
      "rubric.md changed during the session",
      "my-part1.md changed during the session",
    ]);
  });
  test("flags a missing or empty report, and a missing verdict line", () => {
    expect(session("part1", () => {})()).toEqual([
      "part1.md is missing or empty",
    ]);
    const empty = session("part1", (dir) => write(join(dir, "part1.md"), "\n"));
    expect(empty()).toEqual(["part1.md is missing or empty"]);
    const noVerdict = session("part2", (dir) =>
      write(join(dir, "part2.md"), "Reasons.\n"),
    );
    expect(noVerdict()[0]).toContain("VERDICT");
  });
  test("flags a non-zero exit, a timeout and unparsed transcript lines", () => {
    const check = session("part1", (dir) =>
      write(join(dir, "part1.md"), "report\n"),
    );
    expect(check(jsonl, 1)).toEqual(["claude exited 1"]);
    expect(check(jsonl, 124)).toEqual(["timed out after 3600s"]);
    expect(check(`${jsonl}\nnot json`)).toEqual([
      "1 transcript lines weren't JSON, so the transcript check couldn't read them",
    ]);
  });
});

const judgeDirs = () =>
  readdirSync("/tmp").filter((name) => name.startsWith("judge.")).length;

describe("a runner failure", () => {
  test("marks the part failed with the error, and leaves no run dir", async () => {
    const root = material();
    finished(root, "sonnet", "part1", "ok", "report\n");
    rmSync(join(root, "key/key.md"));
    const before = judgeDirs();
    const record = await runJudge(
      root,
      "sonnet",
      "part2",
      { commit: "c0ffee", text: "## What you're judging\n## Part 2\n" },
      false,
    );
    const dir = partDir(root, "sonnet", "part2");
    expect(statusOf(dir)).toBe("failed");
    expect(readFileSync(join(dir, "STATUS"), "utf8")).toContain(
      `the runner failed: ${join(root, "key/key.md")} is missing.`,
    );
    expect(record.problems).toHaveLength(1);
    expect(judgeDirs()).toBe(before);
  });
});

/** A transcript line: a tool use, or its result. */
const use = (id: string, name: string, input: Record<string, unknown>) =>
  JSON.stringify({
    type: "assistant",
    message: {
      model: "claude-opus-5-5",
      content: [{ type: "tool_use", id, name, input }],
    },
  });
const result = (id: string, content: unknown) =>
  JSON.stringify({
    type: "user",
    message: {
      content: [{ type: "tool_result", tool_use_id: id, content }],
    },
  });

describe("a session's own saved tool results", () => {
  const runDir = "/tmp/judge.Dpoxx8";
  const own =
    "/home/writer/.claude/projects/-tmp-judge-Dpoxx8/47520b9b/tool-results/b6l1z88u1.txt";
  const saved = (path: string) =>
    `<persisted-output>\nOutput too large (42.4KB). Full output saved to: ${path}\n\nPreview (first 2KB):\n...`;
  const flagged = (lines: string[]) =>
    judgeTranscript(lines.join("\n"), runDir).outside.map((f) => f.detail);

  test("may be read back, as a string or a list of text parts", () => {
    const other = own.replace("b6l1z88u1", "bcr6ayvr5");
    const lines = [
      use("1", "Bash", { command: `cd ${runDir}/packets; cat a.md` }),
      result("1", saved(own)),
      use("2", "Bash", { command: `cd ${runDir}/packets; cat b.md` }),
      result("2", [{ type: "text", text: saved(other) }]),
      use("3", "Read", { file_path: own }),
      use("4", "Read", { file_path: other }),
    ];
    expect(persistedOutputs(lines.join("\n"), runDir)).toEqual([own, other]);
    expect(flagged(lines)).toEqual([]);
  });
  test("nothing else in the sandbox's home may", () => {
    expect(
      flagged([
        result("1", saved(own)),
        use("2", "Read", { file_path: own.replace("b6l1z88u1", "unnamed") }),
        use("3", "Read", { file_path: "/home/writer/.claude.json" }),
      ]),
    ).toEqual([
      own.replace("b6l1z88u1", "unnamed"),
      "/home/writer/.claude.json",
    ]);
  });
  test("a path named outside this run dir's project, or by the session itself, doesn't count", () => {
    const elsewhere = own.replace("-tmp-judge-Dpoxx8", "-tmp-judge-other");
    const lines = [
      result("1", saved(elsewhere)),
      result("2", saved(`${own.replace("b6l1z88u1.txt", "")}../../x`)),
      // Text the session wrote, not a tool result.
      use("3", "Bash", { command: `echo '${saved("/home/writer/x")}'` }),
      result("4", `Full output saved to: ${own}`),
    ];
    expect(persistedOutputs(lines.join("\n"), runDir)).toEqual([]);
  });
});

describe("recheck", () => {
  const model = JUDGES.fable;
  const runDir = "/tmp/judge.8Q20ow";
  const heredoc = "cat > part1.md <<'EOF'\n(A: Lot Nine / Tavik)\nEOF";
  const session = (command: string, answeredBy: string = model) =>
    [
      JSON.stringify({ type: "system", subtype: "init", model }),
      JSON.stringify({
        type: "assistant",
        message: {
          model: answeredBy,
          content: [
            { type: "tool_use", id: "1", name: "Bash", input: { command } },
          ],
        },
      }),
    ].join("\n");
  const jsonl = session(heredoc);
  /** A part1 flagged by the old check, with its saved run dir copy. */
  function flaggedPart(): string {
    const root = material();
    const dir = partDir(root, "fable", "part1");
    write(join(dir, "files/rubric.md"), "rubric\n");
    write(join(dir, "files/part1.md"), "report\n");
    write(join(dir, "part1.md"), "report\n");
    write(join(dir, "transcript.jsonl"), jsonl);
    write(
      join(dir, "STATUS"),
      `failed\n- outside the run dir: Bash: ${heredoc}\n`,
    );
    write(
      join(dir, "run.json"),
      JSON.stringify({
        judge: "fable",
        part: "part1",
        model,
        runDir,
        exitCode: 0,
        inputs: { "rubric.md": sha256Text("rubric\n") },
      }),
    );
    return root;
  }

  test("passes a false positive, keeping the first STATUS and naming the commit", () => {
    const root = flaggedPart();
    const dir = partDir(root, "fable", "part1");
    const first = readFileSync(join(dir, "STATUS"), "utf8");
    expect(recheck(root, "fable", "part1", "abc123")).toEqual([]);
    expect(statusOf(dir)).toBe("ok");
    expect(readFileSync(join(dir, "STATUS"), "utf8")).toContain(
      "by `panel.ts recheck` at commit abc123",
    );
    expect(readFileSync(join(dir, "STATUS.original"), "utf8")).toBe(first);
    // A second recheck keeps the first STATUS, not the first recheck's.
    recheck(root, "fable", "part1", "def456");
    expect(readFileSync(join(dir, "STATUS.original"), "utf8")).toBe(first);
    expect(readFileSync(join(dir, "STATUS"), "utf8")).toContain("def456");
  });
  test("still fails what the saved files show is wrong", () => {
    const root = flaggedPart();
    const dir = partDir(root, "fable", "part1");
    writeFileSync(join(dir, "files/rubric.md"), "changed\n");
    writeFileSync(join(dir, "part1.md"), "edited afterwards\n");
    expect(recheck(root, "fable", "part1", "abc123")).toEqual([
      "rubric.md changed during the session",
      "part1.md differs from the one the session left",
    ]);
    expect(statusOf(dir)).toBe("failed");
  });
  test("still fails a read outside the run dir, and another model", () => {
    const root = flaggedPart();
    const dir = partDir(root, "fable", "part1");
    writeFileSync(
      join(dir, "transcript.jsonl"),
      session(`${heredoc}\ncat /etc/passwd`, "claude-opus-4-8"),
    );
    const problems = recheck(root, "fable", "part1", "abc123");
    expect(problems[0]).toBe("answered by claude-opus-4-8");
    expect(problems[1]).toStartWith(
      "outside the run dir: Bash: cat > part1.md",
    );
  });
  test("refuses a part that never finished, or whose runner failed", () => {
    const root = flaggedPart();
    const dir = partDir(root, "fable", "part1");
    writeFileSync(join(dir, "STATUS"), "running\n");
    expect(() => recheck(root, "fable", "part1", "abc123")).toThrow(
      "no finished STATUS",
    );
    writeFileSync(
      join(dir, "STATUS"),
      "failed\n- the runner was interrupted by SIGTERM\n",
    );
    expect(() => recheck(root, "fable", "part1", "abc123")).toThrow(
      "replace it instead",
    );
  });
});
