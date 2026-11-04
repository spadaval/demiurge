import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
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
  makeRunDir,
  markRecorded,
  modelProblems,
  type Part,
  parseVerdict,
  partDir,
  prompt,
  rubricAt,
  runDirSources,
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
    const dir = makeRunDir(RUBRIC, runDirSources(root, "sonnet", "part1"));
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
    const dir = makeRunDir(RUBRIC, runDirSources(root, "sonnet", "part2"));
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
    expect(
      readFileSync(join(partDir(root, "sonnet", "part1"), "RECORDED"), "utf8"),
    ).toBe("worldcrafter-ab12\n");
    expect(() => checkPart2Ready(root, "sonnet", RUBRIC.commit)).not.toThrow();
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
    expect(text).not.toMatch(/\btool\b|\bnotes\b|markdown/i);
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
