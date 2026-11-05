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
import {
  checkGrokTranscript,
  ensureGrokToken,
  GROK_ENV,
  grokArgs,
  grokModelProblems,
  grokSandboxArgs,
  grokTokenExpiresAt,
} from "./grok";
import { rubricAt, rubricFor, sha256 } from "./panel";
import {
  CRITERIA,
  checkQuotes,
  claimSlot,
  concurrencyFor,
  credentialsNote,
  DEFAULT_RUBRIC,
  failedRuns,
  finalReply,
  findQuote,
  normalise,
  parseReport,
  type SceneReport,
  sceneIds,
  scenePrompt,
  sessionProblems,
  slotDir,
  statusOf,
  tabulate,
} from "./scenes";

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true });
});
const temp = () => {
  const dir = mkdtempSync(join(tmpdir(), "scenes-test."));
  temps.push(dir);
  return dir;
};
const write = (path: string, text: string) => {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, text);
};

const SCENE = `"You'll want it strong," she said.

He wrapped both hands around the cup, though it *wasn't* cold.

“Nine minutes,” he said.`;

function goodReport(): SceneReport {
  const entry = (score: number) => ({
    score,
    evidence: "He wrapped both hands around the cup",
  });
  return {
    ...(Object.fromEntries(CRITERIA.map((c, i) => [c, entry(i + 1)])) as Record<
      (typeof CRITERIA)[number],
      { score: number; evidence: string }
    >),
    overall: { score: 7 },
    best_moment: { quote: '"Nine minutes," he said.', why: "It turns." },
    worst_moment: { quote: "You'll want it strong", why: "Flat." },
  };
}

const fenced = (value: unknown) =>
  `Here is my report.\n\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n\nPacing: fine.\n`;

describe("parseReport", () => {
  test("accepts a filled-in template", () => {
    const parsed = parseReport(fenced(goodReport()));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.report.overall.score).toBe(7);
  });

  test("the rubric's own empty template fails on every score and string", () => {
    const rubric = rubricFor(rubricAt(DEFAULT_RUBRIC, "HEAD"), "part1");
    const parsed = parseReport(rubric.text);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.problems).toContain(
        "pacing.score is 0, not a whole number from 1 to 10",
      );
      expect(parsed.problems).toContain("best_moment.quote is empty");
      // Exactly the template's keys: nothing is missing or added.
      expect(parsed.problems.some((p) => /lacks|adds/.test(p))).toBe(false);
    }
  });

  test.each([
    ["no block", "Just prose.", "0 ```json blocks"],
    [
      "two blocks",
      `${fenced(goodReport())}${fenced(goodReport())}`,
      "2 ```json blocks",
    ],
    ["unclosed", "```json\n{}\n", "never closed"],
    ["bad json", "```json\n{ score: 1 }\n```", "doesn't parse"],
    ["an array", "```json\n[]\n```", "isn't an object"],
  ])("fails with %s", (_, text, problem) => {
    const parsed = parseReport(text);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.problems.join("\n")).toContain(problem);
  });

  test("fails on a key missing or added at either level", () => {
    const top = goodReport() as unknown as Record<string, unknown>;
    delete top.subtext;
    top.notes = "extra";
    const inner = goodReport() as unknown as Record<
      string,
      Record<string, unknown>
    >;
    if (inner.pacing) inner.pacing.confidence = "high";
    if (inner.overall) inner.overall.evidence = "x";
    const a = parseReport(fenced(top));
    const b = parseReport(fenced(inner));
    expect(a.ok || b.ok).toBe(false);
    if (!a.ok) {
      expect(a.problems).toContain("the report lacks subtext");
      expect(a.problems).toContain("the report adds notes");
    }
    if (!b.ok) {
      expect(b.problems).toContain("pacing adds confidence");
      expect(b.problems).toContain("overall adds evidence");
    }
  });

  test.each([[0], [11], [7.5], ["7"], [null]])("fails on score %p", (score) => {
    const report = goodReport() as unknown as Record<
      string,
      Record<string, unknown>
    >;
    if (report.intrigue) report.intrigue.score = score;
    const parsed = parseReport(fenced(report));
    expect(parsed.ok).toBe(false);
  });

  test("fails on an empty or blank string", () => {
    const report = goodReport();
    report.character.evidence = "   ";
    const parsed = parseReport(fenced(report));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok)
      expect(parsed.problems).toEqual(["character.evidence is empty"]);
  });
});

describe("quotes", () => {
  test("normalise straightens quote marks and collapses whitespace", () => {
    expect(normalise("  “Hi,”\n  she\tsaid ‘no’ ")).toBe(`"Hi," she said 'no'`);
  });

  test("an escaped quote in JSON matches curly quotes in the scene", () => {
    const parsed = JSON.parse('"\\"Nine minutes,\\" he said."') as string;
    expect(findQuote(parsed, SCENE)).toBe("verbatim");
  });

  test("whitespace and line breaks don't matter", () => {
    expect(findQuote("He wrapped both\nhands  around", SCENE)).toBe("verbatim");
  });

  test("quote marks around the whole quote are reported, not hidden", () => {
    expect(findQuote('"He wrapped both hands around the cup"', SCENE)).toBe(
      "without outer quotes",
    );
  });

  test("markdown emphasis is reported, not hidden", () => {
    expect(findQuote("though it wasn't cold", SCENE)).toBe("ignoring emphasis");
  });

  test("a quote that isn't there is recorded as such", () => {
    expect(findQuote("He drank the tea.", SCENE)).toBe("not in scene");
    expect(findQuote("Nine  minutes, he said", SCENE)).toBe("not in scene");
  });

  test("checkQuotes checks every evidence line and both moments", () => {
    const report = goodReport();
    report.continuity.evidence = "Something invented.";
    const checks = checkQuotes(report, SCENE);
    expect(checks).toHaveLength(CRITERIA.length + 2);
    expect(checks.filter((c) => c.match === "not in scene")).toEqual([
      {
        field: "continuity.evidence",
        quote: "Something invented.",
        match: "not in scene",
      },
    ]);
  });
});

describe("the prompt and the rubric cut", () => {
  test("the prompt names the files and nothing of the process", () => {
    const prompt = scenePrompt();
    for (const name of ["scene.md", "story-so-far.md", "rubric.md"]) {
      expect(prompt).toContain(name);
    }
    expect(prompt).toContain('"Your report"');
    expect(prompt).toContain("final reply");
    expect(prompt).not.toMatch(
      /part|session|later|packet|pair|preference|confidence|demiurge|judges|round|tool|writer/i,
    );
  });

  test("the judges get the rubric up to, not including, Part 2", () => {
    const copy = rubricFor(rubricAt(DEFAULT_RUBRIC, "HEAD"), "part1");
    expect(copy.text.startsWith("## What you're judging\n")).toBe(true);
    expect(copy.text).toContain("### Your report");
    expect(copy.text).not.toMatch(/Part 2|Demiurge|worldcrafter|panel/);
  });
});

describe("concurrency", () => {
  test("four at once only if free -g, in whole GiB, shows more than 5", () => {
    expect(concurrencyFor(6)).toBe(4);
    expect(concurrencyFor(7.4)).toBe(4);
    expect(concurrencyFor(5.99)).toBe(2);
    expect(concurrencyFor(5.1)).toBe(2);
    expect(concurrencyFor(4)).toBe(2);
    expect(concurrencyFor(3.9)).toBe(1);
    expect(concurrencyFor(0.5)).toBe(1);
  });
});

describe("layout", () => {
  test("sceneIds needs a story so far for each scene", () => {
    const round = temp();
    write(join(round, "scenes", "2.md"), "b");
    write(join(round, "scenes", "10.md"), "c");
    write(join(round, "so-far", "2.md"), "b");
    expect(() => sceneIds(round)).toThrow("scenes/10.md has no so-far/10.md");
    write(join(round, "so-far", "10.md"), "c");
    expect(sceneIds(round)).toEqual(["2", "10"]);
  });

  test("claimSlot skips ok, moves failed aside, refuses running", () => {
    const round = temp();
    const dir = slotDir(round, "1", "grok");
    expect(claimSlot(round, "1", "grok")).toBe(true);
    write(join(dir, "STATUS"), "failed\n- x\n");
    expect(claimSlot(round, "1", "grok")).toBe(true);
    expect(existsSync(dir)).toBe(false);
    expect(failedRuns(round, "1", "grok")).toEqual(["grok-failed-1"]);
    write(join(dir, "STATUS"), "failed\n");
    claimSlot(round, "1", "grok");
    expect(failedRuns(round, "1", "grok")).toEqual([
      "grok-failed-1",
      "grok-failed-2",
    ]);
    write(join(dir, "STATUS"), "running\n");
    expect(() => claimSlot(round, "1", "grok")).toThrow("marked running");
    write(join(dir, "STATUS"), "ok\n");
    expect(claimSlot(round, "1", "grok")).toBe(false);
    expect(statusOf(dir)).toBe("ok");
  });
});

// ---------------------------------------------------------------------------
// Grok.

const RUN = "/tmp/judge.abc123";
const call = (id: string, toolName: string, rawInput: unknown) =>
  JSON.stringify({ type: "tool_call", toolCallId: id, toolName, rawInput });
const update = (id: string, path: string) =>
  JSON.stringify({
    type: "tool_call_update",
    toolCallId: id,
    locations: [{ path }],
  });
const end = (models: string[], stopReason = "end_turn") =>
  JSON.stringify({
    type: "end",
    stopReason,
    num_turns: 3,
    total_cost_usd: 0.01,
    modelUsage: Object.fromEntries(models.map((m) => [m, { modelCalls: 1 }])),
  });

describe("checkGrokTranscript", () => {
  test("reads in the run dir pass", () => {
    const jsonl = [
      JSON.stringify({
        type: "available_commands",
        tools: ["read_file"],
      }),
      call("a", "read_file", { target_file: `${RUN}/scene.md` }),
      update("a", `${RUN}/scene.md`),
      call("b", "read_file", { target_file: "rubric.md" }),
      end(["grok-4.7-build"]),
    ].join("\n");
    const summary = checkGrokTranscript(jsonl, RUN);
    expect(summary.outside).toEqual([]);
    expect(summary.toolCalls).toBe(2);
    expect(summary.toolsOffered).toEqual(["read_file"]);
    expect(grokModelProblems(summary)).toEqual([]);
  });

  test("a session offered any tool but read_file fails, once per tool", () => {
    const offered = JSON.stringify({
      type: "available_commands",
      tools: ["read_file", "search_tool", "use_tool"],
    });
    const summary = checkGrokTranscript(
      [offered, offered, end(["grok-4.7"])].join("\n"),
      RUN,
    );
    expect(summary.outside).toEqual([
      { tool: "search_tool", detail: "offered a tool the judge wasn't given" },
      { tool: "use_tool", detail: "offered a tool the judge wasn't given" },
    ]);
  });

  test("grokArgs gives read_file and removes the MCP discovery tools", () => {
    const args = grokArgs(30);
    expect(args[args.indexOf("--tools") + 1]).toBe("read_file");
    expect(args[args.indexOf("--disallowed-tools") + 1]).toBe(
      "search_tool,use_tool",
    );
  });

  test("reports paths outside the run dir, Grok's home and other tools", () => {
    const jsonl = [
      call("a", "read_file", { target_file: "/etc/hostname" }),
      call("b", "read_file", { target_file: "/home/writer/.grok/auth.json" }),
      call("c", "read_file", { target_file: "../judge.other/scene.md" }),
      call("d", "write", { file_path: "/tmp/elsewhere.md", content: "" }),
      call("g", "write", { file_path: `${RUN}/report.md`, content: "" }),
      call("e", "search_tool", { query: "x" }),
      call("f", "read_file", { target_file: "scene.md" }),
      update("f", "/home/writer/notes.md"),
      "not json",
    ].join("\n");
    const summary = checkGrokTranscript(jsonl, RUN);
    expect(summary.outside.map((f) => `${f.tool}: ${f.detail}`)).toEqual([
      "read_file: /etc/hostname",
      "read_file: /home/writer/.grok/auth.json",
      "read_file: ../judge.other/scene.md",
      `write: a tool the judge wasn't given: {"file_path":"/tmp/elsewhere.md","content":""}`,
      "write (write): /tmp/elsewhere.md",
      `write: a tool the judge wasn't given: {"file_path":"${RUN}/report.md","content":""}`,
      'search_tool: a tool the judge wasn\'t given: {"query":"x"}',
      "read_file: /home/writer/notes.md",
    ]);
    expect(summary.unparsed).toBe(1);
    expect(grokModelProblems(summary)).toEqual([
      "no end event: the session didn't finish",
    ]);
  });

  test("another model or stop reason fails", () => {
    expect(
      grokModelProblems(checkGrokTranscript(end(["grok-4.7-build-fast"]), RUN)),
    ).toEqual(["answered by grok-4.7-build-fast"]);
    expect(
      grokModelProblems(
        checkGrokTranscript(end(["grok-4.7"], "max_turns"), RUN),
      ),
    ).toEqual(["stopped with max_turns"]);
    expect(grokModelProblems(checkGrokTranscript(end([]), RUN))).toEqual([
      "the end event names no model",
    ]);
  });
});

describe("Grok's sandbox and token", () => {
  test("only auth.json and the runner's config are mounted, read-only", () => {
    const dir = temp();
    const grok = join(dir, "grok");
    write(grok, "");
    const args = grokSandboxArgs({
      workdir: RUN,
      configPath: join(dir, "config.toml"),
      grok,
      auth: "/host/.grok/auth.json",
    });
    const joined = args.join(" ");
    expect(joined).toContain(
      "--ro-bind /host/.grok/auth.json /home/writer/.grok/auth.json",
    );
    expect(joined).toContain(
      `--ro-bind ${join(dir, "config.toml")} /home/writer/.grok/config.toml`,
    );
    expect(joined).toContain(`--ro-bind ${grok} /opt/bin/grok`);
    expect(joined).toContain("--tmpfs /home");
    // No other host path under ~/.grok is mounted.
    expect(args.filter((a) => a.includes("/.grok")).sort()).toEqual([
      "/home/writer/.grok",
      "/home/writer/.grok/auth.json",
      "/home/writer/.grok/config.toml",
      "/host/.grok/auth.json",
    ]);
    expect(args).toContain(`--bind`);
    expect(joined).toContain(`--bind ${RUN} ${RUN}`);
    expect(GROK_ENV.GROK_MEMORY).toBe("0");
    expect(GROK_ENV.GROK_AUTH_EARLY_INVALIDATION_SECS).toBe("0");
  });

  test("grokTokenExpiresAt reads the earliest expires_at", () => {
    const path = join(temp(), "auth.json");
    write(
      path,
      JSON.stringify({
        a: { key: "secret", expires_at: "2026-11-05T10:00:00Z" },
        b: { key: "secret", expires_at: "2026-11-05T09:00:00Z" },
      }),
    );
    expect(grokTokenExpiresAt(path)).toBe(Date.parse("2026-11-05T09:00:00Z"));
    write(path, JSON.stringify({ a: { key: "secret" } }));
    expect(() => grokTokenExpiresAt(path)).toThrow("no readable expires_at");
  });

  test("ensureGrokToken refreshes on the host only when the token wouldn't last", () => {
    let expires = 10_000;
    const refreshed: number[] = [];
    const token = {
      expiresAt: () => expires,
      now: () => 0,
      refresh: (within: number) => {
        refreshed.push(within);
        expires = 10_000_000;
      },
      log: () => {},
    };
    ensureGrokToken(5_000, token);
    expect(refreshed).toEqual([]);
    ensureGrokToken(60_000, token);
    expect(refreshed).toEqual([660]);
    const stale = { ...token, expiresAt: () => 1, refresh: () => {} };
    expect(() => ensureGrokToken(60_000, stale)).toThrow("didn't refresh");
  });
});

// ---------------------------------------------------------------------------
// A finished session and the tables.

describe("sessionProblems", () => {
  const setup = (extra?: string) => {
    const dir = temp();
    write(join(dir, "scene.md"), SCENE);
    const inputs = { "scene.md": sha256(join(dir, "scene.md")) };
    if (extra !== undefined) write(join(dir, extra), "x");
    return { dir, inputs };
  };
  const text = (data: string) => JSON.stringify({ type: "text", data });
  /** Grok streams its reply in pieces; text before a tool call isn't the reply. */
  const grokRun = (reply: string | undefined) =>
    [
      text("I'll read the files. ```json\n{}\n```"),
      call("a", "read_file", { target_file: "scene.md" }),
      ...(reply === undefined
        ? []
        : [text(reply.slice(0, 20)), text(reply.slice(20))]),
      end(["grok-4.7-build"]),
    ].join("\n");

  test("a good Grok run has no problems and returns the reply's report", () => {
    const { dir, inputs } = setup();
    const result = sessionProblems({
      judge: "grok",
      exitCode: 0,
      jsonl: grokRun(fenced(goodReport())),
      runDir: dir,
      filesDir: dir,
      inputs,
    });
    expect(result.problems).toEqual([]);
    expect(result.reply).toBe(fenced(goodReport()));
    expect(result.report?.overall.score).toBe(7);
  });

  test("a Claude run's report is its result text", () => {
    const { dir, inputs } = setup();
    const reply = fenced(goodReport());
    expect(
      finalReply(
        "claude",
        [
          JSON.stringify({ type: "assistant", message: { content: [] } }),
          JSON.stringify({ type: "result", result: reply }),
        ].join("\n"),
      ),
    ).toBe(reply);
    const result = sessionProblems({
      judge: "opus",
      exitCode: 0,
      jsonl: JSON.stringify({ type: "result", result: reply }),
      runDir: dir,
      filesDir: dir,
      inputs,
    });
    expect(result.report?.overall.score).toBe(7);
    // No init event and no assistant message: the model check fails it.
    expect(result.problems).toContain("no assistant message");
  });

  test("a malformed report, a new file and a changed input fail the run", () => {
    const { dir, inputs } = setup(".grok/x");
    writeFileSync(join(dir, "scene.md"), "changed");
    const result = sessionProblems({
      judge: "grok",
      exitCode: 124,
      jsonl: grokRun("no block"),
      runDir: dir,
      filesDir: dir,
      inputs,
    });
    expect(result.problems).toEqual([
      "timed out after 1800s",
      "scene.md changed during the session",
      "the run dir gained .grok/x",
      "malformed report: the report has 0 ```json blocks, not one",
    ]);
    expect(result.report).toBeUndefined();
  });

  test("a missing report fails the run", () => {
    const { dir, inputs } = setup("report.md");
    const result = sessionProblems({
      judge: "grok",
      exitCode: 0,
      jsonl: grokRun(undefined),
      runDir: dir,
      filesDir: dir,
      inputs,
    });
    expect(result.problems).toEqual([
      "the run dir gained report.md",
      "no final reply",
    ]);
  });
});

describe("tabulate", () => {
  test("tables each judge's scores, evidence checks and replaced runs", () => {
    const round = temp();
    write(join(round, "scenes", "1.md"), SCENE);
    write(join(round, "so-far", "1.md"), "Before.");
    const report = goodReport();
    report.pacing.evidence = "Not in it.";
    for (const judge of ["opus", "grok"] as const) {
      const dir = slotDir(round, "1", judge);
      write(join(dir, "STATUS"), "ok\n");
      write(
        join(dir, "run.json"),
        JSON.stringify({
          run: judge === "grok" ? 2 : 1,
          rubricPath: DEFAULT_RUBRIC,
          rubricCommit: "abc",
          rubric: { sha256: "123", cut: "" },
          durationSeconds: 60,
        }),
      );
      write(
        join(dir, "scores.json"),
        JSON.stringify({ report, quotes: checkQuotes(report, SCENE) }),
      );
    }
    write(
      join(round, "judging", "1", "grok-failed-1", "STATUS"),
      "failed\n- outside its inputs: read_file: /etc/hostname\n",
    );
    const text = tabulate(round);
    expect(text).toContain(
      "| Criterion | opus (claude-opus-5-5) | grok (grok-4.7) |",
    );
    expect(text).toContain("| pacing | 1 | 1 |");
    expect(text).toContain("| overall | 7 | 7 |");
    expect(text).toContain('- opus (1): "Not in it." (**NOT IN SCENE**)');
    expect(text).toContain(
      "Quote verification: not in the scene: opus pacing.evidence, grok pacing.evidence.",
    );
    expect(text).toContain(
      "- grok: `judging/1/grok-failed-1` failed and was replaced: outside its inputs: read_file: /etc/hostname",
    );
    expect(text).toContain("- sonnet: not run.");
    expect(text).toContain(
      `Rubric: ${DEFAULT_RUBRIC} at abc (text sha256 123).`,
    );
    const json = JSON.parse(
      readFileSync(join(round, "judging", "scores.json"), "utf8"),
    ) as Record<string, Record<string, { run: number }>>;
    expect(json["1"]?.grok?.run).toBe(2);
  });

  test("refuses runs under different rubric texts", () => {
    const round = temp();
    write(join(round, "scenes", "1.md"), SCENE);
    write(join(round, "so-far", "1.md"), "Before.");
    const report = goodReport();
    for (const [judge, hash] of [
      ["opus", "1"],
      ["sonnet", "2"],
    ] as const) {
      const dir = slotDir(round, "1", judge);
      write(join(dir, "STATUS"), "ok\n");
      write(
        join(dir, "run.json"),
        JSON.stringify({
          rubricPath: "r",
          rubricCommit: "c",
          rubric: { sha256: hash },
        }),
      );
      write(
        join(dir, "scores.json"),
        JSON.stringify({ report, quotes: checkQuotes(report, SCENE) }),
      );
    }
    expect(() => tabulate(round)).toThrow("different rubrics");
  });
});

describe("credentialsNote", () => {
  test("notes a changed credentials hash, and nothing otherwise", () => {
    const path = "/home/u/.grok/auth.json";
    expect(credentialsNote({ path, before: "a".repeat(64) })).toBeUndefined();
    expect(
      credentialsNote({ path, before: "a".repeat(64), after: "a".repeat(64) }),
    ).toBeUndefined();
    expect(
      credentialsNote({ path, before: "a".repeat(64), after: "b".repeat(64) }),
    ).toBe(
      `note: credentials changed during the session: ${path} sha256 ${"a".repeat(16)}... before, ${"b".repeat(16)}... after (mounted read-only, so changed on the host)`,
    );
  });

  test("the tables show the note under an ok run", () => {
    const round = temp();
    write(join(round, "scenes", "1.md"), SCENE);
    write(join(round, "so-far", "1.md"), "Before.");
    const report = goodReport();
    const dir = slotDir(round, "1", "grok");
    write(join(dir, "STATUS"), "ok\n");
    write(
      join(dir, "run.json"),
      JSON.stringify({
        run: 1,
        rubricPath: "r",
        rubricCommit: "c",
        rubric: { sha256: "1" },
        credentials: {
          path: "/a",
          before: "x".repeat(64),
          after: "y".repeat(64),
        },
      }),
    );
    write(
      join(dir, "scores.json"),
      JSON.stringify({ report, quotes: checkQuotes(report, SCENE) }),
    );
    expect(tabulate(round)).toContain(
      "  - grok: note: credentials changed during the session: /a",
    );
  });
});
